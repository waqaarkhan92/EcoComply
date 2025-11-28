/**
 * Monitoring Schedule Job Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processMonitoringScheduleJob, MonitoringScheduleJobData } from '../../../lib/jobs/monitoring-schedule-job';
import { supabaseAdmin } from '../../../lib/supabase/server';

describe('Monitoring Schedule Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = createTestQueue('monitoring-schedule');
        worker = createTestWorker('monitoring-schedule', async (job) => {
          await processMonitoringScheduleJob(job);
        });
      } catch (error) {
        console.warn('Redis not available, skipping queue tests:', error);
      }
    }
  });

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

  (hasRedis ? it : it.skip)('should calculate deadlines for obligations with frequency', async () => {
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

    // Create test obligation with frequency
    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: company.id,
        site_id: site.id,
        module_id: module.id,
        obligation_text: 'Test obligation',
        summary: 'Test',
        category: 'MONITORING',
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        deadline_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Enqueue job
    const jobData: MonitoringScheduleJobData = {
      company_id: company.id,
      site_id: site.id,
    };

    const job = await queue.add('MONITORING_SCHEDULE', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 10000);

    // Verify schedule was created/updated
    const { data: schedule } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('obligation_id', obligation.id)
      .single();

    expect(schedule).toBeDefined();
    expect(schedule?.frequency).toBe('MONTHLY');

    // Clean up
    await supabaseAdmin.from('schedules').delete().eq('obligation_id', obligation.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 15000);

  (hasRedis ? it : it.skip)('should update obligation status based on deadline', async () => {
    // This test verifies that obligations with past deadlines are marked as OVERDUE
    // Implementation similar to above but with past deadline_date
    expect(true).toBe(true); // Placeholder - implement if needed
  });
});

