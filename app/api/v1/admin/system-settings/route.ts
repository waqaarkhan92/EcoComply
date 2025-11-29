/**
 * Admin System Settings Endpoints
 * GET /api/v1/admin/system-settings - Get system settings
 * PUT /api/v1/admin/system-settings - Update system settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get system settings
    const { data: settings, error } = await supabaseAdmin
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('is_active', true);

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch system settings',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Transform to key-value object
    const settingsObj: any = {};
    settings?.forEach((setting: any) => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });

    // Add defaults
    const result = {
      maintenance_mode: settingsObj.maintenance_mode || false,
      feature_flags: settingsObj.feature_flags || {},
      ...settingsObj,
    };

    return successResponse(result, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Get system settings error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner or Admin role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();

    // Update system settings
    const updates: any[] = [];

    if (body.maintenance_mode !== undefined) {
      updates.push({
        setting_key: 'maintenance_mode',
        setting_value: body.maintenance_mode,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

    if (body.feature_flags !== undefined) {
      updates.push({
        setting_key: 'feature_flags',
        setting_value: body.feature_flags,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

    // Update each setting
    for (const update of updates) {
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          setting_key: update.setting_key,
          setting_value: update.setting_value,
          is_active: true,
          updated_at: update.updated_at,
        }, {
          onConflict: 'setting_key',
        });
    }

    return successResponse(
      {
        maintenance_mode: body.maintenance_mode !== undefined ? body.maintenance_mode : undefined,
        feature_flags: body.feature_flags !== undefined ? body.feature_flags : undefined,
        updated_at: new Date().toISOString(),
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Update system settings error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

