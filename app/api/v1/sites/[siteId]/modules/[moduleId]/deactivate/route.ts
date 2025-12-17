/**
 * Module Deactivation Endpoint
 * POST /api/v1/sites/{siteId}/modules/{moduleId}/deactivate
 * 
 * Deactivates a module with cascade handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest, props: { params: Promise<{ siteId: string; moduleId: string }> }
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
  const { siteId, moduleId } = params;
    const body = await request.json();
  const { cascade, acknowledge_dependencies } = body;

    // Get module
  const { data: module, error: moduleError } = await supabaseAdmin
      .from('site_modules')
      .select('id, site_id, module_type, is_active, dependencies')
      .eq('id', moduleId)
      .eq('site_id', siteId)
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

    // Check for dependent modules
  const { data: dependentModules } = await supabaseAdmin
      .from('site_modules')
      .select('id, module_type, module_name')
      .eq('site_id', siteId)
      .contains('dependencies', [moduleId])
      .eq('is_active', true);

    if (dependentModules && dependentModules.length > 0 && !acknowledge_dependencies) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Dependent modules must be acknowledged',
        422,
        {
          dependent_modules: dependentModules.map(m => ({
            id: m.id,
            module_type: m.module_type,
          })),
        },
        { request_id: requestId }
      );
    }

    // Deactivate module
  const { error: updateError } = await supabaseAdmin
      .from('site_modules')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moduleId);

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to deactivate module',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    // Cascade deactivation if requested
    if (cascade && dependentModules && dependentModules.length > 0) {
      const dependentIds = dependentModules.map(m => m.id);
      const { error: cascadeError } = await supabaseAdmin
        .from('site_modules')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user.id,
          cascade_deactivated_from: moduleId,
          updated_at: new Date().toISOString(),
        })
        .in('id', dependentIds);

      if (cascadeError) {
        console.error('Cascade deactivation error:', cascadeError);
        // Don't fail the request, main module was deactivated
      }
    }

    // Create audit log
    await supabaseAdmin.from('audit_logs').insert({
      action_type: 'MODULE_DEACTIVATED',
      entity_type: 'SITE_MODULE',
      entity_id: moduleId,
      user_id: user.id,
      changes: {
        cascade: cascade || false,
        dependent_modules_count: dependentModules?.length || 0,
      },
    });

    const response = successResponse(
      {
        message: 'Module deactivated successfully',
        cascade_deactivated: cascade && (dependentModules?.length || 0) > 0,
        dependent_modules_affected: dependentModules?.length || 0,
      },
      200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error deactivating module:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to deactivate module',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

