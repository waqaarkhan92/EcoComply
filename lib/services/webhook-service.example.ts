/**
 * Webhook Service - Usage Examples
 *
 * This file demonstrates how to use the webhook service to enable
 * external integrations for EcoComply.
 */

import { webhookService, WebhookEventType, verifyWebhookSignature } from './webhook-service';

/**
 * EXAMPLE 1: Register a webhook for a company
 *
 * When a company wants to receive webhook notifications for specific events,
 * register their endpoint URL with the events they want to subscribe to.
 */
async function example1_RegisterWebhook() {
  const companyId = 'company-uuid-here';
  const webhookUrl = 'https://example.com/api/webhooks/ecocomply';

  // Define which events this webhook should receive
  const events: WebhookEventType[] = [
    'obligation.created',
    'obligation.updated',
    'evidence.uploaded',
    'evidence.approved',
    'deadline.approaching',
    'breach.detected',
  ];

  try {
    // Register the webhook (secret is auto-generated if not provided)
    const webhook = await webhookService.registerWebhook(
      companyId,
      webhookUrl,
      events
    );

    console.log('Webhook registered successfully!');
    console.log('Webhook ID:', webhook.id);
    console.log('Secret:', webhook.secret); // Store this securely - needed for signature verification

    // Return the secret to the client so they can verify webhook signatures
    return {
      webhookId: webhook.id,
      secret: webhook.secret, // Client should store this securely
    };
  } catch (error) {
    console.error('Failed to register webhook:', error);
    throw error;
  }
}

/**
 * EXAMPLE 2: List all webhooks for a company
 */
async function example2_ListWebhooks() {
  const companyId = 'company-uuid-here';

  try {
    const webhooks = await webhookService.listWebhooks(companyId);

    console.log(`Found ${webhooks.length} webhook(s)`);
    webhooks.forEach(webhook => {
      console.log(`- ${webhook.name}: ${webhook.url}`);
      console.log(`  Events: ${webhook.events.join(', ')}`);
      console.log(`  Active: ${webhook.is_active}`);
    });

    return webhooks;
  } catch (error) {
    console.error('Failed to list webhooks:', error);
    throw error;
  }
}

/**
 * EXAMPLE 3: Delete a webhook
 */
async function example3_DeleteWebhook() {
  const webhookId = 'webhook-uuid-here';

  try {
    await webhookService.deleteWebhook(webhookId);
    console.log('Webhook deleted successfully');
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    throw error;
  }
}

/**
 * EXAMPLE 4: Trigger webhook when an obligation is created
 *
 * This would be called internally in your obligation creation code
 */
async function example4_TriggerObligationCreated() {
  const companyId = 'company-uuid-here';

  // This is typically called after successfully creating an obligation
  const obligationData = {
    obligation_id: 'obligation-uuid-here',
    site_id: 'site-uuid-here',
    permit_id: 'permit-uuid-here',
    title: 'Monthly emissions monitoring report',
    due_date: '2025-02-15T00:00:00Z',
    status: 'PENDING',
    priority: 'HIGH',
  };

  try {
    // Trigger webhooks for this event
    await webhookService.triggerWebhook(
      'obligation.created',
      companyId,
      obligationData
    );

    console.log('Webhooks triggered successfully');
  } catch (error) {
    console.error('Failed to trigger webhooks:', error);
    // Note: webhook failures should not block the main operation
  }
}

/**
 * EXAMPLE 5: Trigger webhook when evidence is uploaded
 */
async function example5_TriggerEvidenceUploaded() {
  const companyId = 'company-uuid-here';

  const evidenceData = {
    evidence_id: 'evidence-uuid-here',
    obligation_id: 'obligation-uuid-here',
    file_name: 'emissions-report-jan-2025.pdf',
    file_type: 'application/pdf',
    file_size: 2048576,
    uploaded_by: 'user-uuid-here',
    uploaded_at: new Date().toISOString(),
  };

  await webhookService.triggerWebhook(
    'evidence.uploaded',
    companyId,
    evidenceData
  );
}

/**
 * EXAMPLE 6: Trigger webhook when a breach is detected
 */
async function example6_TriggerBreachDetected() {
  const companyId = 'company-uuid-here';

  const breachData = {
    breach_id: 'breach-uuid-here',
    obligation_id: 'obligation-uuid-here',
    permit_id: 'permit-uuid-here',
    breach_type: 'DEADLINE_MISSED',
    severity: 'HIGH',
    detected_at: new Date().toISOString(),
    description: 'Obligation deadline missed by 3 days',
    days_overdue: 3,
  };

  await webhookService.triggerWebhook(
    'breach.detected',
    companyId,
    breachData
  );
}

/**
 * EXAMPLE 7: Trigger webhook when a pack is generated
 */
async function example7_TriggerPackGenerated() {
  const companyId = 'company-uuid-here';

  const packData = {
    pack_id: 'pack-uuid-here',
    pack_type: 'AUDIT',
    title: 'Q4 2024 Compliance Audit Pack',
    generated_at: new Date().toISOString(),
    generated_by: 'user-uuid-here',
    download_url: 'https://ecocomply.com/api/packs/pack-uuid-here/download',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };

  await webhookService.triggerWebhook(
    'pack.generated',
    companyId,
    packData
  );
}

/**
 * EXAMPLE 8: Integration in obligation service
 *
 * This shows how to integrate webhook triggering into an existing service
 */
async function example8_IntegrationInService() {
  // Example from obligation-service.ts
  async function createObligation(companyId: string, obligationData: any) {
    // 1. Create the obligation in database
    const obligation = await createObligationInDatabase(obligationData);

    // 2. Trigger webhook (async, non-blocking)
    webhookService.triggerWebhook(
      'obligation.created',
      companyId,
      {
        obligation_id: obligation.id,
        site_id: obligation.site_id,
        permit_id: obligation.permit_id,
        title: obligation.title,
        due_date: obligation.due_date,
        status: obligation.status,
        priority: obligation.priority,
      }
    ).catch(error => {
      // Log but don't fail the operation
      console.error('Failed to trigger webhook:', error);
    });

    // 3. Return the created obligation
    return obligation;
  }

  async function updateObligation(companyId: string, obligationId: string, updates: any) {
    // 1. Update the obligation
    const obligation = await updateObligationInDatabase(obligationId, updates);

    // 2. Trigger webhook
    webhookService.triggerWebhook(
      'obligation.updated',
      companyId,
      {
        obligation_id: obligation.id,
        updated_fields: Object.keys(updates),
        ...updates,
      }
    ).catch(console.error);

    return obligation;
  }

  // Stub functions for demonstration
  async function createObligationInDatabase(data: any) { return { id: 'uuid', ...data }; }
  async function updateObligationInDatabase(id: string, data: any) { return { id, ...data }; }
}

/**
 * EXAMPLE 9: Webhook receiver/consumer example (for external systems)
 *
 * This is code that would run on the RECEIVING end of webhooks
 * (in the external system that registered the webhook)
 */
async function example9_WebhookReceiverEndpoint(
  req: { headers: Record<string, string>; body: any },
  res: { status: (code: number) => { json: (data: any) => void } }
) {
  // Express.js example
  // app.post('/api/webhooks/ecocomply', async (req, res) => {

  // Get webhook signature from headers
  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const eventType = req.headers['x-webhook-event'] as string;
  const eventId = req.headers['x-webhook-id'] as string;

  // Get raw body as string (important for signature verification)
  const rawBody = JSON.stringify(req.body);

  // Your webhook secret (obtained when registering the webhook)
  const webhookSecret = process.env.ECOCOMPLY_WEBHOOK_SECRET || '';

  // 1. Verify the signature
  const isValid = verifyWebhookSignature(
    webhookSecret,
    timestamp,
    rawBody,
    signature
  );

  if (!isValid) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse the payload
  const payload = req.body;

  console.log('Received webhook event:', eventType);
  console.log('Event ID:', eventId);
  console.log('Company ID:', payload.company_id);
  console.log('Data:', payload.data);

  // 3. Process the event based on type
  switch (eventType) {
    case 'obligation.created':
      await handleObligationCreated(payload.data);
      break;
    case 'obligation.updated':
      await handleObligationUpdated(payload.data);
      break;
    case 'evidence.uploaded':
      await handleEvidenceUploaded(payload.data);
      break;
    case 'evidence.approved':
      await handleEvidenceApproved(payload.data);
      break;
    case 'deadline.approaching':
      await handleDeadlineApproaching(payload.data);
      break;
    case 'breach.detected':
      await handleBreachDetected(payload.data);
      break;
    case 'pack.generated':
      await handlePackGenerated(payload.data);
      break;
    default:
      console.log('Unknown event type:', eventType);
  }

  // 4. Return success response
  return res.status(200).json({ received: true });

  // Helper functions
  async function handleObligationCreated(data: any) {
    console.log('New obligation created:', data.obligation_id);
    // Add to your system, send notifications, etc.
  }

  async function handleObligationUpdated(data: any) {
    console.log('Obligation updated:', data.obligation_id);
  }

  async function handleEvidenceUploaded(data: any) {
    console.log('Evidence uploaded:', data.evidence_id);
  }

  async function handleEvidenceApproved(data: any) {
    console.log('Evidence approved:', data.evidence_id);
  }

  async function handleDeadlineApproaching(data: any) {
    console.log('Deadline approaching:', data.obligation_id);
    // Send alerts, update dashboards, etc.
  }

  async function handleBreachDetected(data: any) {
    console.log('Breach detected:', data.breach_id);
    // Trigger escalation, send urgent alerts, etc.
  }

  async function handlePackGenerated(data: any) {
    console.log('Pack generated:', data.pack_id);
    // Download the pack, archive it, etc.
  }
  // });
}

/**
 * EXAMPLE 10: Get webhook delivery history
 */
async function example10_GetDeliveryHistory() {
  const webhookId = 'webhook-uuid-here';

  try {
    const deliveries = await webhookService.getDeliveries(webhookId, {
      limit: 20,
      offset: 0,
    });

    console.log(`Found ${deliveries.length} delivery attempts`);
    deliveries.forEach(delivery => {
      const status = delivery.delivered_at ? 'SUCCESS' : 'FAILED';
      console.log(`- ${delivery.event_type} (${status})`);
      console.log(`  Attempt: ${delivery.retry_count + 1}`);
      console.log(`  Status: ${delivery.response_status}`);
      if (delivery.error_message) {
        console.log(`  Error: ${delivery.error_message}`);
      }
    });

    return deliveries;
  } catch (error) {
    console.error('Failed to get delivery history:', error);
    throw error;
  }
}

/**
 * EXAMPLE 11: Send test webhook
 */
async function example11_SendTestWebhook() {
  const webhookId = 'webhook-uuid-here';
  const companyId = 'company-uuid-here';

  try {
    const result = await webhookService.sendTestEvent(webhookId, companyId);

    if (result.success) {
      console.log('Test webhook sent successfully!');
    } else {
      console.error('Test webhook failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Failed to send test webhook:', error);
    throw error;
  }
}

/**
 * EXAMPLE 12: Update webhook configuration
 */
async function example12_UpdateWebhook() {
  const webhookId = 'webhook-uuid-here';
  const companyId = 'company-uuid-here';

  try {
    const updatedWebhook = await webhookService.updateWebhook(
      webhookId,
      companyId,
      {
        name: 'Updated Webhook Name',
        events: ['obligation.created', 'evidence.uploaded', 'breach.detected'],
        is_active: true,
        headers: {
          'Authorization': 'Bearer custom-token',
        },
      }
    );

    console.log('Webhook updated successfully:', updatedWebhook);
    return updatedWebhook;
  } catch (error) {
    console.error('Failed to update webhook:', error);
    throw error;
  }
}

// Export examples for testing
export {
  example1_RegisterWebhook,
  example2_ListWebhooks,
  example3_DeleteWebhook,
  example4_TriggerObligationCreated,
  example5_TriggerEvidenceUploaded,
  example6_TriggerBreachDetected,
  example7_TriggerPackGenerated,
  example8_IntegrationInService,
  example9_WebhookReceiverEndpoint,
  example10_GetDeliveryHistory,
  example11_SendTestWebhook,
  example12_UpdateWebhook,
};
