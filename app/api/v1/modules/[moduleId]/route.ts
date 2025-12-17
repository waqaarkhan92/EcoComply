/**
 * Module Detail Endpoint
 * GET /api/v1/modules/{moduleId} - Get module details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ moduleId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { moduleId } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(moduleId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid module ID format',
        400,
        { module_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Get module details
  const { data: module, error } = await supabaseAdmin
      .from('modules')
      .select(`
        id,
        module_code,
        module_name,
        module_description,
        requires_module_id,
        pricing_model,
        base_price,
        is_active,
        is_default,
        document_types,
        cross_sell_keywords,
        created_at,
        updated_at
      `)
      .eq('id', moduleId)
      .maybeSingle();

    if (error || !module) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Module not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get prerequisite module details if exists
    let prerequisite = null;
    if (module.requires_module_id) {
      const { data: prereqModule } = await supabaseAdmin
        .from('modules')
        .select('id, module_code, module_name')
        .eq('id', module.requires_module_id)
        .maybeSingle();
      
      prerequisite = prereqModule ? {
        id: prereqModule.id,
        module_code: prereqModule.module_code,
        module_name: prereqModule.module_name,
      } : undefined;
    }

    const response = successResponse(
      {
        ...module,
        prerequisite_module: prerequisite,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get module error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

