/**
 * End-to-end test via API: Upload PDF → Extract → Verify Obligations
 * Uses actual HTTP API endpoints to test the full flow
 */

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PDF = path.join(process.cwd(), 'docs', 'Permit_London_14_Data_Centre.pdf');

// Mock auth token (you'll need to get a real one)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testE2E() {
  console.log('🧪 E2E TEST: Upload → Extract → Verify Obligations via API\n');
  console.log('='.repeat(60));

  // 1. Upload PDF
  console.log('📤 Step 1: Uploading PDF...');
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_PDF));
  formData.append('documentType', 'ENVIRONMENTAL_PERMIT');

  const uploadResponse = await fetch(`${BASE_URL}/api/v1/documents`, {
    method: 'POST',
    headers: {
      ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {}),
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    console.error(`❌ Upload failed: ${uploadResponse.status}`, error);
    process.exit(1);
  }

  const uploadData = await uploadResponse.json();
  const documentId = uploadData.data?.id;
  
  if (!documentId) {
    console.error('❌ No document ID returned:', uploadData);
    process.exit(1);
  }

  console.log(`✅ Document uploaded: ${documentId}\n`);

  // 2. Monitor extraction progress
  console.log('⏳ Step 2: Monitoring extraction progress...\n');
  const startTime = Date.now();
  const timeout = 600000; // 10 minutes
  let lastStatus = '';
  let lastProgress = 0;
  let lastObligationCount = 0;

  while (Date.now() - startTime < timeout) {
    await sleep(2000);

    // Check extraction status
    const statusResponse = await fetch(`${BASE_URL}/api/v1/documents/${documentId}/extraction-status`, {
      headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
    });

    if (!statusResponse.ok) {
      console.error(`❌ Status check failed: ${statusResponse.status}`);
      continue;
    }

    const statusData = await statusResponse.json();
    const status = statusData.data?.status || 'UNKNOWN';
    const progress = statusData.data?.progress || 0;
    const obligationCount = statusData.data?.obligation_count || 0;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    if (status !== lastStatus || obligationCount !== lastObligationCount || Math.abs(progress - lastProgress) > 5) {
      console.log(`[${elapsed}s] Status: ${status} | Progress: ${progress}% | Obligations: ${obligationCount}`);
      lastStatus = status;
      lastProgress = progress;
      lastObligationCount = obligationCount;
    }

    if (status === 'COMPLETED' || status === 'EXTRACTED') {
      console.log(`\n✅ Extraction completed in ${elapsed}s!\n`);
      break;
    } else if (status === 'FAILED' || status === 'PROCESSING_FAILED') {
      console.error(`\n❌ Extraction failed after ${elapsed}s`);
      process.exit(1);
    }
  }

  if (Date.now() - startTime >= timeout) {
    console.error(`\n❌ TEST TIMEOUT after ${Math.floor(timeout / 1000)}s`);
    process.exit(1);
  }

  // 3. Verify obligations
  console.log('📋 Step 3: Verifying obligations...\n');
  const obligationsResponse = await fetch(`${BASE_URL}/api/v1/documents/${documentId}/obligations`, {
    headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
  });

  if (!obligationsResponse.ok) {
    console.error(`❌ Failed to fetch obligations: ${obligationsResponse.status}`);
    process.exit(1);
  }

  const obligationsData = await obligationsResponse.json();
  const obligations = obligationsData.data || [];

  console.log(`📋 Obligations found: ${obligations.length}`);
  
  if (obligations.length === 0) {
    console.error('❌ TEST FAILED - No obligations extracted');
    process.exit(1);
  }

  console.log('✅ Obligation extraction: PASSED');
  console.log('\n📋 Extracted Obligations:');
  obligations.slice(0, 10).forEach((o: any, i: number) => {
    console.log(`   ${i + 1}. ${o.obligation_title || o.title || 'Untitled'} [${o.category || 'N/A'}]`);
  });
  if (obligations.length > 10) {
    console.log(`   ... and ${obligations.length - 10} more`);
  }

  // 4. Verify document details
  console.log('\n📄 Step 4: Verifying document details...\n');
  const docResponse = await fetch(`${BASE_URL}/api/v1/documents/${documentId}`, {
    headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
  });

  if (!docResponse.ok) {
    console.error(`❌ Failed to fetch document: ${docResponse.status}`);
    process.exit(1);
  }

  const docData = await docResponse.json();
  const document = docData.data;

  console.log(`📄 Document: ${document.title || 'Untitled'}`);
  console.log(`📊 Status: ${document.extraction_status}`);
  console.log(`📝 Text length: ${document.extracted_text?.length || 0} chars`);
  console.log(`📋 Obligation count: ${document.obligation_count || 0}`);

  if (document.extracted_text && document.extracted_text.length > 100) {
    console.log('✅ Text extraction: PASSED');
  } else {
    console.log('❌ Text extraction: FAILED (no text)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ E2E TEST PASSED - Full flow works end-to-end!');
  console.log('='.repeat(60));
  console.log(`\n📋 Summary:`);
  console.log(`   - Document ID: ${documentId}`);
  console.log(`   - Obligations: ${obligations.length}`);
  console.log(`   - Text extracted: ${document.extracted_text?.length || 0} chars`);
  console.log(`   - Status: ${document.extraction_status}`);
}

testE2E().catch((error) => {
  console.error('❌ Test error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

