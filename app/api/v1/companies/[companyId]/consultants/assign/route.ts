/**
 * Assign Consultant to Company
 * POST /api/v1/companies/{companyId}/consultants/assign
 * 
 * Allows company Owner/Admin to assign a consultant to their company
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { sendEmail } from '@/lib/services/email-service';
import { consultantClientAssignedEmail } from '@/lib/templates/email-templates';
import { env } from '@/lib/env';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { companyId } = params;

    // Get company details for email
    const { data: clientCompany, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .eq('id', user.company_id) // User must belong to this company
      .single();

    if (companyError || !clientCompany) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'You do not have access to this company',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Helper function to send consultant assignment email
    async function sendConsultantAssignmentEmail(
      consultantId: string,
      clientCompanyId: string,
      assignedAt: string,
      isReactivation: boolean = false
    ) {
      try {
        // Get consultant details
        const { data: consultant } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name')
          .eq('id', consultantId)
          .single();

        if (!consultant || !consultant.email) return;

        // Get site count for client
        const { count: siteCount } = await supabaseAdmin
          .from('sites')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', clientCompanyId)
          .is('deleted_at', null);

        const baseUrl = env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.oblicore.com';
        const clientDashboardUrl = `${baseUrl}/consultant/clients/${clientCompanyId}`;

        const emailTemplate = consultantClientAssignedEmail({
          consultant_name: consultant.full_name || consultant.email,
          client_company_name: clientCompany.name,
          assigned_at: new Date(assignedAt).toLocaleDateString(),
          client_dashboard_url: clientDashboardUrl,
          site_count: siteCount || 0,
        });

        await sendEmail({
          to: consultant.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });
      } catch (error: any) {
        console.error('Error sending consultant assignment email:', error);
        // Don't fail the assignment, just log the error
      }
    }

    // Parse request body
    const body = await request.json();
    const { consultant_id, consultant_email } = body;

    if (!consultant_id && !consultant_email) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'consultant_id or consultant_email is required',
        422,
        { consultant_id: 'consultant_id or consultant_email is required' },
        { request_id: requestId }
      );
    }

    let consultantUserId: string | null = null;

    // If consultant_email provided, look up consultant
    if (consultant_email) {
      const { data: consultantUser, error: consultantError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', consultant_email)
        .single();

      if (consultantError || !consultantUser) {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Consultant not found with this email',
          404,
          null,
          { request_id: requestId }
        );
      }

      // Verify consultant has CONSULTANT role
      const { data: consultantRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', consultantUser.id)
        .eq('role', 'CONSULTANT')
        .single();

      if (roleError || !consultantRole) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'User is not a consultant',
          422,
          null,
          { request_id: requestId }
        );
      }

      consultantUserId = consultantUser.id;
    } else {
      consultantUserId = consultant_id;
    }

    // Verify consultant exists and has CONSULTANT role
    const { data: consultantRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', consultantUserId)
      .eq('role', 'CONSULTANT')
      .single();

    if (roleError || !consultantRole) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'User is not a consultant',
        422,
        null,
        { request_id: requestId }
      );
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: existingError } = await supabaseAdmin
      .from('consultant_client_assignments')
      .select('id, status')
      .eq('consultant_id', consultantUserId)
      .eq('client_company_id', companyId)
      .single();

    if (existingAssignment) {
      // If assignment exists but is INACTIVE, reactivate it
      if (existingAssignment.status === 'INACTIVE') {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('consultant_client_assignments')
          .update({
            status: 'ACTIVE',
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAssignment.id)
          .select('id, status, assigned_at')
          .single();

        if (updateError) {
          return errorResponse(
            ErrorCodes.INTERNAL_ERROR,
            'Failed to reactivate assignment',
            500,
            { error: updateError.message },
            { request_id: requestId }
          );
        }

        // Send notification email to consultant
        await sendConsultantAssignmentEmail(
          consultantUserId,
          companyId,
          updated.assigned_at,
          true
        );

        const reactivatedResponse = successResponse(
          {
            assignment_id: updated.id,
            status: updated.status,
            message: 'Consultant assignment reactivated',
          },
          200,
          { request_id: requestId }
        );
        return await addRateLimitHeaders(request, user.id, reactivatedResponse);
      } else {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Consultant is already assigned to this company',
          422,
          null,
          { request_id: requestId }
        );
      }
    }

    // Create new assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('consultant_client_assignments')
      .insert({
        consultant_id: consultantUserId,
        client_company_id: companyId,
        status: 'ACTIVE',
        assigned_at: new Date().toISOString(),
      })
      .select('id, status, assigned_at')
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create consultant assignment',
        500,
        { error: assignmentError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Send notification email to consultant
    await sendConsultantAssignmentEmail(
      consultantUserId,
      companyId,
      assignment.assigned_at,
      false
    );

    // TODO: Create notification record: CONSULTANT_CLIENT_ASSIGNED
    // This can be done later when notification system is fully integrated

    const response = successResponse(
      {
        assignment_id: assignment.id,
        status: assignment.status,
        message: 'Consultant assigned successfully',
      },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Assign consultant error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

