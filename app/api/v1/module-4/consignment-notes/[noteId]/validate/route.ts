/**
 * Module 4: Consignment Note Validation Endpoint
 * POST /api/v1/module-4/consignment-notes/{id}/validate - Run validation rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(
  request: NextRequest, props: { params: Promise<{ noteId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_4');
    if (moduleCheck) return moduleCheck;

    const params = await props.params;
  const { noteId } = params;

    // Get consignment note
  const { data: consignmentNote, error: fetchError } = await supabaseAdmin
      .from('consignment_notes')
      .select('*, waste_streams!inner(company_id, site_id)')
      .eq('id', noteId)
      .single();

    if (fetchError || !consignmentNote) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Consignment note not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    const wasteStream = (consignmentNote as any).waste_streams;
    if (wasteStream.company_id !== user.company_id) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this consignment note',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get active validation rules for company and waste stream
  const { data: validationRules, error: rulesError } = await supabaseAdmin
      .from('validation_rules')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('is_active', true)
      .or(`waste_stream_id.is.null,waste_stream_id.eq.${consignmentNote.waste_stream_id}`);

    if (rulesError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch validation rules',
        500,
        { error: rulesError.message },
        { request_id: requestId }
      );
    }

    // Run validation rules
    const validationResults: any[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of validationRules || []) {
      let passed = true;
      let message = '';
      let validationData: any = {};

      switch (rule.rule_type) {
        case 'CARRIER_LICENCE':
          if (consignmentNote.carrier_id) {
            const { data: carrier } = await supabaseAdmin
              .from('contractor_licences')
              .select('expiry_date, is_valid')
              .eq('id', consignmentNote.carrier_id)
              .single();

            if (!carrier || !carrier.is_valid) {
              passed = false;
              message = 'Carrier licence is invalid or expired';
            } else if (carrier.expiry_date) {
              const expiryDate = new Date(carrier.expiry_date);
              const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry < 30) {
                warnings.push(`Carrier licence expires in ${daysUntilExpiry} days`);
              }
            }
          }
          break;

        case 'VOLUME_LIMIT':
          const maxVolume = rule.rule_config?.max_volume_m3;
          if (maxVolume && consignmentNote.quantity_m3 > maxVolume) {
            passed = false;
            message = `Volume ${consignmentNote.quantity_m3}m³ exceeds limit of ${maxVolume}m³`;
            validationData = { limit: maxVolume, actual: consignmentNote.quantity_m3 };
          }
          break;

        case 'EWC_CODE':
          const allowedEwcCodes = rule.rule_config?.allowed_ewc_codes || [];
          if (allowedEwcCodes.length > 0 && !allowedEwcCodes.includes(consignmentNote.ewc_code)) {
            passed = false;
            message = `EWC code ${consignmentNote.ewc_code} is not in allowed list`;
            validationData = { allowed: allowedEwcCodes, actual: consignmentNote.ewc_code };
          }
          break;
      }

      // Record validation execution
      const { data: execution } = await supabaseAdmin
        .from('validation_executions')
        .insert({
          consignment_note_id: noteId,
          validation_rule_id: rule.id,
          validation_result: passed ? 'PASS' : (rule.severity === 'ERROR' ? 'FAIL' : 'WARNING'),
          validation_message: message || (passed ? 'Validation passed' : 'Validation failed'),
          validation_data: validationData,
        })
        .select()
        .single();

      validationResults.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: rule.severity,
        passed,
        message,
        execution_id: execution?.id,
      });

      if (!passed && rule.severity === 'ERROR') {
        errors.push(message);
      } else if (!passed && rule.severity === 'WARNING') {
        warnings.push(message);
      }
    }

    // Update consignment note validation status
    const preValidationStatus = errors.length > 0 ? 'FAILED' : (warnings.length > 0 ? 'PASSED' : 'PASSED');
    const preValidationErrors = [...errors, ...warnings];

  const { data: updatedNote, error: updateError } = await supabaseAdmin
      .from('consignment_notes')
      .update({
        pre_validation_status: preValidationStatus,
        pre_validation_errors: preValidationErrors,
        pre_validated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update validation status',
        500,
        { error: updateError.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(
      {
        consignment_note_id: noteId,
        validation_status: preValidationStatus,
        errors,
        warnings,
        validation_results: validationResults,
        updated_at: updatedNote.updated_at,
      },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-4/consignment-notes/[id]/validate:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

