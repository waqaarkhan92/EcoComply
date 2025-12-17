/**
 * Module 4: Chain of Custody Endpoints
 * GET /api/v1/module-4/consignment-notes/{id}/chain-of-custody - Get chain of custody for consignment note
 * POST /api/v1/module-4/consignment-notes/{id}/chain-of-custody - Add chain of custody step
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest, props: { params: Promise<{ noteId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { noteId } = params;

    // Verify consignment note exists and user has access
  const { data: consignmentNote, error: noteError } = await supabaseAdmin
      .from('consignment_notes')
      .select('id, company_id')
      .eq('id', noteId)
      .single();

    if (noteError || !consignmentNote) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consignment note not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (consignmentNote.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consignment note',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get chain of custody steps
  const { data: chainSteps, error } = await supabaseAdmin
      .from('chain_of_custody')
      .select('*')
      .eq('consignment_note_id', noteId)
      .order('chain_position', { ascending: true });

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch chain of custody',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        consignment_note_id: noteId,
        chain_steps: chainSteps || [],
        total_steps: chainSteps?.length || 0,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-4/consignment-notes/[id]/chain-of-custody:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

export async function POST(
  request: NextRequest, props: { params: Promise<{ noteId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { noteId } = params;
    const body = await request.json();

    // Validate required fields
    if (!body.transfer_date) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'transfer_date is required',
        422,
        { transfer_date: 'transfer_date is required' },
        { request_id: requestId }
      );
    }
    if (!body.from_party) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'from_party is required',
        422,
        { from_party: 'from_party is required' },
        { request_id: requestId }
      );
    }
    if (!body.to_party) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'to_party is required',
        422,
        { to_party: 'to_party is required' },
        { request_id: requestId }
      );
    }

    // Verify consignment note exists and user has access
  const { data: consignmentNote, error: noteError } = await supabaseAdmin
      .from('consignment_notes')
      .select('id, company_id, site_id')
      .eq('id', noteId)
      .single();

    if (noteError || !consignmentNote) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consignment note not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    if (consignmentNote.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consignment note',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get current max chain position
  const { data: existingSteps } = await supabaseAdmin
      .from('chain_of_custody')
      .select('chain_position')
      .eq('consignment_note_id', noteId)
      .order('chain_position', { ascending: false })
      .limit(1);

    const nextPosition = existingSteps && existingSteps.length > 0 
      ? (existingSteps[0] as any).chain_position + 1 
      : 1;

    // Create chain of custody step
  const { data: chainStep, error: createError } = await supabaseAdmin
      .from('chain_of_custody')
      .insert({
        consignment_note_id: noteId,
        company_id: user.company_id,
        site_id: consignmentNote.site_id,
        chain_position: nextPosition,
        transfer_date: body.transfer_date,
        from_party: body.from_party,
        to_party: body.to_party,
        transfer_method: body.transfer_method || null,
        evidence_id: body.evidence_id || null,
        is_complete: body.is_complete !== undefined ? body.is_complete : false,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !chainStep) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create chain of custody step',
        500,
        { error: createError?.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(chainStep, 201, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/consignment-notes/[id]/chain-of-custody:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

