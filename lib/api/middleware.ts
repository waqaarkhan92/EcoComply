/**
 * API Middleware Utilities
 * Authentication, authorization, and request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../supabase/server';
import { errorResponse, ErrorCodes } from './response';

export interface AuthenticatedUser {
  id: string;
  email: string;
  company_id: string;
  roles: string[];
  is_consultant: boolean;
}

/**
 * Extract JWT token from request
 */
export function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieToken = request.cookies.get('access_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Verify JWT token and get user info
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    // Get user roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roleNames = roles?.map((r: { role: string }) => r.role) || [];

    // Check if user is a consultant
    const { data: consultantAssignment } = await supabaseAdmin
      .from('consultant_client_assignments')
      .select('consultant_id')
      .eq('consultant_id', user.id)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    return {
      id: userData.id,
      email: userData.email,
      company_id: userData.company_id,
      roles: roleNames,
      is_consultant: !!consultantAssignment,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const token = extractToken(request);

  if (!token) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      401
    );
  }

  const user = await verifyToken(token);

  if (!user) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Invalid or expired token',
      401
    );
  }

  return { user };
}

/**
 * Require specific role middleware
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Check if user has any of the allowed roles
  const hasRole = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    return errorResponse(
      ErrorCodes.FORBIDDEN,
      'Insufficient permissions',
      403
    );
  }

  return { user };
}

/**
 * Get request ID from headers or generate one
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || crypto.randomUUID();
}

