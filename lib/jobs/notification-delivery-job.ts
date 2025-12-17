/**
 * Notification Delivery Job
 * Processes pending notifications and sends them via email
 * Reference: docs/specs/42_Backend_Notifications.md Section 8.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/services/email-service';
import { checkRateLimit, recordRateLimitUsage } from '@/lib/services/rate-limit-service';
import { getEmailTemplate } from '@/lib/templates/notification-templates';
import { shouldSendNotification } from '@/lib/services/notification-preferences-service';
import { queueForDigest } from '@/lib/services/digest-service';

export interface NotificationDeliveryJobData {
  notification_id?: string; // Optional: Process specific notification
  batch_size?: number; // Optional: Number of notifications to process (default: 50)
}

export async function processNotificationDeliveryJob(
  job: Job<NotificationDeliveryJobData>
): Promise<void> {
  const { notification_id, batch_size = 50 } = job.data;

  try {
    // If specific notification ID provided, process only that one
    if (notification_id) {
      await processSingleNotification(notification_id);
      return;
    }

    // Otherwise, process batch of pending notifications (including RETRYING status)
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .in('status', ['PENDING', 'RETRYING'])
      .eq('channel', 'EMAIL')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false }) // Process CRITICAL/URGENT first
      .order('created_at', { ascending: true }) // Then by creation time
      .limit(batch_size);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications to process');
      return;
    }

    let sent = 0;
    let failed = 0;
    let rateLimited = 0;

    for (const notification of notifications) {
      try {
        // Check user preferences before sending
        const shouldSend = await shouldSendNotification(
          notification.user_id,
          notification.notification_type,
          notification.channel as 'EMAIL' | 'SMS' | 'IN_APP'
        );

        if (!shouldSend) {
          // Check if it's a digest preference
          const { getUserPreferences } = await import('@/lib/services/notification-preferences-service');
          const preferences = await getUserPreferences(notification.user_id, notification.notification_type);
          
          if (preferences.frequency_preference === 'DAILY_DIGEST' || preferences.frequency_preference === 'WEEKLY_DIGEST') {
            // Queue for digest - map DAILY_DIGEST/WEEKLY_DIGEST to DAILY/WEEKLY
            const digestType: 'DAILY' | 'WEEKLY' = preferences.frequency_preference === 'DAILY_DIGEST' ? 'DAILY' : 'WEEKLY';
            await queueForDigest(notification.id, notification.user_id, digestType);
          } else {
            // User has disabled this notification type or channel
            await supabaseAdmin
              .from('notifications')
              .update({
                status: 'CANCELLED',
                metadata: {
                  ...(notification.metadata || {}),
                  cancelled_reason: 'User preference disabled',
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', notification.id);
          }
          continue;
        }

        // Check rate limits before sending
        const rateLimitCheck = await checkRateLimit({
          scope: 'user',
          id: notification.user_id,
          channel: 'EMAIL',
        });

        if (!rateLimitCheck.allowed) {
          // Rate limit exceeded - reschedule notification
          await supabaseAdmin
            .from('notifications')
            .update({
              status: 'QUEUED',
              scheduled_for: rateLimitCheck.retryAfter || new Date(Date.now() + 3600000).toISOString(), // Retry in 1 hour
              metadata: {
                ...(notification.metadata || {}),
                rate_limit_exceeded: {
                  exceeded_at: new Date().toISOString(),
                  retry_after: rateLimitCheck.retryAfter,
                },
              },
            })
            .eq('id', notification.id);
          rateLimited++;
          continue;
        }

        // Update status to SENDING
        await supabaseAdmin
          .from('notifications')
          .update({
            status: 'SENDING',
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        // Resolve company name if needed
        let companyName = notification.metadata?.company_name;
        if (!companyName && notification.company_id) {
          const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', notification.company_id)
            .single();
          companyName = company?.name;
        }

        // Update metadata with resolved company name
        const enrichedMetadata = {
          ...(notification.metadata || {}),
          company_name: companyName || 'EcoComply',
        };

        // Get email template based on notification type
        const template = await getEmailTemplate(notification.notification_type, {
          ...notification,
          metadata: enrichedMetadata,
        });

        // Send email
        const emailResult = await sendEmail({
          to: notification.recipient_email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        if (emailResult.success) {
          // Update notification status to SENT
          await supabaseAdmin
            .from('notifications')
            .update({
              status: 'SENT',
              delivery_provider: 'RESEND',
              delivery_provider_id: emailResult.messageId,
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          // Record rate limit usage
          await recordRateLimitUsage({
            scope: 'user',
            id: notification.user_id,
            channel: 'EMAIL',
          });

          sent++;
        } else {
          // Check if error is retryable
          const isRetryable = isRetryableError(emailResult.error || '');
          const retryCount = (notification.metadata?.retry_count || 0) + 1;

          if (isRetryable && retryCount <= 3) {
            // Retry with exponential backoff
            const delayMinutes = retryCount === 1 ? 5 : 30; // 5 min, then 30 min
            const retryAt = new Date();
            retryAt.setMinutes(retryAt.getMinutes() + delayMinutes);

            await supabaseAdmin
              .from('notifications')
              .update({
                status: 'RETRYING',
                scheduled_for: retryAt.toISOString(),
                delivery_error: emailResult.error || 'Unknown error',
                metadata: {
                  ...(notification.metadata || {}),
                  retry_count: retryCount,
                  last_retry_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', notification.id);
          } else {
            // Max retries exceeded or non-retryable error - mark as FAILED
            const isMaxRetriesExceeded = retryCount > 3;

            if (isMaxRetriesExceeded) {
              // Move to dead-letter queue
              await moveToDeadLetterQueue(notification, emailResult.error || 'Max retries exceeded');
            }

            await supabaseAdmin
              .from('notifications')
              .update({
                status: 'FAILED',
                delivery_error: emailResult.error || 'Unknown error',
                metadata: {
                  ...(notification.metadata || {}),
                  retry_count: retryCount,
                  failed_at: new Date().toISOString(),
                  max_retries_exceeded: isMaxRetriesExceeded,
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', notification.id);

            failed++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing notification ${notification.id}:`, error);

        // Update notification status to FAILED
        await supabaseAdmin
          .from('notifications')
          .update({
            status: 'FAILED',
            delivery_error: error.message || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        failed++;
      }
    }

    console.log(
      `Notification delivery job completed: ${sent} sent, ${failed} failed, ${rateLimited} rate limited`
    );
  } catch (error: any) {
    console.error('Notification delivery job failed:', error);
    throw error;
  }
}

/**
 * Process a single notification
 */
async function processSingleNotification(notificationId: string): Promise<void> {
  const { data: notification, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (error || !notification) {
    throw new Error(`Notification not found: ${notificationId}`);
  }

  if (notification.status !== 'PENDING' && notification.status !== 'QUEUED' && notification.status !== 'RETRYING') {
    console.log(`Notification ${notificationId} is not pending (status: ${notification.status})`);
    return;
  }

  // Check rate limits
  const rateLimitCheck = await checkRateLimit({
    scope: 'user',
    id: notification.user_id,
    channel: 'EMAIL',
  });

  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded for user ${notification.user_id}`);
  }

  // Update status to SENDING
  await supabaseAdmin
    .from('notifications')
    .update({
      status: 'SENDING',
      updated_at: new Date().toISOString(),
    })
    .eq('id', notification.id);

  // Get email template
  const template = await getEmailTemplate(notification.notification_type, notification);

  // Send email
  const emailResult = await sendEmail({
    to: notification.recipient_email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (emailResult.success) {
    // Update notification status to SENT
    await supabaseAdmin
      .from('notifications')
      .update({
        status: 'SENT',
        delivery_provider: 'RESEND',
        delivery_provider_id: emailResult.messageId,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id);

    // Record rate limit usage
    await recordRateLimitUsage({
      scope: 'user',
      id: notification.user_id,
      channel: 'EMAIL',
    });
  } else {
    // Update notification status to FAILED
    await supabaseAdmin
      .from('notifications')
      .update({
        status: 'FAILED',
        delivery_error: emailResult.error || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id);

    throw new Error(`Failed to send email: ${emailResult.error}`);
  }
}

/**
 * Check if error is retryable
 * Reference: docs/specs/42_Backend_Notifications.md Section 11.2
 */
function isRetryableError(error: string | Error): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  const errorCode = (error as any)?.code || '';

  // Non-retryable errors (permanent)
  if (
    errorCode === 'INVALID_EMAIL' ||
    errorCode === 'INVALID_PHONE' ||
    errorMessage.includes('invalid email') ||
    errorMessage.includes('invalid recipient') ||
    errorMessage.includes('hard bounce') ||
    errorMessage.includes('spam complaint') ||
    errorMessage.includes('unsubscribe')
  ) {
    return false;
  }

  // Retryable errors (transient)
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('503') ||
    errorMessage.includes('service unavailable')
  ) {
    return true;
  }

  // Default to non-retryable for safety
  return false;
}

/**
 * Move notification to dead-letter queue
 * Reference: docs/specs/42_Backend_Notifications.md Section 11.3
 */
async function moveToDeadLetterQueue(
  notification: any,
  errorMessage: string
): Promise<void> {
  try {
    // Create dead-letter queue record
    const { data: dlqRecord, error } = await supabaseAdmin
      .from('dead_letter_queue')
      .insert({
        job_type: 'NOTIFICATION_DELIVERY',
        payload: notification,
        error_message: errorMessage,
        error_stack: null,
        retry_count: notification.metadata?.retry_count || 3,
      })
      .select('id')
      .single();

    if (error || !dlqRecord) {
      console.error('Failed to create dead-letter queue record:', error);
      return;
    }

    // Update notification metadata with DLQ reference
    await supabaseAdmin
      .from('notifications')
      .update({
        metadata: {
          ...(notification.metadata || {}),
          dead_letter_queue_id: dlqRecord.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id);

    // TODO: Create admin alert for DLQ entry
    // This would notify admins of persistent failures
  } catch (error: any) {
    console.error('Error moving notification to dead-letter queue:', error);
  }
}

