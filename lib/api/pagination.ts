/**
 * Pagination Utilities
 * Cursor-based pagination helpers for API endpoints
 */

/**
 * Parse cursor from base64 string
 */
export function parseCursor(cursor?: string | null): { id: string; created_at: string } | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Create cursor from record
 */
export function createCursor(id: string, created_at: string): string {
  const cursor = { id, created_at };
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Parse pagination parameters from request
 * @throws Error if limit is invalid (caller should catch and return 422)
 */
export function parsePaginationParams(request: { nextUrl: URL }): {
  limit: number;
  cursor: string | null;
} {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  const cursorParam = searchParams.get('cursor');

  // Validate and clamp limit (1-100, default 20)
  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      // Invalid limit - will be handled by caller to return 422
      throw new Error('Invalid limit parameter: must be a positive integer between 1 and 100');
    }
    limit = Math.min(parsed, 100); // Max 100
  }

  return {
    limit,
    cursor: cursorParam,
  };
}

/**
 * Safely parse pagination parameters with error handling
 * Returns null if validation fails (caller should return 422)
 */
export function safeParsePaginationParams(
  request: { nextUrl: URL },
  requestId?: string
): { limit: number; cursor: string | null } | null {
  try {
    return parsePaginationParams(request);
  } catch (error: any) {
    return null;
  }
}

/**
 * Parse filter parameters from request
 */
export function parseFilterParams(request: { nextUrl: URL }): Record<string, any> {
  const searchParams = request.nextUrl.searchParams;
  const filters: Record<string, any> = {};

  // Extract filter[field] parameters
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('filter[') && key.endsWith(']')) {
      const field = key.slice(7, -1); // Extract field name from filter[field]
      filters[field] = value;
    }
  }

  return filters;
}

/**
 * Parse sort parameters from request
 */
export function parseSortParams(request: { nextUrl: URL }): Array<{ field: string; direction: 'asc' | 'desc' }> {
  const searchParams = request.nextUrl.searchParams;
  const sortParam = searchParams.get('sort');

  if (!sortParam) {
    return [{ field: 'created_at', direction: 'desc' }]; // Default sort
  }

  // Parse comma-separated sort fields
  // Format: field1,-field2 (prefix - means descending)
  return sortParam.split(',').map((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      return { field: trimmed.slice(1), direction: 'desc' as const };
    }
    return { field: trimmed, direction: 'asc' as const };
  });
}
