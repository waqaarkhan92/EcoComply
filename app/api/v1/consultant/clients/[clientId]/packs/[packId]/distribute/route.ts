/**
 * Consultant Pack Distribution Endpoint
 * POST /api/v1/consultant/clients/{clientId}/packs/{packId}/distribute
 * 
 * Distribute client pack to client contacts (consultant only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest, props: { params: Promise<{ clientId: string; packId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Consultant role
    const authResult = await requireRole(request, ['CONSULTANT']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { clientId, packId } = params;

    // Verify consultant has ACTIVE assignment to this client
  const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('consultant_client_assignments')
      .select('client_company_id, status')
      .eq('consultant_id', user.id)
      .eq('client_company_id', clientId)
      .eq('status', 'ACTIVE')
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Consultant not assigned to this client or assignment is inactive',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Verify pack exists and belongs to client company
  const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select('id, company_id, site_id, status, document_path')
      .eq('id', packId)
      .eq('company_id', clientId)
      .single();

    if (packError || !pack) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Pack not found or does not belong to client company',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify pack is ready for distribution
    if (pack.status !== 'COMPLETED') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Pack is not ready for distribution',
        422,
        { status: `Pack status is ${pack.status}, must be COMPLETED` },
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.distribution_method || !['EMAIL', 'SHARED_LINK'].includes(body.distribution_method)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'distribution_method is required and must be EMAIL or SHARED_LINK',
        422,
        { distribution_method: 'Must be EMAIL or SHARED_LINK' },
        { request_id: requestId }
      );
    }

    if (body.distribution_method === 'EMAIL' && (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'recipients array is required for EMAIL distribution',
        422,
        { recipients: 'Recipients array is required' },
        { request_id: requestId }
      );
    }

    // Enqueue pack distribution job
    try {
      const distributionQueue = getQueue(QUEUE_NAMES.PACK_DISTRIBUTION);

      // Create background_jobs record
      const { data: jobRecord, error: jobError } = await supabaseAdmin
        .from('background_jobs')
        .insert({
          job_type: 'PACK_DISTRIBUTION',
          status: 'PENDING',
          priority: 'NORMAL',
          entity_type: 'audit_packs',
          entity_id: packId,
          company_id: clientId,
          payload: JSON.stringify({
            pack_id: packId,
            company_id: clientId,
            site_id: pack.site_id || null,
            distribution_method: body.distribution_method,
            recipients: body.recipients || [],
            message: body.message || null,
          }),
        })
        .select('id')
        .single();

      if (!jobError && jobRecord) {
        // Enqueue job in BullMQ
        await distributionQueue.add(
          'PACK_DISTRIBUTION',
          {
            pack_id: packId,
            company_id: clientId,
            site_id: pack.site_id || null,
            distribution_method: body.distribution_method,
            recipients: body.recipients || [],
            message: body.message || null,
          },
          {
            jobId: jobRecord.id,
            priority: 5,
          }
        );
      } else {
        console.error('Failed to create background job record:', jobError);
      }
    } catch (error: any) {
      console.error('Failed to enqueue pack distribution job:', error);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to enqueue distribution job',
        500,
        { error: error.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        pack_id: packId,
        distribution_method: body.distribution_method,
        status: 'QUEUED',
        message: 'Pack distribution started. Recipients will be notified when complete.',
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Consultant pack distribution error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
