/**
 * Validation Middleware Helper
 * Validates request bodies using Zod schemas
 */

import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse, ErrorCodes } from '@/lib/api/response';

/**
 * Validate request body against Zod schema
 * Returns validated data or error response
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: Response }> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return {
        error: errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid JSON in request body',
          400,
          { error: 'Request body must be valid JSON' }
        ),
      };
    }

    // Validate against schema
    const validated = schema.parse(body);
    return { data: validated };
  } catch (error: any) {
    if (error instanceof ZodError) {
      // Extract validation errors
      const validationErrors: Record<string, string> = {};
      error.issues.forEach((err: any) => {
        const path = err.path.join('.');
        validationErrors[path] = err.message;
      });

      return {
        error: errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Validation failed',
          422,
          validationErrors
        ),
      };
    }

    // Unexpected error
    return {
      error: errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Validation error occurred',
        500,
        { error: 'Unknown validation error' }
      ),
    };
  }
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data: T } | { error: Response } {
  try {
    // Extract query parameters
    const params: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Validate against schema
    const validated = schema.parse(params);
    return { data: validated };
  } catch (error: any) {
    if (error instanceof ZodError) {
      // Extract validation errors
      const validationErrors: Record<string, string> = {};
      error.issues.forEach((err: any) => {
        const path = err.path.join('.');
        validationErrors[path] = err.message;
      });

      return {
        error: errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid query parameters',
          422,
          validationErrors
        ),
      };
    }

    // Unexpected error
    return {
      error: errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Validation error occurred',
        500,
        { error: 'Unknown validation error' }
      ),
    };
  }
}
