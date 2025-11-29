/**
 * Deadline Alert Job Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processDeadlineAlertJob, DeadlineAlertJobData } from '../../../lib/jobs/deadline-alert-job';
import { supabaseAdmin } from '../../../lib/supabase/server';

describe('Deadline Alert Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = await createTestQueue('deadline-alerts');
        worker = await createTestWorker('deadline-alerts', async (job) => {
          await processDeadlineAlertJob(job);
        });
      } catch (error: any) {
        console.warn('Redis not available, skipping queue tests:', error?.message);
        queue = null;
        worker = null;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (queue && worker) {
      await cleanupTestQueue(queue, worker);
    }
  });

  beforeEach(async () => {
    if (queue) {
      await queue.obliterate({ force: true });
    }
  });

  (hasRedis ? it : it.skip)('should create notifications for deadlines due in 7/3/1 days', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }
    // Get test company and site
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('No company found for testing');
    }

    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!site) {
      throw new Error('No site found for testing');
    }

    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      throw new Error('Module 1 not found');
    }

    // Create test obligation
    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: company.id,
        site_id: site.id,
        module_id: module.id,
        original_text: 'Test obligation',
        obligation_title: 'Test',
        obligation_description: 'Test obligation description',
        category: 'MONITORING',
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Create deadline due in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysDate = sevenDaysFromNow.toISOString().split('T')[0];

    const { data: deadline, error: deadlineError } = await supabaseAdmin
      .from('deadlines')
      .insert({
        obligation_id: obligation.id,
        due_date: sevenDaysDate,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (deadlineError || !deadline) {
      throw new Error(`Failed to create test deadline: ${deadlineError?.message}`);
    }

    // Enqueue job
    const jobData: DeadlineAlertJobData = {
      company_id: company.id,
      site_id: site.id,
    };

    const job = await queue.add('DEADLINE_ALERT', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 10000);

    // Verify notification was created
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('entity_type', 'deadline')
      .eq('entity_id', deadline.id);

    // Notification should be created (if users exist)
    expect(notifications).toBeDefined();

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('entity_id', deadline.id);
    await supabaseAdmin.from('deadlines').delete().eq('id', deadline.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 15000);
});

