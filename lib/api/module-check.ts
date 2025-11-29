/**
 * Module Activation Check Utilities
 * Helper functions to verify module activation status
 */

import { supabaseAdmin } from '../supabase/server';
import { errorResponse, ErrorCodes } from './response';
import { NextResponse } from 'next/server';

/**
 * Check if a module is activated for a company
 */
export async function isModuleActivated(
  companyId: string,
  moduleCode: string
): Promise<boolean> {
  try {
    // Get module ID from modules table
    const { data: module, error: moduleError } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', moduleCode)
      .single();

    if (moduleError || !module) {
      return false;
    }

    // Check if module is activated for company
    const { data: activation, error: activationError } = await supabaseAdmin
      .from('module_activations')
      .select('id')
      .eq('company_id', companyId)
      .eq('module_id', module.id)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    return !activationError && !!activation;
  } catch (error) {
    console.error('Error checking module activation:', error);
    return false;
  }
}

/**
 * Require module to be activated middleware
 */
export async function requireModule(
  companyId: string,
  moduleCode: string
): Promise<NextResponse | null> {
  const activated = await isModuleActivated(companyId, moduleCode);

  if (!activated) {
    return errorResponse(
      ErrorCodes.FORBIDDEN,
      `Module ${moduleCode} is not active. Please activate this module to access this feature.`,
      403
    );
  }

  return null;
}

