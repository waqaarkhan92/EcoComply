/**
 * Auto-Validate Consignment Notes Job
 * Auto-runs validation on newly created/updated consignments
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 11.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface AutoValidateConsignmentNotesJobInput {
  company_id?: string;
  batch_size?: number;
}

enum ValidationRuleType {
  CARRIER_LICENCE = 'CARRIER_LICENCE',
  VOLUME_LIMIT = 'VOLUME_LIMIT',
  STORAGE_DURATION = 'STORAGE_DURATION',
  EWC_CODE = 'EWC_CODE',
  DESTINATION = 'DESTINATION',
  CUSTOM = 'CUSTOM',
}

enum ValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export async function processAutoValidateConsignmentNotesJob(
  job: Job<AutoValidateConsignmentNotesJobInput>
): Promise<void> {
  const { company_id, batch_size = 50 } = job.data;

  try {
    // Step 1: Query unvalidated consignment notes
    let query = supabaseAdmin
      .from('consignment_notes')
      .select(`
        id,
        company_id,
        site_id,
        waste_stream_id,
        carrier_id,
        consignment_date,
        quantity,
        unit,
        ewc_code,
        destination_site_id,
        pre_validation_status,
        created_by
      `)
      .eq('pre_validation_status', 'NOT_VALIDATED')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: consignments, error: consignmentsError } = await query;

    if (consignmentsError) {
      throw new Error(`Failed to fetch consignment notes: ${consignmentsError.message}`);
    }

    if (!consignments || consignments.length === 0) {
      console.log('No unvalidated consignment notes found');
      return;
    }

    let validated = 0;
    let failed = 0;
    let warnings = 0;

    // Step 2-4: Process each consignment note
    for (const consignment of consignments) {
      try {
        // Step 2: Fetch applicable validation rules
        let rulesQuery = supabaseAdmin
          .from('validation_rules')
          .select('*')
          .eq('company_id', consignment.company_id)
          .eq('is_active', true)
          .order('waste_stream_id', { nullsFirst: false });

        // Filter by waste stream if specified (waste-stream-specific rules take precedence)
        if (consignment.waste_stream_id) {
          rulesQuery = rulesQuery.or(`waste_stream_id.eq.${consignment.waste_stream_id},waste_stream_id.is.null`);
        }

        const { data: rules, error: rulesError } = await rulesQuery;

        if (rulesError || !rules || rules.length === 0) {
          // No rules configured - mark as passed
          await supabaseAdmin
            .from('consignment_notes')
            .update({
              pre_validation_status: 'PASSED',
              pre_validated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', consignment.id);
          validated++;
          continue;
        }

        // Step 3: Execute each validation rule
        const ruleResults: Array<{
          rule_id: string;
          rule_type: string;
          result: 'PASS' | 'FAIL';
          error_message?: string;
          severity: string;
        }> = [];

        for (const rule of rules) {
          try {
            const result = await executeValidationRule(rule, consignment);
            ruleResults.push({
              rule_id: rule.id,
              rule_type: rule.rule_type,
              result: result.passed ? 'PASS' : 'FAIL',
              error_message: result.errorMessage,
              severity: rule.severity || ValidationSeverity.ERROR,
            });

            // Record execution
            await supabaseAdmin
              .from('validation_executions')
              .insert({
                validation_rule_id: rule.id,
                entity_type: 'CONSIGNMENT_NOTE',
                entity_id: consignment.id,
                execution_date: new Date().toISOString(),
                result: result.passed ? 'PASS' : 'FAIL',
                error_message: result.errorMessage || null,
              });
          } catch (error: any) {
            console.error(`Error executing rule ${rule.id}:`, error);
            ruleResults.push({
              rule_id: rule.id,
              rule_type: rule.rule_type,
              result: 'FAIL',
              error_message: error.message,
              severity: rule.severity || ValidationSeverity.ERROR,
            });
          }
        }

        // Step 4: Aggregate validation results
        const errorFailures = ruleResults.filter(
          (r) => r.result === 'FAIL' && r.severity === ValidationSeverity.ERROR
        );
        const warningFailures = ruleResults.filter(
          (r) => r.result === 'FAIL' && r.severity === ValidationSeverity.WARNING
        );
        const allPassed = ruleResults.every((r) => r.result === 'PASS');

        let validationStatus: 'PASSED' | 'FAILED' | 'PASSED_WITH_WARNINGS';
        if (errorFailures.length > 0) {
          validationStatus = 'FAILED';
          failed++;
        } else if (warningFailures.length > 0) {
          validationStatus = 'PASSED_WITH_WARNINGS';
          warnings++;
        } else if (allPassed) {
          validationStatus = 'PASSED';
          validated++;
        } else {
          validationStatus = 'PASSED_WITH_WARNINGS';
          warnings++;
        }

        const errorMessages = ruleResults
          .filter((r) => r.result === 'FAIL' && r.error_message)
          .map((r) => r.error_message!);

        // Update consignment note
        await supabaseAdmin
          .from('consignment_notes')
          .update({
            pre_validation_status: validationStatus,
            pre_validation_errors: errorMessages.length > 0 ? errorMessages : null,
            pre_validated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', consignment.id);

        // Step 5: Notify on validation failure
        if (validationStatus === 'FAILED' && consignment.created_by) {
          const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com';
          const actionUrl = `${baseUrl}/module-4/consignment-notes/${consignment.id}`;

          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: consignment.created_by,
              company_id: consignment.company_id,
              site_id: consignment.site_id,
              notification_type: 'CONSIGNMENT_VALIDATION_FAILED',
              channel: 'EMAIL, IN_APP',
              priority: 'HIGH',
              subject: 'Consignment Note Validation Failed',
              body_text: `The consignment note validation failed with the following errors: ${errorMessages.join('; ')}. Please review and correct the issues.`,
              body_html: null,
              entity_type: 'consignment_note',
              entity_id: consignment.id,
              action_url: actionUrl,
              variables: {
                consignment_id: consignment.id,
                errors: errorMessages,
                action_url: actionUrl,
              },
              status: 'PENDING',
              scheduled_for: new Date().toISOString(),
            });
        }
      } catch (error: any) {
        console.error(`Error processing consignment note ${consignment.id}:`, error);
        continue;
      }
    }

    console.log(
      `Auto-validate consignment notes completed: ${validated} passed, ${warnings} with warnings, ${failed} failed`
    );
  } catch (error: any) {
    console.error('Error in auto-validate consignment notes job:', error);
    throw error;
  }
}

async function executeValidationRule(rule: any, consignment: any): Promise<{
  passed: boolean;
  errorMessage?: string;
}> {
  const ruleConfig = rule.rule_config || {};

  switch (rule.rule_type) {
    case ValidationRuleType.CARRIER_LICENCE:
      if (!consignment.carrier_id) {
        return { passed: false, errorMessage: 'Carrier not specified' };
      }

      const { data: contractor } = await supabaseAdmin
        .from('contractors')
        .select('licence_number, licence_expiry_date')
        .eq('id', consignment.carrier_id)
        .single();

      if (!contractor || !contractor.licence_number) {
        return { passed: false, errorMessage: 'Carrier does not have a valid licence' };
      }

      const expiryDate = contractor.licence_expiry_date
        ? new Date(contractor.licence_expiry_date)
        : null;
      const consignmentDate = new Date(consignment.consignment_date);

      if (expiryDate && expiryDate < consignmentDate) {
        return { passed: false, errorMessage: 'Carrier licence expired before consignment date' };
      }

      return { passed: true };

    case ValidationRuleType.VOLUME_LIMIT:
      const maxVolume = ruleConfig.max_volume;
      if (maxVolume && consignment.quantity && consignment.quantity > maxVolume) {
        return {
          passed: false,
          errorMessage: ruleConfig.error_message || `Quantity ${consignment.quantity} exceeds maximum allowed volume of ${maxVolume} ${consignment.unit || ''}`,
        };
      }
      return { passed: true };

    case ValidationRuleType.STORAGE_DURATION:
      const maxStorageDays = ruleConfig.max_storage_days;
      if (maxStorageDays) {
        const consignmentDate = new Date(consignment.consignment_date);
        const now = new Date();
        const storageDays = Math.floor((now.getTime() - consignmentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (storageDays > maxStorageDays) {
          return {
            passed: false,
            errorMessage: ruleConfig.error_message || `Waste storage duration (${storageDays} days) exceeds limit of ${maxStorageDays} days`,
          };
        }
      }
      return { passed: true };

    case ValidationRuleType.EWC_CODE:
      // Basic EWC code validation (format check)
      if (consignment.ewc_code) {
        const ewcCodePattern = /^\d{2}\d{2}\d{2}\*?$/;
        if (!ewcCodePattern.test(consignment.ewc_code)) {
          return { passed: false, errorMessage: 'Invalid EWC code format' };
        }
      }
      return { passed: true };

    case ValidationRuleType.DESTINATION:
      if (ruleConfig.allowed_destinations) {
        const allowed = ruleConfig.allowed_destinations as string[];
        if (consignment.destination_site_id && !allowed.includes(consignment.destination_site_id)) {
          return { passed: false, errorMessage: 'Destination site not allowed by validation rule' };
        }
      }
      return { passed: true };

    case ValidationRuleType.CUSTOM:
      // Custom validation logic would go here
      // For now, default to pass if no custom logic provided
      return { passed: true };

    default:
      console.warn(`Unknown validation rule type: ${rule.rule_type}`);
      return { passed: true };
  }
}

