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
 * Optimized to reduce database queries by fetching user data with roles and consultant status in a single query
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    // Verify token with Supabase Auth (required, cannot be optimized away)
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Fetch user details with roles AND consultant status in a single query using joins
    // This eliminates the N+1 query by combining both lookups
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        company_id,
        user_roles (role),
        consultant_client_assignments!consultant_id (consultant_id, status)
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    // Extract roles from the joined data
    const roleNames = (userData.user_roles as { role: string }[] | null)?.map((r) => r.role) || [];

    // Check consultant status from the joined data - filter for active assignments
    const consultantAssignments = userData.consultant_client_assignments as { consultant_id: string; status: string }[] | null;
    const isConsultant = consultantAssignments?.some((a) => a.status === 'ACTIVE') ?? false;

    return {
      id: userData.id,
      email: userData.email,
      company_id: userData.company_id,
      roles: roleNames,
      is_consultant: isConsultant,
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
  try {
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

  // Apply rate limiting
    try {
  const { rateLimitMiddleware } = await import('./rate-limit');
  const rateLimitResult = await rateLimitMiddleware(request, user.id);
  if (rateLimitResult) {
    return rateLimitResult;
      }
    } catch (rateLimitError) {
      // SECURITY: If rate limiting fails (e.g., Redis is down), return 503 to prevent DDoS
      console.error('Rate limit check failed - service may be degraded:', rateLimitError);
      return errorResponse(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Rate limiting service unavailable',
        503,
        { error: 'Unable to verify rate limits. Please try again in a moment.' }
      );
  }

  return { user };
  } catch (error: any) {
    // If any error occurs during auth, return 401 instead of letting it propagate as 500
    console.error('Authentication error:', error);
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication failed',
      401
    );
  }
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

/**
 * Safely parse JSON from request body
 * Returns parsed body or throws error that can be caught and returned as 422
 */
export async function parseRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (error: any) {
    throw new Error(`Invalid JSON in request body: ${error.message || 'Request body must be valid JSON'}`);
  }
}

