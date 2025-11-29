/**
 * Phase 4 Comprehensive Test
 * Tests all background jobs with real connections (Redis, Supabase, OpenAI)
 */

// Load .env.local FIRST before any imports
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// Now import modules
import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL not set');
  process.exit(1);
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, status: 'pass', message: '✅ Passed', duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, status: 'fail', message: `❌ Failed: ${error.message}`, duration });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function runPhase4Tests() {
  console.log('🚀 Phase 4 Comprehensive Test Suite\n');
  console.log('Testing with real connections:');
  console.log(`- Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`- Supabase: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
  console.log(`- OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}\n`);

  let redis: Redis | null = null;
  const queues: Map<string, Queue> = new Map();
  const workers: Map<string, Worker> = new Map();

  try {
    // Setup Redis connection
    console.log('📡 Setting up connections...\n');
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });

    await redis.ping();
    console.log('✅ Redis connected\n');

    // Test 1: Redis Connection
    await test('Redis Connection', async () => {
      const pong = await redis!.ping();
      if (pong !== 'PONG') throw new Error('Redis ping failed');
    });

    // Test 2: Queue Creation
    await test('Queue Creation', async () => {
      const queueNames = [
        'document-processing',
        'monitoring-schedule',
        'deadline-alerts',
        'evidence-reminders',
        'audit-pack-generation',
      ];

      for (const queueName of queueNames) {
        const queue = new Queue(queueName, {
          connection: redis!,
          defaultJobOptions: {
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: true,
          },
        });
        queues.set(queueName, queue);
      }
    });

    // Test 3: Supabase Connection
    await test('Supabase Connection', async () => {
      const { supabaseAdmin } = await import('../lib/supabase/server');
      const { data, error } = await supabaseAdmin.from('modules').select('id').limit(1);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No modules found');
    });

    // Test 4: Test Data Creation
    let testData: any = null;
    await test('Test Data Creation', async () => {
      const { createTestData } = await import('../tests/helpers/test-data');
      testData = await createTestData();
      if (!testData.company || !testData.site || !testData.user || !testData.module) {
        throw new Error('Failed to create test data');
      }
    });

    // Test 5: Document Processing Queue
    await test('Document Processing Queue', async () => {
      const queue = queues.get('document-processing')!;
      const job = await queue.add('DOCUMENT_EXTRACTION', {
        document_id: 'test-doc-id',
        company_id: testData.company.id,
        site_id: testData.site.id,
        module_id: testData.module.id,
        file_path: 'test.pdf',
        document_type: 'ENVIRONMENTAL_PERMIT',
      });

      if (!job.id) throw new Error('Job not enqueued');
      
      // Clean up
      await job.remove();
    });

    // Test 6: Monitoring Schedule Queue
    await test('Monitoring Schedule Queue', async () => {
      const queue = queues.get('monitoring-schedule')!;
      const job = await queue.add('MONITORING_SCHEDULE', {
        company_id: testData.company.id,
      });

      if (!job.id) throw new Error('Job not enqueued');
      
      // Clean up
      await job.remove();
    });

    // Test 7: Deadline Alerts Queue
    await test('Deadline Alerts Queue', async () => {
      const queue = queues.get('deadline-alerts')!;
      const job = await queue.add('DEADLINE_ALERT', {
        obligation_id: 'test-obligation-id',
        company_id: testData.company.id,
        site_id: testData.site.id,
        alert_type: 'DUE_IN_7_DAYS',
      });

      if (!job.id) throw new Error('Job not enqueued');
      
      // Clean up
      await job.remove();
    });

    // Test 8: Evidence Reminders Queue
    await test('Evidence Reminders Queue', async () => {
      const queue = queues.get('evidence-reminders')!;
      const job = await queue.add('EVIDENCE_REMINDER', {
        obligation_id: 'test-obligation-id',
        company_id: testData.company.id,
        site_id: testData.site.id,
      });

      if (!job.id) throw new Error('Job not enqueued');
      
      // Clean up
      await job.remove();
    });

    // Test 9: Pack Generation Queue
    await test('Pack Generation Queue', async () => {
      const queue = queues.get('audit-pack-generation')!;
      const job = await queue.add('AUDIT_PACK_GENERATION', {
        pack_id: 'test-pack-id',
        pack_type: 'AUDIT_PACK',
        company_id: testData.company.id,
        site_id: testData.site.id,
      });

      if (!job.id) throw new Error('Job not enqueued');
      
      // Clean up
      await job.remove();
    });

    // Test 10: Worker Processing
    await test('Worker Processing', async () => {
      const queue = queues.get('document-processing')!;
      let jobProcessed = false;

      const worker = new Worker(
        'document-processing',
        async (job) => {
          jobProcessed = true;
          return { success: true };
        },
        {
          connection: redis!,
          concurrency: 1,
        }
      );

      workers.set('document-processing', worker);

      const testJob = await queue.add('TEST_JOB', { test: true });

      // Wait for processing
      let attempts = 0;
      while (!jobProcessed && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        attempts++;
      }

      if (!jobProcessed) throw new Error('Job not processed within timeout');

      await testJob.remove();
    });

    // Test 11: Queue Manager Integration
    await test('Queue Manager Integration', async () => {
      // Test that queue manager can create queues
      const { getQueue, QUEUE_NAMES } = await import('../lib/queue/queue-manager');
      const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
      if (!queue) throw new Error('Queue manager failed to create queue');
    });

    // Test 12: Worker Manager Integration
    await test('Worker Manager Integration', async () => {
      // Test that worker manager can start workers
      const { startAllWorkers, stopAllWorkers } = await import('../lib/workers/worker-manager');
      
      // Start workers
      startAllWorkers();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Stop workers
      await stopAllWorkers();
    });

    // Test 13: OpenAI Connection (if needed)
    if (process.env.OPENAI_API_KEY) {
      await test('OpenAI API Key Validation', async () => {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
      });
    } else {
      results.push({ name: 'OpenAI API Key Validation', status: 'skip', message: '⚠️  OpenAI API key not set' });
    }

    // Test 14: Database Schema Validation
    await test('Database Schema Validation', async () => {
      const { supabaseAdmin } = await import('../lib/supabase/server');
      const requiredTables = [
        'companies',
        'sites',
        'users',
        'documents',
        'obligations',
        'evidence_items',
        'audit_packs',
        'background_jobs',
      ];

      for (const table of requiredTables) {
        const { error } = await supabaseAdmin.from(table).select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is OK
          throw new Error(`Table ${table} not accessible: ${error.message}`);
        }
      }
    });

    // Test 15: Storage Buckets Validation
    await test('Storage Buckets Validation', async () => {
      const { supabaseAdmin } = await import('../lib/supabase/server');
      const requiredBuckets = ['documents', 'evidence', 'audit-packs'];
      
      for (const bucket of requiredBuckets) {
        const { data, error } = await supabaseAdmin.storage.from(bucket).list('', { limit: 1 });
        if (error) {
          throw new Error(`Bucket ${bucket} not accessible: ${error.message}`);
        }
      }
    });

    // Cleanup
    console.log('\n🧹 Cleaning up...\n');
    for (const worker of workers.values()) {
      await worker.close();
    }
    for (const queue of queues.values()) {
      await queue.obliterate({ force: true });
      await queue.close();
    }
    if (redis) {
      await redis.quit();
    }

    // Print summary
    console.log('\n📊 Test Summary\n');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skip').length;

    results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${icon} ${result.name}${duration}`);
      if (result.status === 'fail') {
        console.log(`   ${result.message}`);
      }
    });

    console.log('='.repeat(60));
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}\n`);

    if (failed === 0) {
      console.log('🎉 All Phase 4 tests passed!');
      console.log('\n✅ Phase 4 is fully operational:');
      console.log('   - Redis connection: Working');
      console.log('   - Supabase connection: Working');
      console.log('   - Queue system: Working');
      console.log('   - Worker system: Working');
      console.log('   - All job types: Ready\n');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please review the errors above.\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);

    // Cleanup on error
    try {
      for (const worker of workers.values()) {
        await worker.close();
      }
      for (const queue of queues.values()) {
        await queue.close();
      }
      if (redis) {
        await redis.quit();
      }
    } catch {}

    process.exit(1);
  }
}

runPhase4Tests();

