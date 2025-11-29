/**
 * Excel Import Processing Job
 * Processes Excel/CSV files: Validation → Preview → Bulk Obligation Creation
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 3.2
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import * as XLSX from 'xlsx';
import { getObligationCreator } from '@/lib/ai/obligation-creator';

export interface ExcelImportJobData {
  import_id: string;
  phase: 'VALIDATION' | 'BULK_CREATION';
}

export async function processExcelImportJob(job: Job<ExcelImportJobData>): Promise<void> {
  const { import_id, phase } = job.data;

  try {
    // Get import record
    const { data: excelImport, error: importError } = await supabaseAdmin
      .from('excel_imports')
      .select('*')
      .eq('id', import_id)
      .single();

    if (importError || !excelImport) {
      throw new Error(`Import not found: ${importError?.message || 'Unknown error'}`);
    }

    if (phase === 'VALIDATION') {
      await processValidationPhase(excelImport);
    } else if (phase === 'BULK_CREATION') {
      await processBulkCreationPhase(excelImport);
    } else {
      throw new Error(`Unknown phase: ${phase}`);
    }
  } catch (error: any) {
    console.error(`Excel import job failed: ${import_id}`, error);

    // Update import status
    await supabaseAdmin
      .from('excel_imports')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', import_id);

    throw error; // Re-throw to trigger retry
  }
}

/**
 * Phase 1: Validation & Preview
 */
async function processValidationPhase(excelImport: any): Promise<void> {
  // Download file from storage
  const fileBuffer = await downloadExcelFile(excelImport.storage_path);

  // Parse Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false });

  // Auto-detect column mapping
  const columnMapping = detectColumnMapping(rows[0] as any);

  // Validate each row
  const validRows: any[] = [];
  const errorRows: any[] = [];
  const warningRows: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any;
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header

    const validation = validateRow(row, columnMapping, excelImport);

    if (validation.errors.length > 0) {
      errorRows.push({
        row_number: rowNumber,
        row_data: row,
        errors: validation.errors,
      });
    } else if (validation.warnings.length > 0) {
      warningRows.push({
        row_number: rowNumber,
        row_data: row,
        warnings: validation.warnings,
      });
      validRows.push(validation.validatedRow);
    } else {
      validRows.push(validation.validatedRow);
    }
  }

  // Update import with preview data
  await supabaseAdmin
    .from('excel_imports')
    .update({
      status: 'PENDING_REVIEW',
      valid_rows: validRows,
      error_rows: errorRows,
      warning_rows: warningRows,
      column_mapping: columnMapping,
      valid_count: validRows.length,
      error_count: errorRows.length,
      warning_count: warningRows.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', excelImport.id);

  // Create notification
  await supabaseAdmin.from('notifications').insert({
    user_id: excelImport.user_id,
    company_id: excelImport.company_id,
    site_id: excelImport.site_id,
    recipient_email: excelImport.user_email || null,
    notification_type: 'SYSTEM_ALERT',
    channel: 'EMAIL',
    priority: 'NORMAL',
    subject: 'Excel Import Ready for Review',
    body_text: `Excel import ready for review. ${validRows.length} valid rows, ${errorRows.length} errors, ${warningRows.length} warnings.`,
    entity_type: 'excel_import',
    entity_id: excelImport.id,
    status: 'PENDING',
    scheduled_for: new Date().toISOString(),
  });

  console.log(`Excel import validation completed: ${excelImport.id} - ${validRows.length} valid, ${errorRows.length} errors`);
}

/**
 * Phase 2: Bulk Obligation Creation
 */
async function processBulkCreationPhase(excelImport: any): Promise<void> {
  if (!excelImport.valid_rows || excelImport.valid_rows.length === 0) {
    throw new Error('No valid rows to import');
  }

  const obligationCreator = getObligationCreator();
  const createdObligationIds: string[] = [];
  const errors: string[] = [];

  // Process each valid row
  for (const row of excelImport.valid_rows) {
    try {
      // Create obligation from row data
      const { data: obligation, error: obligationError } = await supabaseAdmin
        .from('obligations')
        .insert({
          site_id: excelImport.site_id,
          company_id: excelImport.company_id,
          document_id: row.document_id || null,
          module_id: excelImport.module_id || null,
          original_text: row.obligation_description || row.obligation_text || row.original_text || '',
          obligation_title: row.obligation_title || row.obligation_summary || row.summary || '',
          obligation_description: row.obligation_description || '',
          category: row.category || 'OPERATIONAL',
          frequency: row.frequency || null,
          deadline_date: row.deadline_date || null,
          deadline_relative: row.deadline_relative || null,
          status: 'ACTIVE',
          review_status: 'AUTO_CONFIRMED',
          confidence_score: 1.0, // Excel imports are 100% confident (user-provided data)
        })
        .select('id')
        .single();

      if (obligationError || !obligation) {
        errors.push(`Row ${row.row_number}: ${obligationError?.message || 'Failed to create obligation'}`);
        continue;
      }

      createdObligationIds.push(obligation.id);

      // Create schedule if frequency specified
      if (row.frequency && row.frequency !== 'ONE_TIME' && row.frequency !== 'EVENT_TRIGGERED') {
        await obligationCreator.createObligations(
          {
            obligations: [
              {
                title: row.obligation_title,
                description: row.obligation_description,
                category: row.category || 'OPERATIONAL',
                frequency: row.frequency,
                confidence_score: 1.0,
                is_subjective: false,
                condition_type: 'STANDARD',
              },
            ],
            metadata: { extraction_confidence: 1.0 },
            ruleLibraryMatches: [],
            usedLLM: false,
            extractionTimeMs: 0,
          },
          row.document_id || excelImport.document_id || '',
          excelImport.site_id,
          excelImport.company_id,
          excelImport.module_id || ''
        );
      }
    } catch (error: any) {
      errors.push(`Row ${row.row_number || 'unknown'}: ${error.message}`);
    }
  }

  // Update import status
  await supabaseAdmin
    .from('excel_imports')
    .update({
      status: 'COMPLETED',
      success_count: createdObligationIds.length,
      error_count: errors.length,
      obligation_ids: createdObligationIds,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', excelImport.id);

  // Create completion notification
  await supabaseAdmin.from('notifications').insert({
    user_id: excelImport.user_id,
    company_id: excelImport.company_id,
    site_id: excelImport.site_id,
    recipient_email: excelImport.user_email || null,
    notification_type: 'SYSTEM_ALERT',
    channel: 'EMAIL',
    priority: 'NORMAL',
    subject: 'Excel Import Completed',
    body_text: `${createdObligationIds.length} obligations imported successfully${errors.length > 0 ? `. ${errors.length} errors occurred.` : '.'}`,
    entity_type: 'excel_import',
    entity_id: excelImport.id,
    status: 'PENDING',
    scheduled_for: new Date().toISOString(),
  });

  console.log(`Excel import bulk creation completed: ${excelImport.id} - ${createdObligationIds.length} obligations created`);
}

/**
 * Download Excel file from Supabase Storage
 */
async function downloadExcelFile(storagePath: string): Promise<Buffer> {
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY).storage;
  const bucket = 'documents'; // Excel files stored in documents bucket
  const path = storagePath.replace(`${bucket}/`, '');

  const { data, error } = await storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(`Failed to download Excel file: ${error?.message || 'Unknown error'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Auto-detect column mapping using fuzzy matching
 */
function detectColumnMapping(headerRow: any): Record<string, string> {
  const mapping: Record<string, string> = {};
  const columnNames = Object.keys(headerRow);

  // Define expected columns and their variations
  const columnVariations: Record<string, string[]> = {
    permit_number: ['permit_number', 'permit_id', 'permit number', 'permit', 'reference'],
    obligation_title: ['obligation_title', 'title', 'obligation title', 'name', 'summary'],
    obligation_description: ['obligation_description', 'description', 'obligation description', 'text', 'details'],
    frequency: ['frequency', 'freq', 'recurrence', 'recurring'],
    deadline_date: ['deadline_date', 'deadline', 'due_date', 'due date', 'next_deadline'],
    site_id: ['site_id', 'site id', 'site', 'site_name', 'site name'],
    category: ['category', 'cat', 'type', 'obligation_category'],
  };

  // Match columns
  for (const [targetColumn, variations] of Object.entries(columnVariations)) {
    for (const columnName of columnNames) {
      const normalizedColumn = columnName.toLowerCase().replace(/[_\s]/g, '');
      for (const variation of variations) {
        if (normalizedColumn.includes(variation.toLowerCase().replace(/[_\s]/g, ''))) {
          mapping[targetColumn] = columnName;
          break;
        }
      }
      if (mapping[targetColumn]) break;
    }
  }

  return mapping;
}

/**
 * Validate a single row
 */
function validateRow(
  row: any,
  columnMapping: Record<string, string>,
  excelImport: any
): {
  validatedRow: any;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validatedRow: any = {};

  // Required fields
  const requiredFields = ['permit_number', 'obligation_title', 'obligation_description'];
  for (const field of requiredFields) {
    const columnName = columnMapping[field];
    if (!columnName || !row[columnName]) {
      errors.push(`Missing required field: ${field}`);
    } else {
      validatedRow[field] = row[columnName];
    }
  }

  // Optional fields
  if (columnMapping.frequency && row[columnMapping.frequency]) {
    const frequency = row[columnMapping.frequency].toUpperCase();
    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'EVENT_TRIGGERED'];
    if (validFrequencies.includes(frequency)) {
      validatedRow.frequency = frequency;
    } else {
      warnings.push(`Invalid frequency: ${frequency}`);
    }
  }

  if (columnMapping.deadline_date && row[columnMapping.deadline_date]) {
    const dateStr = row[columnMapping.deadline_date];
    const parsedDate = parseDate(dateStr);
    if (parsedDate) {
      validatedRow.deadline_date = parsedDate;
    } else {
      errors.push(`Invalid date format: ${dateStr}`);
    }
  }

  if (columnMapping.category && row[columnMapping.category]) {
    const category = row[columnMapping.category].toUpperCase();
    const validCategories = ['MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE'];
    if (validCategories.includes(category)) {
      validatedRow.category = category;
    } else {
      warnings.push(`Invalid category: ${category}`);
    }
  }

  // Site ID validation
  if (!excelImport.site_id) {
    if (columnMapping.site_id && row[columnMapping.site_id]) {
      // TODO: Lookup site by name or ID
      validatedRow.site_id = excelImport.site_id; // Use import's site_id for now
    } else {
      errors.push('Missing site_id');
    }
  } else {
    validatedRow.site_id = excelImport.site_id;
  }

  return { validatedRow, errors, warnings };
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): string | null {
  // Try multiple date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    if (format.test(dateStr)) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        // Try next format
      }
    }
  }

  return null;
}

