/**
 * Pack Generation Endpoint
 * POST /api/v1/packs/generate - Generate a pack (Audit, Regulator, Tender, Board, Insurer)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const {
      pack_type,
      company_id,
      site_id,
      document_id,
      date_range_start,
      date_range_end,
      filters,
      recipient_type,
      recipient_name,
      purpose,
    } = body;

    // Validate required fields
    if (!pack_type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'pack_type is required',
        422,
        { pack_type: 'pack_type is required' },
        { request_id: requestId }
      );
    }

    const validPackTypes = ['AUDIT_PACK', 'REGULATOR_INSPECTION', 'TENDER_CLIENT_ASSURANCE', 'BOARD_MULTI_SITE_RISK', 'INSURER_BROKER'];
    if (!validPackTypes.includes(pack_type)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid pack_type',
        422,
        { pack_type: `Must be one of: ${validPackTypes.join(', ')}` },
        { request_id: requestId }
      );
    }

    if (!company_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'company_id is required',
        422,
        { company_id: 'company_id is required' },
        { request_id: requestId }
      );
    }

    // Validate site_id (required for all pack types except BOARD_MULTI_SITE_RISK)
    if (pack_type !== 'BOARD_MULTI_SITE_RISK' && !site_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id is required for this pack type',
        422,
        { site_id: 'site_id is required' },
        { request_id: requestId }
      );
    }

    // Verify user has access to company (RLS will enforce)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Company not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify site access if site_id provided
    if (site_id) {
      const { data: site, error: siteError } = await supabaseAdmin
        .from('sites')
        .select('id, company_id')
        .eq('id', site_id)
        .eq('company_id', company_id)
        .single();

      if (siteError || !site) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Site not found or access denied',
          404,
          null,
          { request_id: requestId }
        );
      }
    }

    // Create audit_packs record
    const packData = {
      company_id: company_id,
      site_id: site_id || null,
      document_id: document_id || null,
      pack_type: pack_type,
      recipient_type: recipient_type || 'INTERNAL',
      recipient_name: recipient_name || null,
      purpose: purpose || null,
      date_range_start: date_range_start || null,
      date_range_end: date_range_end || null,
      filters: filters || {},
      status: 'PENDING',
      generated_by: user.id,
    };

    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .insert(packData)
      .select('id, pack_type, status, created_at')
      .single();

    if (packError || !pack) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create pack record',
        500,
        { error: packError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Enqueue background job
    try {
      const packQueue = getQueue(QUEUE_NAMES.AUDIT_PACK_GENERATION);

      // Create background_jobs record
      const { data: jobRecord, error: jobError } = await supabaseAdmin
        .from('background_jobs')
        .insert({
          job_type: 'AUDIT_PACK_GENERATION',
          status: 'PENDING',
          priority: 'NORMAL',
          entity_type: 'audit_packs',
          entity_id: pack.id,
          company_id: company_id,
          payload: JSON.stringify({
            pack_id: pack.id,
            pack_type: pack_type,
            company_id: company_id,
            site_id: site_id || null,
            document_id: document_id || null,
            date_range_start: date_range_start || null,
            date_range_end: date_range_end || null,
            filters: filters || {},
          }),
        })
        .select('id')
        .single();

      if (!jobError && jobRecord) {
        // Enqueue job in BullMQ
        await packQueue.add(
          'AUDIT_PACK_GENERATION',
          {
            pack_id: pack.id,
            pack_type: pack_type,
            company_id: company_id,
            site_id: site_id || null,
            document_id: document_id || null,
            date_range_start: date_range_start || null,
            date_range_end: date_range_end || null,
            filters: filters || {},
          },
          {
            jobId: jobRecord.id,
            priority: 5, // Normal priority
          }
        );
      } else {
        console.error('Failed to create background job record:', jobError);
      }
    } catch (error: any) {
      console.error('Failed to enqueue pack generation job:', error);
      // Continue anyway - job can be retried manually
    }

    return successResponse(
      {
        pack_id: pack.id,
        pack_type: pack.pack_type,
        status: pack.status,
        message: 'Pack generation started. You will be notified when ready.',
      },
      202,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Pack generation error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

