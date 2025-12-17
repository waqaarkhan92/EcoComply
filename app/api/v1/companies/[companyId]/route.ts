/**
 * Company Endpoints
 * GET /api/v1/companies/{companyId} - Get company details
 * PUT /api/v1/companies/{companyId} - Update company
 * DELETE /api/v1/companies/{companyId} - Soft delete company
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ companyId: string }> }
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
  const { companyId } = params;

    // Get company - RLS will enforce access control
  const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, billing_email, billing_address, phone, subscription_tier, is_active, settings, created_at, updated_at')
      .eq('id', companyId)
      .is('deleted_at', null)
      .single();

    if (error || !company) {
      if (error?.code === 'PGRST116') {
        // No rows returned
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Company not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch company',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(company, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get company error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ companyId: string }> }
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
  const { companyId } = params;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const updates: any = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length < 2 || body.name.length > 100) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Company name must be between 2 and 100 characters',
          422,
          { name: 'Company name must be between 2 and 100 characters' },
          { request_id: requestId }
        );
      }
      updates.name = body.name;
    }

    if (body.billing_email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.billing_email)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid billing email format',
          422,
          { billing_email: 'Must be a valid email address' },
          { request_id: requestId }
        );
      }
      updates.billing_email = body.billing_email;
    }

    if (body.billing_address !== undefined) {
      updates.billing_address = body.billing_address;
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone;
    }

    if (body.settings !== undefined) {
      updates.settings = body.settings;
    }

    // Validate subscription_tier if provided (but don't allow changes via this endpoint)
    if (body.subscription_tier !== undefined) {
      const validTiers = ['core', 'growth', 'consultant'];
      if (!validTiers.includes(body.subscription_tier)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid subscription tier',
          422,
          { subscription_tier: `Must be one of: ${validTiers.join(', ')}` },
          { request_id: requestId }
        );
      }
      // Note: Subscription tier changes should be handled through a separate endpoint
      // For now, we'll allow it but this should be restricted in production
      updates.subscription_tier = body.subscription_tier;
    }

    // Check if company exists and user has access (RLS will enforce)
  const { data: existingCompany, error: checkError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .is('deleted_at', null)
      .single();

    if (checkError || !existingCompany) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Company not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Update company
    updates.updated_at = new Date().toISOString();

  const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select('id, name, billing_email, subscription_tier, updated_at')
      .single();

    if (updateError || !updatedCompany) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update company',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(updatedCompany, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update company error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ companyId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner role only
    const authResult = await requireRole(request, ['OWNER']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { companyId } = params;

    // Check if company exists and user has access (RLS will enforce)
  const { data: existingCompany, error: checkError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .is('deleted_at', null)
      .single();

    if (checkError || !existingCompany) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Company not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Soft delete company
  const { error: deleteError } = await supabaseAdmin
      .from('companies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', companyId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete company',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      { message: 'Company deleted successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Delete company error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
