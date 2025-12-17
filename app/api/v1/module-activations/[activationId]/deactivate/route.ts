/**
 * Module Deactivation Endpoint
 * PUT /api/v1/module-activations/{activationId}/deactivate - Deactivate module
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function PUT(
  request: NextRequest, props: { params: Promise<{ activationId: string }> }
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
  const { activationId } = params;

    // Parse request body (optional)
    let deactivationReason: string | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      deactivationReason = body.deactivation_reason;
    } catch {
      // Body is optional
    }

    // Get activation with module info - RLS will enforce access control
  const { data: activation, error: getError } = await supabaseAdmin
      .from('module_activations')
      .select('id, company_id, site_id, status, module_id, modules!inner(id, module_code, module_name)')
      .eq('id', activationId)
      .single();

    if (getError || !activation) {
      if (getError?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Module activation not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch module activation',
        500,
        { error: getError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Verify user has access to this company
    if (user.company_id !== activation.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Check if already deactivated
    if (activation.status !== 'ACTIVE') {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        `Module activation is already ${activation.status}`,
        422,
        { status: activation.status },
        { request_id: requestId }
      );
    }

    const moduleId = activation.module_id;
    const module = activation.modules as any;

    // Check if this module has dependent modules (cascading deactivation)
  const { data: dependentModules, error: dependentError } = await supabaseAdmin
      .from('modules')
      .select('id, module_code, module_name')
      .eq('requires_module_id', moduleId)
      .eq('is_active', true);

    if (dependentError) {
      console.error('Error checking dependent modules:', dependentError);
    }

    const dependentModuleIds = (dependentModules || []).map((m) => m.id);
    const dependentModuleNames = (dependentModules || []).map((m) => m.module_name).join(', ');

    // Update activation status
  const { data: updatedActivation, error: updateError } = await supabaseAdmin
      .from('module_activations')
      .update({
        status: 'INACTIVE',
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        deactivation_reason: deactivationReason || null,
        billing_end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', activationId)
      .select('id, status, deactivated_at, deactivated_by, deactivation_reason')
      .single();

    if (updateError || !updatedActivation) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to deactivate module',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Cascading deactivation: If this module has dependents, deactivate them too
    const cascadedActivations: any[] = [];
    if (dependentModuleIds.length > 0) {
      // Find all active activations of dependent modules for this company
      const { data: dependentActivations, error: depActError } = await supabaseAdmin
        .from('module_activations')
        .select('id, module_id, site_id, modules!inner(module_name)')
        .eq('company_id', activation.company_id)
        .in('module_id', dependentModuleIds)
        .eq('status', 'ACTIVE');

      if (depActError) {
        console.error('Error fetching dependent activations:', depActError);
      } else if (dependentActivations && dependentActivations.length > 0) {
        // Deactivate all dependent module activations
        const depActivationIds = dependentActivations.map((da) => da.id);
        const { error: cascadeError } = await supabaseAdmin
          .from('module_activations')
          .update({
            status: 'INACTIVE',
            deactivated_at: new Date().toISOString(),
            deactivated_by: user.id,
            deactivation_reason: `Cascading deactivation: ${module.module_name} is required for this module. Reactivating ${module.module_name} will restore access.`,
            billing_end_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .in('id', depActivationIds);

        if (cascadeError) {
          console.error('Error cascading deactivation:', cascadeError);
        } else {
          cascadedActivations.push(...dependentActivations);

          // Create notification for user about cascading deactivation
          const notificationMessage = `${module.module_name} is required for ${dependentModuleNames}. Reactivating ${module.module_name} will restore ${dependentModuleNames} access.`;
          
          // Get user IDs with OWNER or ADMIN roles
          const { data: adminRoles } = await supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .in('role', ['OWNER', 'ADMIN']);

          const adminUserIds = adminRoles?.map(r => r.user_id) || [];

          // Get all company users (OWNER, ADMIN) to notify
          const { data: companyUsers } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('company_id', activation.company_id)
            .eq('is_active', true)
            .is('deleted_at', null)
            .in('id', adminUserIds);

          if (companyUsers && companyUsers.length > 0) {
            const notifications = companyUsers.map((u: any) => ({
              user_id: u.id,
              company_id: activation.company_id,
              recipient_email: u.email,
              notification_type: 'MODULE_DEACTIVATION',
              channel: 'EMAIL',
              priority: 'HIGH',
              subject: `Module Deactivation: ${dependentModuleNames} Deactivated`,
              body_text: notificationMessage,
              entity_type: 'module_activation',
              entity_id: activationId,
              status: 'PENDING',
              scheduled_for: new Date().toISOString(),
              metadata: {
                cascaded_modules: dependentModuleNames,
                parent_module: module.module_name,
                cascaded_activation_ids: depActivationIds,
              },
            }));

            await supabaseAdmin.from('notifications').insert(notifications);
          }
        }
      }
    }

    const responseData = {
      ...updatedActivation,
      cascaded_deactivations: cascadedActivations.length > 0 ? {
        count: cascadedActivations.length,
        modules: dependentModuleNames,
        message: cascadedActivations.length > 0 
          ? `${module.module_name} is required for ${dependentModuleNames}. Reactivating ${module.module_name} will restore ${dependentModuleNames} access.`
          : null,
      } : null,
    };

    const response = successResponse(responseData, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Deactivate module error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

