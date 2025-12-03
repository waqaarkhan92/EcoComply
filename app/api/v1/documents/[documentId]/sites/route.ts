/**
 * Document Site Assignment Endpoint
 * POST /api/v1/documents/{documentId}/sites - Assign document to additional site(s)
 * GET /api/v1/documents/{documentId}/sites - Get all site assignments for document
 * DELETE /api/v1/documents/{documentId}/sites/{siteId} - Remove site assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { z } from 'zod';

// Validation schema
const assignSiteSchema = z.object({
  site_id: z.string().uuid('Invalid site_id format'),
  is_primary: z.boolean().optional().default(false),
  obligations_shared: z.boolean().optional().default(false),
});

/**
 * GET /api/v1/documents/{documentId}/sites
 * Returns all site assignments for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Verify document exists and user has access
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, company_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Get all site assignments including the primary site
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('document_site_assignments')
      .select(`
        id,
        document_id,
        site_id,
        is_primary,
        obligations_shared,
        created_at,
        updated_at,
        sites (
          id,
          name,
          company_id
        )
      `)
      .eq('document_id', documentId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (assignmentError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch site assignments',
        500,
        { error: assignmentError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        document_id: documentId,
        primary_site_id: document.site_id,
        assignments: assignments || [],
        total: (assignments || []).length,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get document site assignments error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

/**
 * POST /api/v1/documents/{documentId}/sites
 * Assign document to additional site (creates multi-site permit)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Parse and validate request body
    let body;
    try {
      const rawBody = await request.json();
      body = assignSiteSchema.parse(rawBody);
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        422,
        { error: error.message || 'Invalid request body' },
        { request_id: requestId }
      );
    }

    // Verify document exists
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id, company_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify site exists and belongs to same company
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id, name')
      .eq('id', body.site_id)
      .is('deleted_at', null)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Site not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Verify site belongs to same company as document
    if (site.company_id !== document.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Site must belong to the same company as the document',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Check if this is the primary site (document.site_id)
    const isPrimarySite = document.site_id === body.site_id;

    // Start transaction: Handle is_primary logic
    if (body.is_primary && !isPrimarySite) {
      // User wants to make this the new primary site

      // 1. Unset is_primary for all existing assignments
      await supabaseAdmin
        .from('document_site_assignments')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('document_id', documentId);

      // 2. Update document.site_id to new primary
      const { error: docUpdateError } = await supabaseAdmin
        .from('documents')
        .update({
          site_id: body.site_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (docUpdateError) {
        return errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to update primary site',
          500,
          { error: docUpdateError.message },
          { request_id: requestId }
        );
      }
    } else if (!body.is_primary && isPrimarySite) {
      // Cannot unset primary site as non-primary
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot unset primary site. Set another site as primary first.',
        422,
        { is_primary: 'Primary site cannot be set to is_primary=false' },
        { request_id: requestId }
      );
    }

    // Upsert into document_site_assignments (INSERT or UPDATE if exists)
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('document_site_assignments')
      .upsert(
        {
          document_id: documentId,
          site_id: body.site_id,
          is_primary: body.is_primary || isPrimarySite,
          obligations_shared: body.obligations_shared,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'document_id,site_id',
          ignoreDuplicates: false,
        }
      )
      .select(`
        id,
        document_id,
        site_id,
        is_primary,
        obligations_shared,
        created_at,
        updated_at
      `)
      .single();

    if (assignmentError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create site assignment',
        500,
        { error: assignmentError.message },
        { request_id: requestId }
      );
    }

    // Fetch all current assignments to return complete state
    const { data: allAssignments } = await supabaseAdmin
      .from('document_site_assignments')
      .select(`
        id,
        site_id,
        is_primary,
        obligations_shared,
        sites (
          id,
          name
        )
      `)
      .eq('document_id', documentId)
      .order('is_primary', { ascending: false });

    const response = successResponse(
      {
        assignment: assignment,
        all_assignments: allAssignments || [],
        message: assignment ? 'Site assignment created successfully' : 'Site assignment updated successfully',
      },
      assignment ? 201 : 200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Assign document to site error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

/**
 * DELETE /api/v1/documents/{documentId}/sites/{siteId}
 * Remove a site assignment (cannot remove primary site)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { documentId } = await params;

    // Get siteId from query params
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');

    if (!siteId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'site_id query parameter is required',
        422,
        { site_id: 'site_id is required' },
        { request_id: requestId }
      );
    }

    // Verify document exists
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, site_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Cannot delete primary site assignment
    if (document.site_id === siteId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot remove primary site assignment. Set another site as primary first.',
        422,
        { site_id: 'Cannot remove primary site' },
        { request_id: requestId }
      );
    }

    // Delete the assignment
    const { error: deleteError } = await supabaseAdmin
      .from('document_site_assignments')
      .delete()
      .eq('document_id', documentId)
      .eq('site_id', siteId);

    if (deleteError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to remove site assignment',
        500,
        { error: deleteError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        document_id: documentId,
        site_id: siteId,
        message: 'Site assignment removed successfully',
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Remove document site assignment error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
