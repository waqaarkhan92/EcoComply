/**
 * Flag Pending Runtime Validations Job
 * Alerts managers about manual runtime entries pending validation
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 12.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface FlagPendingRuntimeValidationsJobInput {
  company_id?: string;
  pending_threshold_hours?: number;
}

export async function processFlagPendingRuntimeValidationsJob(
  job: Job<FlagPendingRuntimeValidationsJobInput>
): Promise<void> {
  const { company_id, pending_threshold_hours = 24 } = job.data;

  try {
    const thresholdTime = new Date();
    thresholdTime.setHours(thresholdTime.getHours() - pending_threshold_hours);
    const thresholdTimeStr = thresholdTime.toISOString();

    // Step 1: Query pending manual entries
    let query = supabaseAdmin
      .from('runtime_monitoring')
      .select(`
        id,
        generator_id,
        run_date,
        runtime_hours,
        reason_code,
        entry_reason_notes,
        created_at,
        generators!inner(
          id,
          generator_identifier,
          site_id,
          company_id
        )
      `)
      .eq('validation_status', 'PENDING')
      .eq('data_source', 'MANUAL')
      .lt('created_at', thresholdTimeStr)
      .order('run_date', { ascending: false });

    if (company_id) {
      query = query.eq('generators.company_id', company_id);
    }

    const { data: pendingEntries, error: entriesError } = await query;

    if (entriesError) {
      throw new Error(`Failed to fetch pending runtime entries: ${entriesError.message}`);
    }

    if (!pendingEntries || pendingEntries.length === 0) {
      console.log('No pending runtime validation entries found');
      return;
    }

    // Step 2: Group by generator
    const entriesByGenerator = new Map<string, typeof pendingEntries>();

    for (const entry of pendingEntries) {
      const generator = (entry.generators as any);
      if (!generator) continue;

      const generatorId = generator.id;
      if (!entriesByGenerator.has(generatorId)) {
        entriesByGenerator.set(generatorId, []);
      }
      entriesByGenerator.get(generatorId)!.push(entry);
    }

    let notificationsSent = 0;

    // Step 3: Send manager notifications for each generator
    for (const [generatorId, entries] of entriesByGenerator.entries()) {
      try {
        const firstEntry = entries[0];
        const generator = (firstEntry.generators as any);
        if (!generator) continue;

        const pendingCount = entries.length;
        const oldestEntry = entries.reduce((oldest, entry) => {
          const entryDate = new Date(entry.created_at);
          const oldestDate = new Date(oldest.created_at);
          return entryDate < oldestDate ? entry : oldest;
        });

        // Find managers for site
        const { data: managers, error: managersError } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name')
          .eq('company_id', generator.company_id)
          .in('id', await getRoleUserIds(generator.company_id, ['ADMIN', 'OWNER']));

        if (managersError || !managers || managers.length === 0) {
          console.warn(`No managers found for generator ${generatorId}, skipping notifications`);
          continue;
        }

        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
        const actionUrl = `${baseUrl}/module-3/generators/${generatorId}`;

        // Create notifications for each manager
        const notifications = managers.map((manager: any) => ({
          user_id: manager.id,
          company_id: generator.company_id,
          site_id: generator.site_id,
          recipient_email: manager.email,
          notification_type: 'RUNTIME_VALIDATION_PENDING',
          channel: 'EMAIL, IN_APP',
          priority: 'NORMAL',
          subject: `${pendingCount} Manual Runtime Entries Pending Validation`,
          body_text: `Generator ${generator.generator_identifier} has ${pendingCount} manual runtime entries pending validation. Oldest entry: ${oldestEntry.run_date}. Please review and validate.`,
          body_html: null,
          entity_type: 'generator',
          entity_id: generatorId,
          action_url: actionUrl,
          variables: {
            generator_identifier: generator.generator_identifier,
            pending_count: pendingCount,
            oldest_entry_date: oldestEntry.run_date,
            pending_entry_ids: entries.map((e) => e.id),
            action_url: actionUrl,
          },
          metadata: {
            pending_count: pendingCount,
            oldest_entry_date: oldestEntry.run_date,
            pending_entry_ids: entries.map((e) => e.id),
          },
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
        }));

        const { error: notifyError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (!notifyError) {
          notificationsSent += notifications.length;
        } else {
          console.error(`Failed to create notifications for generator ${generatorId}:`, notifyError);
        }
      } catch (error: any) {
        console.error(`Error processing generator ${generatorId}:`, error);
        continue;
      }
    }

    console.log(
      `Flag pending runtime validations completed: ${entriesByGenerator.size} generators flagged, ${notificationsSent} notifications sent`
    );
  } catch (error: any) {
    console.error('Error in flag pending runtime validations job:', error);
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

