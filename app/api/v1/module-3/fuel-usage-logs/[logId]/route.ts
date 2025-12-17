import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/module-3/fuel-usage-logs/[logId]
 * Get a single fuel usage log entry
 */
export async function GET(
  request: NextRequest, props: { params: Promise<{ logId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    const { data, error } = await supabaseAdmin
      .from('fuel_usage_logs')
      .select('*, generator:generators(generator_identifier, generator_type), evidence:evidence_items(id, file_name)')
      .eq('id', params.logId)
      .single();

    if (error || !data) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Fuel usage log not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    return successResponse(data);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-3/fuel-usage-logs/[logId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Internal server error',
      error.status || 500,
      {},
      { request_id: requestId }
    );
  }
}

/**
 * PUT /api/v1/module-3/fuel-usage-logs/[logId]
 * Update a fuel usage log entry
 */
export async function PUT(
  request: NextRequest, props: { params: Promise<{ logId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    const body = await request.json();
    const {
      log_date,
      fuel_type,
      quantity,
      unit,
      sulphur_content_percentage,
      sulphur_content_mg_per_kg,
      evidence_id,
      notes,
    } = body;

    // Validation
    if (quantity !== undefined && quantity < 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Quantity must be >= 0',
        422,
        {},
        { request_id: requestId }
      );
    }

    const updateData: any = {};
    if (log_date !== undefined) updateData.log_date = log_date;
    if (fuel_type !== undefined) updateData.fuel_type = fuel_type;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (sulphur_content_percentage !== undefined) updateData.sulphur_content_percentage = sulphur_content_percentage;
    if (sulphur_content_mg_per_kg !== undefined) updateData.sulphur_content_mg_per_kg = sulphur_content_mg_per_kg;
    if (evidence_id !== undefined) updateData.evidence_id = evidence_id;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('fuel_usage_logs')
      .update(updateData)
      .eq('id', params.logId)
      .select()
      .single();

    if (error || !data) {
      return errorResponse(
        error ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.NOT_FOUND,
        'Failed to update fuel usage log',
        error ? 500 : 404,
        {},
        { request_id: requestId }
      );
    }

    return successResponse(data);
  } catch (error: any) {
    console.error('Error in PUT /api/v1/module-3/fuel-usage-logs/[logId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Internal server error',
      error.status || 500,
      {},
      { request_id: requestId }
    );
  }
}

/**
 * DELETE /api/v1/module-3/fuel-usage-logs/[logId]
 * Delete a fuel usage log entry
 */
export async function DELETE(
  request: NextRequest, props: { params: Promise<{ logId: string }> }
) {
  const requestId = getRequestId(request);
  const params = await props.params;

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 3 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_3');
    if (moduleCheck) {
      return moduleCheck;
    }

    const { error } = await supabaseAdmin
      .from('fuel_usage_logs')
      .delete()
      .eq('id', params.logId);

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete fuel usage log',
        500,
        {},
        { request_id: requestId }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/module-3/fuel-usage-logs/[logId]:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Internal server error',
      error.status || 500,
      {},
      { request_id: requestId }
    );
  }
}

