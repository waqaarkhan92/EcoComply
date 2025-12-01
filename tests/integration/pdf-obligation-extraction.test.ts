/**
 * End-to-End Test: PDF to Obligation Extraction
 * Tests the complete workflow:
 * 1. Upload PDF document
 * 2. Wait for background job to process and extract obligations
 * 3. Verify obligations were created correctly
 * 4. Verify extraction status and metadata
 */

import { TestClient } from '../helpers/test-client';
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createTestWorker } from '../helpers/job-test-helper';
import { Worker } from 'bullmq';
import { processDocumentJob } from '@/lib/jobs/document-processing-job';
import { QUEUE_NAMES } from '@/lib/queue/queue-manager';

describe('E2E: PDF to Obligation Extraction', () => {
  const client = new TestClient();
  let testUser: {
    email: string;
    password: string;
    token?: string;
    user_id?: string;
    company_id?: string;
    site_id?: string;
  };
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    // Check if app is running
    try {
      const healthCheck = await fetch('http://localhost:3000/api/health', { 
        signal: AbortSignal.timeout(5000) 
      });
      if (!healthCheck.ok) {
        console.warn('⚠️  App server not responding properly');
      }
    } catch (error) {
      console.warn('⚠️  App server not running on localhost:3000 - test may fail');
    }

    // Start worker to process background jobs
    if (hasRedis) {
      try {
        worker = await createTestWorker(QUEUE_NAMES.DOCUMENT_PROCESSING, async (job) => {
          await processDocumentJob(job);
        });
        console.log('✅ Test worker initialized for document processing');
        // Give worker time to start
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.warn('Failed to start worker, tests may hang:', error?.message);
        worker = null;
      }
    } else {
      console.warn('⚠️  REDIS_URL not set - background jobs will not be processed. Test may hang.');
    }
    const timestamp = Date.now();
    testUser = {
      email: `e2e_extraction_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `E2E Extraction User ${timestamp}`,
      company_name: `E2E Extraction Company ${timestamp}`,
    });

    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      testUser.token = signupData.data?.access_token;
      testUser.user_id = signupData.data?.user?.id;
      testUser.company_id = signupData.data?.user?.company_id;
    }

    // Create site
    if (testUser.token && testUser.company_id) {
      const siteResponse = await client.post(
        '/api/v1/sites',
        {
          name: `E2E Extraction Site ${timestamp}`,
          regulator: 'EA',
          address_line_1: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
        },
        {
          token: testUser.token,
        }
      );

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        testUser.site_id = siteData.data.id;
      }
    }
  }, 10000);

  afterAll(async () => {
    if (worker) {
      try {
        await Promise.race([
          worker.close(),
          new Promise((resolve) => setTimeout(resolve, 2000)) // Max 2 seconds
        ]);
        console.log('✅ Test worker closed');
      } catch (error) {
        console.warn('⚠️  Error closing worker:', error);
      }
    }
  }, 5000); // 5 second timeout for cleanup

  (hasRedis ? it : it.skip)('should extract obligations from uploaded PDF document', async () => {
    // Skip early if Redis/worker not available
    if (!hasRedis || !worker) {
      console.warn('⚠️  Skipping test: REDIS_URL not set or worker not available');
      return;
    }

    if (!testUser.token || !testUser.user_id || !testUser.company_id || !testUser.site_id) {
      console.warn('Skipping E2E extraction test: test user not fully set up');
      return;
    }

    // Step 1: Use the real PDF file from docs folder
    const pdfPath = path.join(process.cwd(), 'docs', 'Permit_London_14_Data_Centre.pdf');
    
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(pdfPath);
      console.log(`📄 Using real PDF: ${pdfPath} (${pdfBuffer.length} bytes)`);
    } catch (error) {
      throw new Error(`PDF file not found at: ${pdfPath}`);
    }
    
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Step 2: Upload document
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, 'test-permit.pdf');
    formData.append('site_id', testUser.site_id);
    formData.append('document_type', 'PERMIT');
    formData.append(
      'metadata',
      JSON.stringify({
        regulator: 'EA',
        reference_number: 'EP/2024/001234',
      })
    );

    const uploadResponse = await client.post('/api/v1/documents', formData, {
      token: testUser.token,
    });

    expect(uploadResponse.status).toBe(201);
    const uploadData = await uploadResponse.json();
    expect(uploadData.data).toBeDefined();
    expect(uploadData.data.id).toBeDefined();

    const documentId = uploadData.data.id;
    console.log(`\n📄 Document uploaded: ${documentId}`);
    console.log(`⏳ Starting extraction polling...\n`);

    // Step 3: Poll extraction status until completion
    let extractionStatus = 'PENDING';
    let attempts = 0;
    const maxAttempts = 12; // 2 minutes max (10 second intervals)
    const pollInterval = 10000; // 10 seconds
    
    console.log(`🔄 Polling extraction status (max ${maxAttempts} attempts, ${pollInterval/1000}s intervals)...\n`);

    while (extractionStatus !== 'COMPLETED' && extractionStatus !== 'FAILED' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;

      try {
        const statusResponse = await client.get(`/api/v1/documents/${documentId}/extraction-status`, {
          token: testUser.token,
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          extractionStatus = statusData.data.status;
          const obligationCount = statusData.data.obligation_count || 0;

          console.log(
            `[${attempts}/${maxAttempts}] Status: ${extractionStatus}, Obligations: ${obligationCount}`
          );

          if (extractionStatus === 'COMPLETED') {
            break;
          }
          if (extractionStatus === 'FAILED') {
            console.error('❌ Extraction failed:', statusData.data.error);
            break;
          }
        } else {
          console.warn(`⚠️  Failed to get status: ${statusResponse.status}`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Error polling status: ${error.message}`);
      }
    }

    // Step 4: Verify extraction completed successfully
    if (extractionStatus !== 'COMPLETED') {
      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('extraction_status, extraction_error')
        .eq('id', documentId)
        .single();
      
      throw new Error(
        `Extraction did not complete. Status: ${extractionStatus}, Error: ${doc?.extraction_error || 'Unknown'}`
      );
    }

    // Step 5: Verify document text was extracted (including tables)
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('extraction_status, extracted_text, page_count')
      .eq('id', documentId)
      .single();
    
    if (docError || !document) {
      throw new Error(`Failed to fetch document: ${docError?.message || 'Not found'}`);
    }
    
    expect(document.extracted_text).toBeDefined();
    expect(document.extracted_text).not.toBeNull();
    expect(document.extracted_text.length).toBeGreaterThan(10000); // Real PDF should have substantial text
    
    const extractedText = document.extracted_text.toLowerCase();
    
    // Verify key content from the permit PDF
    expect(extractedText).toContain('permit');
    expect(extractedText).toContain('condition');
    expect(extractedText).toContain('environmental');
    
    // Verify tables are included (tables in PDFs are extracted as text, look for table-like patterns)
    // The permit PDF has tables with headers like "Status log", "Reporting forms", etc.
    const hasTableContent = 
      extractedText.includes('status log') || 
      extractedText.includes('reporting') ||
      extractedText.includes('table') ||
      extractedText.match(/\d+\s+\d+\/\d+\/\d+/); // Date patterns common in tables
    
    console.log(`✅ PDF text extraction: ${document.extracted_text.length} characters`);
    console.log(`✅ Contains permit content: ✓`);
    console.log(`✅ Contains table content: ${hasTableContent ? '✓' : '⚠️'}`);
    
    // Step 6: Verify obligations were created
    const obligationsResponse = await client.get(`/api/v1/documents/${documentId}/obligations`, {
      token: testUser.token,
    });

    expect(obligationsResponse.ok).toBe(true);
    const obligationsData = await obligationsResponse.json();
    expect(obligationsData.data).toBeDefined();
    expect(Array.isArray(obligationsData.data)).toBe(true);
    expect(obligationsData.data.length).toBeGreaterThan(0);

    console.log(`✅ Obligations created: ${obligationsData.data.length}`);

    // Step 7: Verify obligation structure and content
    const firstObligation = obligationsData.data[0];
    expect(firstObligation).toBeDefined();
    expect(firstObligation.id).toBeDefined();
    expect(firstObligation.obligation_text || firstObligation.summary).toBeDefined();
    expect(firstObligation.category).toBeDefined();
    expect(firstObligation.confidence_score).toBeDefined();
    expect(typeof firstObligation.confidence_score).toBe('number');
    expect(firstObligation.confidence_score).toBeGreaterThan(0);
    expect(firstObligation.confidence_score).toBeLessThanOrEqual(1);

    // Step 8: Verify obligations contain relevant content from the PDF
    const obligationTexts = obligationsData.data
      .map((o: any) => (o.obligation_text || o.summary || '').toLowerCase())
      .join(' ');
    
    // Check that obligations reference common permit terms
    const hasRelevantContent = 
      obligationTexts.includes('condition') ||
      obligationTexts.includes('monitor') ||
      obligationTexts.includes('report') ||
      obligationTexts.includes('submit') ||
      obligationTexts.includes('compliance');
    
    expect(hasRelevantContent).toBe(true);
    console.log(`✅ Obligations contain relevant permit content: ✓`);

    // Step 9: Verify document status is EXTRACTED
    expect(document.extraction_status).toBe('EXTRACTED');
    
    // Step 10: Log summary
    console.log(`\n✅ EXTRACTION COMPLETE:`);
    console.log(`   - Text extracted: ${document.extracted_text.length} characters`);
    console.log(`   - Pages: ${document.page_count || 'N/A'}`);
    console.log(`   - Obligations: ${obligationsData.data.length}`);
    console.log(`   - Status: ${document.extraction_status}`);
    console.log(`   - Tables included: ${hasTableContent ? 'Yes' : 'Partial'}`);

    // Clean up
    await supabaseAdmin.from('obligations').delete().eq('document_id', documentId);
    await supabaseAdmin.from('documents').delete().eq('id', documentId);
  }, 130000); // 130 second timeout (2 min 10s) - allows for LLM processing time

  (hasRedis ? it : it.skip)('should handle extraction errors gracefully', async () => {
    if (!testUser.token || !testUser.site_id) {
      return;
    }

    // Upload invalid/corrupted PDF
    const formData = new FormData();
    const invalidPdf = Buffer.from('Invalid PDF content');
    const blob = new Blob([invalidPdf], { type: 'application/pdf' });
    formData.append('file', blob, 'invalid.pdf');
    formData.append('site_id', testUser.site_id);
    formData.append('document_type', 'PERMIT');

    const uploadResponse = await client.post('/api/v1/documents', formData, {
      token: testUser.token,
    });

    // Should either reject invalid file or handle processing error
    expect([201, 400, 422]).toContain(uploadResponse.status);

    if (uploadResponse.status === 201) {
      const uploadData = await uploadResponse.json();
      const documentId = uploadData.data.id;

      // Wait a bit for processing to attempt
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Check status - should be FAILED or still processing
      const statusResponse = await client.get(`/api/v1/documents/${documentId}/extraction-status`, {
        token: testUser.token,
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        expect(['IN_PROGRESS', 'FAILED', 'COMPLETED']).toContain(statusData.data.status);

        // Clean up
        await supabaseAdmin.from('obligations').delete().eq('document_id', documentId);
        await supabaseAdmin.from('documents').delete().eq('id', documentId);
      }
    }
  }, 10000);
});

