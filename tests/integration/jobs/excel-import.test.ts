/**
 * Excel Import Processing Job Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processExcelImportJob, ExcelImportJobData } from '../../../lib/jobs/excel-import-job';
import { supabaseAdmin } from '../../../lib/supabase/server';
import * as XLSX from 'xlsx';

describe('Excel Import Processing Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = createTestQueue('document-processing');
        worker = createTestWorker('document-processing', async (job) => {
          if (job.name === 'EXCEL_IMPORT_PROCESSING') {
            await processExcelImportJob(job);
          }
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

  (hasRedis ? it : it.skip)('should validate Excel file and create preview (Phase 1)', async () => {
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

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!user) {
      throw new Error('No user found for testing');
    }

    // Create a test Excel file
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['permit_number', 'obligation_title', 'obligation_description', 'frequency', 'deadline_date'],
      ['EPR/12345', 'Test Obligation 1', 'Description 1', 'MONTHLY', '2025-12-31'],
      ['EPR/12345', 'Test Obligation 2', 'Description 2', 'WEEKLY', '2025-12-31'],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Upload to storage
    const fileName = `test-import-${Date.now()}.xlsx`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload test Excel: ${uploadError.message}`);
    }

    // Create excel_imports record
    const { data: excelImport, error: importError } = await supabaseAdmin
      .from('excel_imports')
      .insert({
        user_id: user.id,
        company_id: company.id,
        site_id: site.id,
        file_name: fileName,
        file_size_bytes: excelBuffer.length,
        storage_path: fileName,
        file_format: 'XLSX',
        row_count: 2,
        status: 'PENDING',
        import_options: {},
      })
      .select('id')
      .single();

    if (importError || !excelImport) {
      throw new Error(`Failed to create test import: ${importError?.message}`);
    }

    // Enqueue validation phase job
    const jobData: ExcelImportJobData = {
      import_id: excelImport.id,
      phase: 'VALIDATION',
    };

    const job = await queue.add('EXCEL_IMPORT_PROCESSING', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Verify import status updated
    const { data: updatedImport } = await supabaseAdmin
      .from('excel_imports')
      .select('status, valid_count, error_count, valid_rows')
      .eq('id', excelImport.id)
      .single();

    expect(updatedImport).toBeDefined();
    expect(updatedImport?.status).toBe('PENDING_REVIEW');
    expect(updatedImport?.valid_count).toBeGreaterThanOrEqual(0);
    expect(updatedImport?.valid_rows).toBeDefined();

    // Clean up
    await supabaseAdmin.storage.from('documents').remove([fileName]);
    await supabaseAdmin.from('excel_imports').delete().eq('id', excelImport.id);
  }, 40000);
});

