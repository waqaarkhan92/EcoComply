/**
 * Auto-Create Renewal Workflows Job
 * Auto-creates renewal workflows 90 days before permit expiry
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 9.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface AutoCreateRenewalWorkflowsJobInput {
  company_id?: string;
  advance_notice_days?: number;
}

const RENEWAL_TIMELINE = {
  advance_notice_days: 90,
  regulator_response_days: 60,
  submission_deadline_days: 30,
};

export async function processAutoCreateRenewalWorkflowsJob(
  job: Job<AutoCreateRenewalWorkflowsJobInput>
): Promise<void> {
  const { company_id, advance_notice_days = RENEWAL_TIMELINE.advance_notice_days } = job.data;

  try {
    // Calculate target expiry date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + advance_notice_days);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Step 1: Query expiring permits
    let query = supabaseAdmin
      .from('documents')
      .select(`
        id,
        company_id,
        site_id,
        document_type,
        expiry_date,
        document_name,
        uploaded_by,
        users!documents_uploaded_by_fkey(id, email, full_name)
      `)
      .in('document_type', [
        'ENVIRONMENTAL_PERMIT',
        'TRADE_EFFLUENT_CONSENT',
        'MCPD_REGISTRATION',
      ])
      .eq('status', 'ACTIVE')
      .eq('expiry_date', targetDateStr)
      .is('deleted_at', null);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: expiringPermits, error: permitsError } = await query;

    if (permitsError) {
      throw new Error(`Failed to fetch expiring permits: ${permitsError.message}`);
    }

    if (!expiringPermits || expiringPermits.length === 0) {
      console.log(`No permits expiring in ${advance_notice_days} days found`);
      return;
    }

    let workflowsCreated = 0;
    let notificationsSent = 0;

    // Step 2 & 3: Process each permit
    for (const permit of expiringPermits) {
      try {
        const owner = (permit.users as any);

        // Check for existing renewal workflows
        const { data: existingWorkflows, error: workflowCheckError } = await supabaseAdmin
          .from('permit_workflows')
          .select('id')
          .eq('document_id', permit.id)
          .eq('workflow_type', 'RENEWAL')
          .not('status', 'in', '(COMPLETED, CANCELLED)');

        if (workflowCheckError) {
          console.error(`Error checking existing workflows for permit ${permit.id}:`, workflowCheckError);
          continue;
        }

        if (existingWorkflows && existingWorkflows.length > 0) {
          console.log(`Permit ${permit.id} already has an active renewal workflow, skipping`);
          continue;
        }

        // Calculate regulator response deadline (30 days before expiry)
        const expiryDate = new Date(permit.expiry_date);
        const regulatorResponseDeadline = new Date(expiryDate);
        regulatorResponseDeadline.setDate(regulatorResponseDeadline.getDate() - 30);

        // Step 3: Create renewal workflow
        const { data: workflow, error: workflowError } = await supabaseAdmin
          .from('permit_workflows')
          .insert({
            document_id: permit.id,
            company_id: permit.company_id,
            site_id: permit.site_id,
            workflow_type: 'RENEWAL',
            status: 'DRAFT',
            regulator_response_deadline: regulatorResponseDeadline.toISOString().split('T')[0],
            workflow_notes: `Auto-created renewal workflow - permit expires in ${advance_notice_days} days`,
            created_by: permit.uploaded_by || null,
          })
          .select('id')
          .single();

        if (workflowError || !workflow) {
          console.error(`Failed to create renewal workflow for permit ${permit.id}:`, workflowError);
          continue;
        }

        workflowsCreated++;

        // Step 4: Create notification
        if (owner && owner.email) {
          const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
          const actionUrl = `${baseUrl}/module-1/permit-workflows/${workflow.id}`;

          const { error: notifyError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: owner.id,
              company_id: permit.company_id,
              site_id: permit.site_id,
              recipient_email: owner.email,
              notification_type: 'PERMIT_RENEWAL_REQUIRED',
              channel: 'EMAIL, IN_APP',
              priority: 'HIGH',
              subject: `Permit Renewal Required: Expires in ${advance_notice_days} Days`,
              body_text: `Your ${permit.document_type} (${permit.document_name || 'Untitled'}) expires on ${permit.expiry_date}. A renewal workflow has been created. Please start the renewal process.`,
              body_html: null,
              entity_type: 'permit_workflow',
              entity_id: workflow.id,
              action_url: actionUrl,
              variables: {
                document_type: permit.document_type,
                document_name: permit.document_name,
                expiry_date: permit.expiry_date,
                workflow_id: workflow.id,
                action_url: actionUrl,
              },
              status: 'PENDING',
              scheduled_for: new Date().toISOString(),
            });

          if (notifyError) {
            console.error(`Failed to create notification for permit ${permit.id}:`, notifyError);
          } else {
            notificationsSent++;
          }
        } else {
          console.warn(`Permit ${permit.id} has no owner, skipping notification`);
        }
      } catch (error: any) {
        console.error(`Error processing permit ${permit.id}:`, error);
        continue;
      }
    }

    console.log(
      `Auto-create renewal workflows completed: ${workflowsCreated} workflows created, ${notificationsSent} notifications sent`
    );
  } catch (error: any) {
    console.error('Error in auto-create renewal workflows job:', error);
    throw error;
  }
}

