/**
 * Module Activation Endpoint
 * POST /api/v1/modules/{moduleId}/activate - Activate module for company
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest, props: { params: Promise<{ moduleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { moduleId } = params;

    // Parse request body (optional)
    let siteIds: string[] | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      siteIds = body.site_ids;
    } catch {
      // Body is optional
    }

    // Get module details
  const { data: module, error: moduleError } = await supabaseAdmin
      .from('modules')
      .select('id, module_code, module_name, requires_module_id, is_active')
      .eq('id', moduleId)
      .single();

    if (moduleError || !module) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Module not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    if (!module.is_active) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Module is not available for activation',
        422,
        { module_id: moduleId },
        { request_id: requestId }
      );
    }

    // Check prerequisites (requires_module_id)
    if (module.requires_module_id) {
      const { data: prerequisiteActivation } = await supabaseAdmin
        .from('module_activations')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('module_id', module.requires_module_id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!prerequisiteActivation) {
        const { data: prerequisiteModule } = await supabaseAdmin
          .from('modules')
          .select('module_name')
          .eq('id', module.requires_module_id)
          .single();

        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          `Prerequisite module not activated. ${prerequisiteModule?.module_name || 'Required module'} must be activated first.`,
          422,
          { requires_module_id: module.requires_module_id },
          { request_id: requestId }
        );
      }
    }

    // Check if module is already active for this company
    const existingActivationQuery = supabaseAdmin
      .from('module_activations')
      .select('id, site_id')
      .eq('company_id', user.company_id)
      .eq('module_id', moduleId)
      .eq('status', 'ACTIVE');

  const { data: existingActivations } = await existingActivationQuery;

    // Handle Module 3 (company-level activation, site_id must be null)
    if (module.module_code === 'MODULE_3') {
      const companyLevelActivation = existingActivations?.find((a: any) => a.site_id === null);
      if (companyLevelActivation) {
        return errorResponse(
          ErrorCodes.CONFLICT,
          'Module 3 is already activated for this company',
          409,
          { activation_id: companyLevelActivation.id },
          { request_id: requestId }
        );
      }

      // Create company-level activation (site_id = null)
      const { data: activation, error: activationError } = await supabaseAdmin
        .from('module_activations')
        .insert({
          company_id: user.company_id,
          site_id: null,
          module_id: moduleId,
          status: 'ACTIVE',
          activated_by: user.id,
          billing_start_date: new Date().toISOString().split('T')[0],
        })
        .select('id, company_id, site_id, module_id, activated_at')
        .single();

      if (activationError || !activation) {
        return errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to activate module',
          500,
          { error: activationError?.message || 'Unknown error' },
          { request_id: requestId }
        );
      }

      const module3Response = successResponse(
        {
          module_id: moduleId,
          company_id: user.company_id,
          activated_at: activation.activated_at,
          site_ids: null, // Module 3 is company-level
        },
        200,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, module3Response);
    }

    // For Module 2 and other site-level modules
    if (siteIds && siteIds.length > 0) {
      // Activate for specific sites
      const activatedSiteIds: string[] = [];
      const errors: any[] = [];

      for (const siteId of siteIds) {
        // Verify site belongs to company
        const { data: site } = await supabaseAdmin
          .from('sites')
          .select('id, company_id')
          .eq('id', siteId)
          .eq('company_id', user.company_id)
          .single();

        if (!site) {
          errors.push({ site_id: siteId, error: 'Site not found or does not belong to company' });
          continue;
        }

        // Check if already activated for this site
        const existingSiteActivation = existingActivations?.find((a: any) => a.site_id === siteId);
        if (existingSiteActivation) {
          errors.push({ site_id: siteId, error: 'Module already activated for this site' });
          continue;
        }

        // Create activation
        const { data: activation, error: activationError } = await supabaseAdmin
          .from('module_activations')
          .insert({
            company_id: user.company_id,
            site_id: siteId,
            module_id: moduleId,
            status: 'ACTIVE',
            activated_by: user.id,
            billing_start_date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single();

        if (activationError || !activation) {
          errors.push({ site_id: siteId, error: activationError?.message || 'Failed to activate' });
          continue;
        }

        activatedSiteIds.push(siteId);
      }

      if (activatedSiteIds.length === 0) {
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          'Failed to activate module for any sites',
          422,
          { errors },
          { request_id: requestId }
        );
      }

      const siteActivationResponse = successResponse(
        {
          module_id: moduleId,
          company_id: user.company_id,
          activated_at: new Date().toISOString(),
          site_ids: activatedSiteIds,
          ...(errors.length > 0 && { errors }),
        },
        200,
        { request_id: requestId }
      );
      return await addRateLimitHeaders(request, user.id, siteActivationResponse);
    } else {
      // No site_ids provided - check if already activated
      if (existingActivations && existingActivations.length > 0) {
        return errorResponse(
          ErrorCodes.CONFLICT,
          'Module is already activated for one or more sites',
          409,
          { existing_activations: existingActivations.map((a: any) => a.id) },
          { request_id: requestId }
        );
      }

      // For Module 2, activation requires at least one site
      if (module.module_code === 'MODULE_2') {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Module 2 requires at least one site_id',
          422,
          { site_ids: 'At least one site_id is required' },
          { request_id: requestId }
        );
      }
    }

    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid activation request',
      422,
      null,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Activate module error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

