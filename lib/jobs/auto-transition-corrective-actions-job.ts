/**
 * Auto-Transition Corrective Actions Job
 * Auto-transitions corrective actions when all items complete
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 10.2
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface AutoTransitionCorrectiveActionsJobInput {
  company_id?: string;
}

export async function processAutoTransitionCorrectiveActionsJob(
  job: Job<AutoTransitionCorrectiveActionsJobInput>
): Promise<void> {
  const { company_id } = job.data;

  try {
    // Step 1: Find corrective actions ready for transition
    // Actions in ACTION phase with all items completed
    let query = supabaseAdmin
      .from('corrective_actions')
      .select(`
        id,
        corrective_action_name,
        created_by,
        company_id,
        site_id,
        lifecycle_phase,
        status
      `)
      .eq('lifecycle_phase', 'ACTION')
      .eq('status', 'IN_PROGRESS')
      .is('deleted_at', null);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: actions, error: actionsError } = await query;

    if (actionsError) {
      throw new Error(`Failed to fetch corrective actions: ${actionsError.message}`);
    }

    if (!actions || actions.length === 0) {
      console.log('No corrective actions ready for transition found');
      return;
    }

    let transitionsCompleted = 0;
    let notificationsSent = 0;

    // Check each action to see if all items are completed
    for (const action of actions) {
      try {
        // Get all items for this action
        const { data: items, error: itemsError } = await supabaseAdmin
          .from('corrective_action_items')
          .select('id, status')
          .eq('corrective_action_id', action.id);

        if (itemsError || !items || items.length === 0) {
          continue; // No items or error fetching items
        }

        // Check if all items are completed
        const allItemsCompleted = items.every((item: any) => item.status === 'COMPLETED');

        if (!allItemsCompleted) {
          continue; // Not all items are completed yet
        }

        // Step 2: Transition to RESOLUTION phase
        const { error: transitionError } = await supabaseAdmin
          .from('corrective_actions')
          .update({
            lifecycle_phase: 'RESOLUTION',
            updated_at: new Date().toISOString(),
          })
          .eq('id', action.id);

        if (transitionError) {
          console.error(`Failed to transition action ${action.id}:`, transitionError);
          continue;
        }

        transitionsCompleted++;

        // Step 3: Notify action creator
        if (action.created_by) {
          const { data: creator, error: creatorError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name')
            .eq('id', action.created_by)
            .single();

          if (!creatorError && creator) {
            const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
            const actionUrl = `${baseUrl}/module-2/corrective-actions/${action.id}`;

            const { error: notifyError } = await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: creator.id,
                company_id: action.company_id,
                site_id: action.site_id,
                recipient_email: creator.email,
                notification_type: 'CORRECTIVE_ACTION_READY_FOR_CLOSURE',
                channel: 'EMAIL, IN_APP',
                priority: 'NORMAL',
                subject: 'Corrective Action Ready for Resolution',
                body_text: `All action items for "${action.corrective_action_name}" have been completed. The corrective action is now ready for resolution verification.`,
                body_html: null,
                entity_type: 'corrective_action',
                entity_id: action.id,
                action_url: actionUrl,
                variables: {
                  corrective_action_name: action.corrective_action_name,
                  corrective_action_id: action.id,
                  action_url: actionUrl,
                },
                status: 'PENDING',
                scheduled_for: new Date().toISOString(),
              });

            if (!notifyError) {
              notificationsSent++;
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing corrective action ${action.id}:`, error);
        continue;
      }
    }

    console.log(
      `Auto-transition corrective actions completed: ${transitionsCompleted} actions transitioned, ${notificationsSent} notifications sent`
    );
  } catch (error: any) {
    console.error('Error in auto-transition corrective actions job:', error);
    throw error;
  }
}

