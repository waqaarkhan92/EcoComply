/**
 * Obligation Creator
 * Creates obligations from LLM extraction results
 * Reference: docs/specs/30_Product_Business_Logic.md Section B.2.3
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { ExtractionResult } from './document-processor';

export interface ObligationCreationResult {
  obligationsCreated: number;
  schedulesCreated: number;
  deadlinesCreated: number;
  reviewQueueItemsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

export class ObligationCreator {
  /**
   * Create obligations from extraction result
   */
  async createObligations(
    extractionResult: ExtractionResult,
    documentId: string,
    siteId: string,
    companyId: string,
    moduleId: string
  ): Promise<ObligationCreationResult> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const result: ObligationCreationResult = {
      obligationsCreated: 0,
      schedulesCreated: 0,
      deadlinesCreated: 0,
      reviewQueueItemsCreated: 0,
      duplicatesSkipped: 0,
      errors: [],
    };

    for (const obligationData of extractionResult.obligations) {
      try {
        // Step 1: Validate obligation data
        if (!this.validateObligation(obligationData)) {
          result.errors.push(`Invalid obligation: ${obligationData.title || 'Unknown'}`);
          continue;
        }

        // Step 2: Check for duplicates (80% text similarity)
        const isDuplicate = await this.checkDuplicate(
          supabase,
          documentId,
          obligationData.description || obligationData.title
        );

        if (isDuplicate) {
          result.duplicatesSkipped++;
          continue;
        }

        // Step 3: Create obligation record
        const { data: obligation, error: obligationError } = await supabase
          .from('obligations')
          .insert({
            document_id: documentId,
            site_id: siteId,
            company_id: companyId,
            module_id: moduleId,
            obligation_text: obligationData.description || obligationData.title,
            summary: obligationData.title,
            category: obligationData.category,
            frequency: obligationData.frequency || null,
            deadline_date: obligationData.deadline_date || null,
            deadline_relative: obligationData.deadline_relative || null,
            is_subjective: obligationData.is_subjective || false,
            is_improvement: obligationData.is_improvement || false,
            confidence_score: obligationData.confidence_score || 0.7,
            condition_reference: obligationData.condition_reference || null,
            condition_type: obligationData.condition_type || 'STANDARD',
            page_reference: obligationData.page_reference || null,
            status: 'ACTIVE',
            review_status: obligationData.confidence_score < 0.7 ? 'PENDING_REVIEW' : 'AUTO_CONFIRMED',
          })
          .select()
          .single();

        if (obligationError || !obligation) {
          result.errors.push(`Failed to create obligation: ${obligationError?.message || 'Unknown error'}`);
          continue;
        }

        result.obligationsCreated++;

        // Step 4: Create schedules (if frequency specified)
        if (obligationData.frequency && obligationData.frequency !== 'ONE_TIME' && obligationData.frequency !== 'EVENT_TRIGGERED') {
          const scheduleResult = await this.createSchedule(
            supabase,
            obligation.id,
            obligationData.frequency
          );
          if (scheduleResult) {
            result.schedulesCreated++;
          }
        }

        // Step 5: Create deadlines (calculate from frequency)
        if (obligationData.frequency || obligationData.deadline_date || obligationData.deadline_relative) {
          const deadlineResult = await this.createDeadline(
            supabase,
            obligation.id,
            obligationData.frequency,
            obligationData.deadline_date,
            obligationData.deadline_relative
          );
          if (deadlineResult) {
            result.deadlinesCreated++;
          }
        }

        // Step 6: Flag low-confidence items (<70%) for review
        if (obligationData.confidence_score < 0.7) {
          const reviewResult = await this.createReviewQueueItem(
            supabase,
            obligation.id,
            documentId,
            companyId,
            'LOW_CONFIDENCE_EXTRACTION'
          );
          if (reviewResult) {
            result.reviewQueueItemsCreated++;
          }
        }
      } catch (error: any) {
        result.errors.push(`Error processing obligation: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Validate obligation data
   */
  private validateObligation(obligation: any): boolean {
    if (!obligation.title && !obligation.description && !obligation.text) {
      return false; // Must have at least one text field
    }

    if (obligation.category && !['MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE'].includes(obligation.category)) {
      return false; // Invalid category
    }

    if (obligation.confidence_score !== undefined) {
      if (obligation.confidence_score < 0 || obligation.confidence_score > 1) {
        return false; // Invalid confidence score
      }
    }

    return true;
  }

  /**
   * Check for duplicate obligations (80% text similarity)
   */
  private async checkDuplicate(
    supabase: any,
    documentId: string,
    text: string
  ): Promise<boolean> {
    // Get all existing obligations for this document
    const { data: existingObligations } = await supabase
      .from('obligations')
      .select('obligation_text')
      .eq('document_id', documentId);

    if (!existingObligations || existingObligations.length === 0) {
      return false;
    }

    // Calculate similarity using simple word overlap (for now)
    // TODO: Use proper text similarity algorithm (Levenshtein, Jaccard, etc.)
    const textWords = new Set(text.toLowerCase().split(/\s+/));
    
    for (const existing of existingObligations) {
      const existingWords = new Set(existing.obligation_text.toLowerCase().split(/\s+/));
      const intersection = new Set([...textWords].filter(x => existingWords.has(x)));
      const union = new Set([...textWords, ...existingWords]);
      const similarity = intersection.size / union.size;

      if (similarity >= 0.8) {
        return true; // 80% similarity threshold
      }
    }

    return false;
  }

  /**
   * Create schedule for recurring obligation
   */
  private async createSchedule(
    supabase: any,
    obligationId: string,
    frequency: string
  ): Promise<boolean> {
    const frequencyMap: Record<string, { interval_days: number; interval_months: number }> = {
      DAILY: { interval_days: 1, interval_months: 0 },
      WEEKLY: { interval_days: 7, interval_months: 0 },
      MONTHLY: { interval_days: 0, interval_months: 1 },
      QUARTERLY: { interval_days: 0, interval_months: 3 },
      ANNUAL: { interval_days: 0, interval_months: 12 },
      CONTINUOUS: { interval_days: 0, interval_months: 0 },
    };

    const interval = frequencyMap[frequency];
    if (!interval) {
      return false;
    }

    const { error } = await supabase
      .from('schedules')
      .insert({
        obligation_id: obligationId,
        frequency: frequency,
        interval_days: interval.interval_days,
        interval_months: interval.interval_months,
        is_active: true,
      });

    return !error;
  }

  /**
   * Create deadline for obligation
   */
  private async createDeadline(
    supabase: any,
    obligationId: string,
    frequency?: string | null,
    deadlineDate?: string | null,
    deadlineRelative?: string | null
  ): Promise<boolean> {
    let calculatedDate: string | null = null;

    if (deadlineDate) {
      calculatedDate = deadlineDate;
    } else if (deadlineRelative) {
      // Parse relative deadline (e.g., "within 14 days", "by end of month")
      // TODO: Implement proper relative date parsing
      calculatedDate = null; // For now, skip relative date parsing
    } else if (frequency) {
      // Calculate deadline from frequency (e.g., monthly = next month)
      const now = new Date();
      if (frequency === 'MONTHLY') {
        now.setMonth(now.getMonth() + 1);
      } else if (frequency === 'QUARTERLY') {
        now.setMonth(now.getMonth() + 3);
      } else if (frequency === 'ANNUAL') {
        now.setFullYear(now.getFullYear() + 1);
      }
      calculatedDate = now.toISOString().split('T')[0];
    }

    if (!calculatedDate) {
      return false; // No deadline to create
    }

    const { error } = await supabase
      .from('deadlines')
      .insert({
        obligation_id: obligationId,
        due_date: calculatedDate,
        status: 'UPCOMING',
        is_active: true,
      });

    return !error;
  }

  /**
   * Create review queue item for low-confidence extraction
   */
  private async createReviewQueueItem(
    supabase: any,
    obligationId: string,
    documentId: string,
    companyId: string,
    reviewType: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('review_queue_items')
      .insert({
        obligation_id: obligationId,
        document_id: documentId,
        company_id: companyId,
        review_type: reviewType,
        status: 'PENDING',
        priority: 'MEDIUM',
      });

    return !error;
  }
}

// Singleton instance
let obligationCreator: ObligationCreator | null = null;

export function getObligationCreator(): ObligationCreator {
  if (!obligationCreator) {
    obligationCreator = new ObligationCreator();
  }
  return obligationCreator;
}

