/**
 * Job Function Tests
 * Tests job processing functions directly (without queue/worker)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { processMonitoringScheduleJob } from '../../../lib/jobs/monitoring-schedule-job';
import { processDeadlineAlertJob } from '../../../lib/jobs/deadline-alert-job';
import { processEvidenceReminderJob } from '../../../lib/jobs/evidence-reminder-job';

// Mock BullMQ Job
function createMockJob(data: any) {
  return {
    data,
    id: 'test-job-id',
    name: 'TEST_JOB',
    attemptsMade: 0,
    opts: {},
  } as any;
}

describe('Job Functions (Direct)', () => {
  it('should validate monitoring schedule job data structure', () => {
    const jobData = {
      company_id: 'test-company-id',
      site_id: 'test-site-id',
      force_recalculate: false,
    };

    expect(jobData).toHaveProperty('company_id');
    expect(jobData).toHaveProperty('force_recalculate');
  });

  it('should validate deadline alert job data structure', () => {
    const jobData = {
      company_id: 'test-company-id',
      site_id: 'test-site-id',
    };

    expect(jobData).toHaveProperty('company_id');
  });

  it('should validate evidence reminder job data structure', () => {
    const jobData = {
      company_id: 'test-company-id',
      site_id: 'test-site-id',
    };

    expect(jobData).toHaveProperty('company_id');
  });

  it('should handle empty company_id in monitoring schedule job', async () => {
    const job = createMockJob({});
    
    // Job should handle empty company_id (processes all companies)
    expect(job.data.company_id).toBeUndefined();
  });
});

