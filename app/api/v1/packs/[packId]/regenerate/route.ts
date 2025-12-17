/**
 * Pack Regeneration Endpoint
 * POST /api/v1/packs/{packId}/regenerate - Regenerate an existing pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

export async function POST(
  request: NextRequest, props: { params: Promise<{ packId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
  const { user } = authResult;

    const params = await props.params;
  const { packId } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid pack ID format',
        400,
        { pack_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Get existing pack - RLS will enforce access control
  const { data: existingPack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select(`
        id,
        company_id,
        site_id,
        pack_type,
        date_range_start,
        date_range_end,
        filters,
        status,
        storage_path
      `)
      .eq('id', packId)
      .maybeSingle();

    if (packError || !existingPack) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Pack not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Parse optional request body for updated parameters
    const body = await request.json().catch(() => ({}));
    const {
      date_range_start,
      date_range_end,
      filters,
      recipient_type,
      recipient_name,
      purpose,
    } = body;

    // Use existing pack parameters or override with new ones
    const packParams = {
      pack_type: existingPack.pack_type,
      company_id: existingPack.company_id,
      site_id: existingPack.site_id,
      date_range_start: date_range_start || existingPack.date_range_start,
      date_range_end: date_range_end || existingPack.date_range_end,
      filters: filters || existingPack.filters || {},
      recipient_type: recipient_type,
      recipient_name: recipient_name,
      purpose: purpose,
    };

    // Create a new pack record (regeneration creates new pack, doesn't update existing)
  const { data: newPack, error: createError } = await supabaseAdmin
      .from('audit_packs')
      .insert({
        company_id: packParams.company_id,
        site_id: packParams.site_id,
        pack_type: packParams.pack_type,
        date_range_start: packParams.date_range_start,
        date_range_end: packParams.date_range_end,
        filters: packParams.filters,
        status: 'QUEUED',
        generated_by: user.id,
        recipient_type: packParams.recipient_type,
        recipient_name: packParams.recipient_name,
        purpose: packParams.purpose,
      })
      .select('id, pack_type, status, created_at')
      .single();

    if (createError || !newPack) {
      console.error('Error creating regenerated pack:', createError);
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create regenerated pack',
        500,
        { error: createError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Enqueue pack generation job
    const queue = getQueue(QUEUE_NAMES.AUDIT_PACK_GENERATION);
    const job = await queue.add(
      'AUDIT_PACK_GENERATION',
      {
        pack_id: newPack.id,
        pack_type: packParams.pack_type,
        company_id: packParams.company_id,
        site_id: packParams.site_id,
        date_range_start: packParams.date_range_start,
        date_range_end: packParams.date_range_end,
        filters: packParams.filters,
        recipient_type: packParams.recipient_type,
        recipient_name: packParams.recipient_name,
        purpose: packParams.purpose,
        regenerated_from_pack_id: packId, // Track original pack
      },
      {
        jobId: newPack.id,
        priority: 1, // Normal priority
        attempts: 2,
      }
    );

    // Update pack with job ID
    await supabaseAdmin
      .from('audit_packs')
      .update({ background_job_id: job.id })
      .eq('id', newPack.id);

    const response = successResponse(
      {
        pack_id: newPack.id,
        status: 'QUEUED',
        job_id: job.id,
        regenerated_from_pack_id: packId,
        message: 'Pack regeneration queued',
      },
      202, // Accepted
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Regenerate pack error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

