/**
 * Quick extraction tests with 10 second timeouts
 */

import { TestClient } from './helpers/test-client';
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createTestWorker } from './helpers/job-test-helper';
import { Worker } from 'bullmq';
import { processDocumentJob } from '@/lib/jobs/document-processing-job';
import { QUEUE_NAMES } from '@/lib/queue/queue-manager';

describe('Quick Extraction Tests', () => {
  const client = new TestClient();
  let testUser: any;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      worker = await createTestWorker(QUEUE_NAMES.DOCUMENT_PROCESSING, async (job) => {
        await processDocumentJob(job);
      });
    }

    const timestamp = Date.now();
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: `quick_test_${timestamp}@example.com`,
      password: 'TestPassword123!',
      full_name: `Quick Test User ${timestamp}`,
      company_name: `Quick Test Company ${timestamp}`,
    });

    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      testUser = {
        token: signupData.data?.access_token,
        user_id: signupData.data?.user?.id,
        company_id: signupData.data?.user?.company_id,
      };

      const siteResponse = await client.post('/api/v1/sites', {
        name: `Quick Test Site ${timestamp}`,
        regulator: 'EA',
        address_line_1: '123 Test St',
        city: 'London',
        postcode: 'SW1A 1AA',
      }, { token: testUser.token });

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        testUser.site_id = siteData.data.id;
      }
    }
  }, 5000);

  afterAll(async () => {
    if (worker) await worker.close();
  }, 2000);

  it('should extract text from PDF (10s timeout)', async () => {
    if (!hasRedis || !worker || !testUser?.site_id) {
      console.log('⚠️  Skipping: Redis/worker not available');
      return;
    }

    const pdfPath = path.join(process.cwd(), 'docs', 'Permit_London_14_Data_Centre.pdf');
    const pdfBuffer = await fs.readFile(pdfPath);

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'permit.pdf');
    formData.append('site_id', testUser.site_id);
    formData.append('document_type', 'PERMIT');

    const uploadResponse = await client.post('/api/v1/documents', formData, {
      token: testUser.token,
    });

    expect(uploadResponse.status).toBe(201);
    const uploadData = await uploadResponse.json();
    const documentId = uploadData.data.id;

    // Wait max 10 seconds for extraction
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('extraction_status, extracted_text')
        .eq('id', documentId)
        .single();

      if (doc?.extracted_text && doc.extracted_text.length > 100) {
        expect(doc.extracted_text.length).toBeGreaterThan(100);
        expect(doc.extracted_text.toLowerCase()).toContain('permit');
        console.log(`✅ Text extracted: ${doc.extracted_text.length} chars`);
        return;
      }
    }

    throw new Error('Text extraction timed out after 10 seconds');
  }, 12000);

  it('should extract obligations from PDF (10s timeout)', async () => {
    if (!hasRedis || !worker || !testUser?.site_id) {
      console.log('⚠️  Skipping: Redis/worker not available');
      return;
    }

    const pdfPath = path.join(process.cwd(), 'docs', 'Permit_London_14_Data_Centre.pdf');
    const pdfBuffer = await fs.readFile(pdfPath);

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'permit.pdf');
    formData.append('site_id', testUser.site_id);
    formData.append('document_type', 'PERMIT');

    const uploadResponse = await client.post('/api/v1/documents', formData, {
      token: testUser.token,
    });

    const uploadData = await uploadResponse.json();
    const documentId = uploadData.data.id;

    // Wait max 10 seconds for obligations
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: obligations } = await supabaseAdmin
        .from('obligations')
        .select('id, obligation_title')
        .eq('document_id', documentId);

      if (obligations && obligations.length > 0) {
        expect(obligations.length).toBeGreaterThan(0);
        console.log(`✅ Obligations extracted: ${obligations.length}`);
        return;
      }
    }

    throw new Error('Obligation extraction timed out after 10 seconds');
  }, 12000);
});

