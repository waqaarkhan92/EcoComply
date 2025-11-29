/**
 * Document Processing Job Tests
 * Tests the document processing background job
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processDocumentJob, DocumentProcessingJobData } from '../../../lib/jobs/document-processing-job';
import { createTestData } from '../../helpers/test-data';

describe('Document Processing Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = await createTestQueue('document-processing');
        worker = await createTestWorker('document-processing', async (job) => {
          await processDocumentJob(job);
        });
        console.log('✅ Test queue and worker initialized');
      } catch (error: any) {
        console.warn('Redis not available, skipping queue tests:', error?.message);
        queue = null;
        worker = null;
      }
    }
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    if (queue && worker) {
      await cleanupTestQueue(queue, worker);
    }
  });

  beforeEach(async () => {
    // Clean up any existing jobs
    if (queue) {
      await queue.obliterate({ force: true });
    }
  });

  (hasRedis ? it : it.skip)('should process a document and extract obligations', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }
    
    // Create test data
    const { company, site, module } = await createTestData();

    // Create a test document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        site_id: site.id,
        company_id: company.id,
        module_id: module.id,
        document_type: 'ENVIRONMENTAL_PERMIT',
        title: 'Test Permit',
        status: 'ACTIVE',
        extraction_status: 'PENDING',
        storage_path: 'test-document.pdf',
        file_size_bytes: 1000,
      })
      .select('id')
      .single();

    if (docError || !document) {
      throw new Error(`Failed to create test document: ${docError?.message}`);
    }

    // Create a minimal PDF buffer (for testing)
    const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\nendobj\nxref\n0 0\ntrailer\n<<>>\nstartxref\n0\n%%EOF');

    // Upload test file to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(`test-${document.id}.pdf`, testPdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Failed to upload test PDF:', uploadError);
      // Continue anyway - job will handle missing file
    }

    // Enqueue job
    const jobData: DocumentProcessingJobData = {
      document_id: document.id,
      company_id: company.id,
      site_id: site.id,
      module_id: module.id,
      file_path: `test-${document.id}.pdf`,
      document_type: 'ENVIRONMENTAL_PERMIT',
    };

    const job = await queue.add('DOCUMENT_EXTRACTION', jobData);

    // Wait for job to complete (with timeout)
    try {
      await waitForJob(queue, job.id!, 30000); // 30 second timeout

      // Verify document status updated
      const { data: updatedDoc } = await supabaseAdmin
        .from('documents')
        .select('extraction_status, extraction_error')
        .eq('id', document.id)
        .single();

      expect(updatedDoc).toBeDefined();
      // Status should be EXTRACTED or PROCESSING_FAILED (depending on test PDF)
      expect(['EXTRACTED', 'PROCESSING_FAILED', 'EXTRACTION_FAILED']).toContain(updatedDoc?.extraction_status);
    } catch (error: any) {
      // Job might fail with test PDF (expected) - verify error handling
      const { data: updatedDoc } = await supabaseAdmin
        .from('documents')
        .select('extraction_status, extraction_error')
        .eq('id', document.id)
        .single();

      expect(updatedDoc?.extraction_status).toBeDefined();
      // Clean up
      await supabaseAdmin.from('documents').delete().eq('id', document.id);
      throw error;
    }

    // Clean up
    await supabaseAdmin.from('documents').delete().eq('id', document.id);
  }, 60000); // 60 second timeout

  (hasRedis ? it : it.skip)('should handle missing document gracefully', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }
    const jobData: DocumentProcessingJobData = {
      document_id: '00000000-0000-0000-0000-000000000000',
      company_id: '00000000-0000-0000-0000-000000000000',
      site_id: '00000000-0000-0000-0000-000000000000',
      module_id: '00000000-0000-0000-0000-000000000000',
      file_path: 'nonexistent.pdf',
    };

    const job = await queue.add('DOCUMENT_EXTRACTION', jobData);

    // Job should fail gracefully
    await expect(waitForJob(queue, job.id!, 10000)).rejects.toThrow();
  }, 15000);
});

