/**
 * Check Regulator Response Deadlines Job
 * Alerts when regulator hasn't responded by deadline
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 9.2
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface CheckRegulatorResponseDeadlinesJobInput {
  company_id?: string;
}

function determineAlertPriority(daysOverdue: number): 'HIGH' | 'URGENT' {
  return daysOverdue > 7 ? 'URGENT' : 'HIGH';
}

function shouldEscalateToAdmins(daysOverdue: number): boolean {
  return daysOverdue > 7;
}

export async function processCheckRegulatorResponseDeadlinesJob(
  job: Job<CheckRegulatorResponseDeadlinesJobInput>
): Promise<void> {
  const { company_id } = job.data;

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Step 1: Query workflows awaiting regulator response
    let query = supabaseAdmin
      .from('permit_workflows')
      .select(`
        id,
        document_id,
        workflow_type,
        submitted_date,
        regulator_response_deadline,
        workflow_notes,
        documents!inner(
          id,
          document_name,
          document_type,
          uploaded_by,
          company_id,
          site_id,
          users!documents_uploaded_by_fkey(id, email, full_name)
        )
      `)
      .eq('status', 'UNDER_REVIEW')
      .lt('regulator_response_deadline', todayStr)
      .is('regulator_response_date', null);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: workflows, error: workflowsError } = await query;

    if (workflowsError) {
      throw new Error(`Failed to fetch workflows: ${workflowsError.message}`);
    }

    if (!workflows || workflows.length === 0) {
      console.log('No workflows with overdue regulator responses found');
      return;
    }

    let alertsCreated = 0;
    let escalationsCreated = 0;

    // Step 2 & 3: Process each workflow
    for (const workflow of workflows) {
      try {
        const document = (workflow.documents as any);
        const owner = document?.users as any;

        if (!document || !workflow.regulator_response_deadline) {
          continue;
        }

        // Step 2: Calculate days overdue
        const deadlineDate = new Date(workflow.regulator_response_deadline);
        const daysOverdue = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
          continue; // Not yet overdue
        }

        const priority = determineAlertPriority(daysOverdue);
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
        const actionUrl = `${baseUrl}/module-1/permit-workflows/${workflow.id}`;

        // Step 3: Create alert notification for permit owner
        if (owner && owner.email) {
          const { error: notifyError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: owner.id,
              company_id: document.company_id,
              site_id: document.site_id,
              recipient_email: owner.email,
              notification_type: 'REGULATOR_RESPONSE_OVERDUE',
              channel: 'EMAIL, IN_APP',
              priority: priority,
              subject: `Regulator Response Overdue: ${workflow.workflow_type}`,
              body_text: `The regulator response for your ${workflow.workflow_type} workflow was due on ${workflow.regulator_response_deadline} and is now ${daysOverdue} day(s) overdue. Consider following up with the regulator.`,
              body_html: null,
              entity_type: 'permit_workflow',
              entity_id: workflow.id,
              action_url: actionUrl,
              variables: {
                workflow_type: workflow.workflow_type,
                workflow_id: workflow.id,
                deadline: workflow.regulator_response_deadline,
                days_overdue: daysOverdue,
                document_name: document.document_name,
                action_url: actionUrl,
              },
              status: 'PENDING',
              scheduled_for: new Date().toISOString(),
            });

          if (!notifyError) {
            alertsCreated++;
          }
        }

        // Step 3: Escalate to admins if > 7 days overdue
        if (shouldEscalateToAdmins(daysOverdue)) {
          const { data: admins, error: adminsError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name')
            .eq('company_id', document.company_id)
            .in('id', await getRoleUserIds(document.company_id, ['ADMIN', 'OWNER']));

          if (!adminsError && admins && admins.length > 0) {
            const escalationNotifications = admins.map((admin: any) => ({
              user_id: admin.id,
              company_id: document.company_id,
              site_id: document.site_id,
              recipient_email: admin.email,
              notification_type: 'REGULATOR_RESPONSE_OVERDUE',
              channel: 'EMAIL, IN_APP',
              priority: 'URGENT',
              subject: `URGENT: Regulator Response Overdue - ${daysOverdue} Days`,
              body_text: `The regulator response for a ${workflow.workflow_type} workflow (${document.document_name || 'Unknown'}) has been overdue for ${daysOverdue} days. Immediate attention required.`,
              body_html: null,
              entity_type: 'permit_workflow',
              entity_id: workflow.id,
              action_url: actionUrl,
              variables: {
                workflow_type: workflow.workflow_type,
                workflow_id: workflow.id,
                deadline: workflow.regulator_response_deadline,
                days_overdue: daysOverdue,
                document_name: document.document_name,
                action_url: actionUrl,
              },
              status: 'PENDING',
              scheduled_for: new Date().toISOString(),
            }));

            const { error: escalationError } = await supabaseAdmin
              .from('notifications')
              .insert(escalationNotifications);

            if (!escalationError) {
              escalationsCreated += escalationNotifications.length;
            }
          }
        }

        // Step 4: Update workflow metadata
        const updatedNotes = `${workflow.workflow_notes || ''}\n[${todayStr}] Regulator response overdue - alert sent`.trim();

        await supabaseAdmin
          .from('permit_workflows')
          .update({
            workflow_notes: updatedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workflow.id);
      } catch (error: any) {
        console.error(`Error processing workflow ${workflow.id}:`, error);
        continue;
      }
    }

    console.log(
      `Regulator response deadline check completed: ${alertsCreated} alerts created, ${escalationsCreated} escalations sent`
    );
  } catch (error: any) {
    console.error('Error in check regulator response deadlines job:', error);
    throw error;
  }
}

async function getRoleUserIds(companyId: string, roles: string[]): Promise<string[]> {
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('user_id')
    .in('role', roles);

  if (!userRoles) return [];

  const userIds = userRoles.map((ur: any) => ur.user_id);

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .in('id', userIds);

  return users?.map((u: any) => u.id) || [];
}

