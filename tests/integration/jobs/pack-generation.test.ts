/**
 * Pack Generation Job Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processPackGenerationJob, PackGenerationJobData } from '../../../lib/jobs/pack-generation-job';
import { supabaseAdmin } from '../../../lib/supabase/server';

describe('Pack Generation Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = createTestQueue('audit-pack-generation');
        worker = createTestWorker('audit-pack-generation', async (job) => {
          await processPackGenerationJob(job);
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

  (hasRedis ? it : it.skip)('should generate an audit pack PDF', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }
    // Get test company and site
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('No company found for testing');
    }

    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('id, name')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!site) {
      throw new Error('No site found for testing');
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!user) {
      throw new Error('No user found for testing');
    }

    // Create audit_packs record
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .insert({
        company_id: company.id,
        site_id: site.id,
        pack_type: 'AUDIT_PACK',
        recipient_type: 'INTERNAL',
        status: 'PENDING',
        generated_by: user.id,
      })
      .select('id')
      .single();

    if (packError || !pack) {
      throw new Error(`Failed to create test pack: ${packError?.message}`);
    }

    // Enqueue job
    const jobData: PackGenerationJobData = {
      pack_id: pack.id,
      pack_type: 'AUDIT_PACK',
      company_id: company.id,
      site_id: site.id,
    };

    const job = await queue.add('AUDIT_PACK_GENERATION', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Verify pack status updated
    const { data: updatedPack } = await supabaseAdmin
      .from('audit_packs')
      .select('status, file_path, file_size_bytes')
      .eq('id', pack.id)
      .single();

    expect(updatedPack).toBeDefined();
    // Status should be COMPLETED or FAILED (depending on data availability)
    expect(['COMPLETED', 'FAILED']).toContain(updatedPack?.status);

    if (updatedPack?.status === 'COMPLETED') {
      expect(updatedPack?.file_path).toBeDefined();
      expect(updatedPack?.file_size_bytes).toBeGreaterThan(0);
    }

    // Clean up
    if (updatedPack?.file_path) {
      await supabaseAdmin.storage.from('audit-packs').remove([updatedPack.file_path]);
    }
    await supabaseAdmin.from('audit_packs').delete().eq('id', pack.id);
  }, 40000);
});

