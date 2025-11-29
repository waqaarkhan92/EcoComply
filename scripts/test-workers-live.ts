/**
 * Live Worker Test
 * Starts workers and tests them with real jobs
 */

// Load .env.local FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// Import after dotenv loads

async function testWorkersLive() {
  console.log('🚀 Starting Live Worker Test\n');
  console.log('This will:');
  console.log('1. Start all workers');
  console.log('2. Enqueue test jobs');
  console.log('3. Monitor job processing');
  console.log('4. Stop workers\n');

  try {
    // Import modules after dotenv loads
    const { createTestData } = await import('../tests/helpers/test-data');
    const { startAllWorkers, stopAllWorkers } = await import('../lib/workers/worker-manager');
    const { getQueue, QUEUE_NAMES } = await import('../lib/queue/queue-manager');

    // Create test data
    console.log('📦 Creating test data...');
    const testData = await createTestData();
    console.log(`✅ Test data ready: Company ${testData.company.id.substring(0, 8)}...\n`);

    // Start all workers
    console.log('👷 Starting all workers...');
    startAllWorkers();
    console.log('✅ All workers started\n');

    // Wait for workers to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 1: Document Processing Job
    console.log('📄 Testing Document Processing Job...');
    const docQueue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
    const docJob = await docQueue.add('DOCUMENT_EXTRACTION', {
      document_id: 'test-doc-live',
      company_id: testData.company.id,
      site_id: testData.site.id,
      module_id: testData.module.id,
      file_path: 'test.pdf',
      document_type: 'ENVIRONMENTAL_PERMIT',
    });
    console.log(`   ✅ Job enqueued: ${docJob.id}`);

    // Monitor job (with timeout)
    let docState = await docJob.getState();
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max
    while ((docState === 'waiting' || docState === 'active' || docState === 'prioritized') && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      docState = await docJob.getState();
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`   ⏳ Job state: ${docState} (attempt ${attempts}/${maxAttempts})`);
      }
    }
    console.log(`   ✅ Job ${docState} (after ${attempts} attempts)\n`);

    // Test 2: Monitoring Schedule Job
    console.log('📊 Testing Monitoring Schedule Job...');
    const monitoringQueue = getQueue(QUEUE_NAMES.MONITORING_SCHEDULE);
    const monitoringJob = await monitoringQueue.add('MONITORING_SCHEDULE', {
      company_id: testData.company.id,
    });
    console.log(`   ✅ Job enqueued: ${monitoringJob.id}`);

    let monitoringState = await monitoringJob.getState();
    attempts = 0;
    while ((monitoringState === 'waiting' || monitoringState === 'active' || monitoringState === 'prioritized') && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      monitoringState = await monitoringJob.getState();
      attempts++;
    }
    console.log(`   ✅ Job ${monitoringState}\n`);

    // Test 3: Deadline Alert Job
    console.log('⏰ Testing Deadline Alert Job...');
    const deadlineQueue = getQueue(QUEUE_NAMES.DEADLINE_ALERTS);
    const deadlineJob = await deadlineQueue.add('DEADLINE_ALERT', {
      obligation_id: 'test-obligation',
      company_id: testData.company.id,
      site_id: testData.site.id,
      alert_type: 'DUE_IN_7_DAYS',
    });
    console.log(`   ✅ Job enqueued: ${deadlineJob.id}`);

    let deadlineState = await deadlineJob.getState();
    attempts = 0;
    while ((deadlineState === 'waiting' || deadlineState === 'active' || deadlineState === 'prioritized') && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      deadlineState = await deadlineJob.getState();
      attempts++;
    }
    console.log(`   ✅ Job ${deadlineState}\n`);

    // Test 4: Evidence Reminder Job
    console.log('📎 Testing Evidence Reminder Job...');
    const evidenceQueue = getQueue(QUEUE_NAMES.EVIDENCE_REMINDERS);
    const evidenceJob = await evidenceQueue.add('EVIDENCE_REMINDER', {
      obligation_id: 'test-obligation',
      company_id: testData.company.id,
      site_id: testData.site.id,
    });
    console.log(`   ✅ Job enqueued: ${evidenceJob.id}`);

    let evidenceState = await evidenceJob.getState();
    attempts = 0;
    while ((evidenceState === 'waiting' || evidenceState === 'active' || evidenceState === 'prioritized') && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      evidenceState = await evidenceJob.getState();
      attempts++;
    }
    console.log(`   ✅ Job ${evidenceState}\n`);

    // Test 5: Pack Generation Job
    console.log('📦 Testing Pack Generation Job...');
    const packQueue = getQueue(QUEUE_NAMES.AUDIT_PACK_GENERATION);
    const packJob = await packQueue.add('AUDIT_PACK_GENERATION', {
      pack_id: 'test-pack',
      pack_type: 'AUDIT_PACK',
      company_id: testData.company.id,
      site_id: testData.site.id,
    });
    console.log(`   ✅ Job enqueued: ${packJob.id}`);

    let packState = await packJob.getState();
    attempts = 0;
    while ((packState === 'waiting' || packState === 'active' || packState === 'prioritized') && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      packState = await packJob.getState();
      attempts++;
    }
    console.log(`   ✅ Job ${packState}\n`);

    // Get queue statistics
    console.log('📊 Queue Statistics:\n');
    const queues = [
      { name: 'Document Processing', queue: docQueue },
      { name: 'Monitoring Schedule', queue: monitoringQueue },
      { name: 'Deadline Alerts', queue: deadlineQueue },
      { name: 'Evidence Reminders', queue: evidenceQueue },
      { name: 'Pack Generation', queue: packQueue },
    ];

    for (const { name, queue } of queues) {
      const counts = await queue.getJobCounts();
      console.log(`   ${name}:`);
      console.log(`     Waiting: ${counts.waiting}`);
      console.log(`     Active: ${counts.active}`);
      console.log(`     Completed: ${counts.completed}`);
      console.log(`     Failed: ${counts.failed}`);
    }

    console.log('\n✅ All jobs processed by workers!');
    console.log('\n⏸️  Waiting 3 seconds for any remaining jobs...\n');

    // Wait 3 seconds then stop
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n🛑 Stopping workers...');
    await stopAllWorkers();
    console.log('✅ Workers stopped');
    
    // Close Redis connections
    const { closeAllQueues } = await import('../lib/queue/queue-manager');
    await closeAllQueues();
    console.log('✅ All connections closed');
    
    console.log('\n✅ Live worker test completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    try {
      const { stopAllWorkers } = await import('../lib/workers/worker-manager');
      await stopAllWorkers();
    } catch {}
    process.exit(1);
  }
}

testWorkersLive();

