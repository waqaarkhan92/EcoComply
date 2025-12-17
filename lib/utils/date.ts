/**
 * Date Utilities
 * Functions for date formatting, parsing, and deadline calculations
 */

/**
 * Format a date in various formats
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'default' | 'short' | 'iso' | string = 'default'
): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  switch (format) {
    case 'default':
      return `${day} ${months[month]} ${year}`;
    case 'short':
      return `${day} ${shortMonths[month]} ${year}`;
    case 'iso':
      return d.toISOString().split('T')[0];
    case 'DD/MM/YYYY':
      return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    default:
      return `${day} ${months[month]} ${year}`;
  }
}

/**
 * Parse a date string into a Date object
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null;

  const str = dateString.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Try UK format (DD/MM/YYYY)
  const ukMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) return d;
  }

  // Try US format (MM/DD/YYYY)
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) return d;
  }

  // Try natural language (31 January 2024)
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const naturalMatch = str.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (naturalMatch) {
    const [, day, monthStr, year] = naturalMatch;
    const month = months[monthStr.toLowerCase()];
    if (month !== undefined) {
      const d = new Date(parseInt(year), month, parseInt(day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export interface ParsedFrequency {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
}

/**
 * Parse a frequency string into a structured format
 */
export function parseFrequency(frequency: string): ParsedFrequency {
  const normalized = frequency.toLowerCase().trim();

  // Standard frequencies
  if (normalized === 'daily') {
    return { type: 'daily', interval: 1 };
  }
  if (normalized === 'weekly') {
    return { type: 'weekly', interval: 1 };
  }
  if (normalized === 'biweekly' || normalized === 'bi-weekly') {
    return { type: 'weekly', interval: 2 };
  }
  if (normalized === 'monthly') {
    return { type: 'monthly', interval: 1 };
  }
  if (normalized === 'quarterly') {
    return { type: 'monthly', interval: 3 };
  }
  if (normalized === 'annually' || normalized === 'yearly') {
    return { type: 'yearly', interval: 1 };
  }

  // Pattern: "every X days/weeks/months"
  const everyMatch = normalized.match(/^every\s+(\d+)\s+(day|week|month|year)s?$/);
  if (everyMatch) {
    const [, interval, unit] = everyMatch;
    const typeMap: Record<string, ParsedFrequency['type']> = {
      day: 'daily',
      week: 'weekly',
      month: 'monthly',
      year: 'yearly',
    };
    return { type: typeMap[unit], interval: parseInt(interval) };
  }

  throw new Error('Invalid frequency format: ' + frequency);
}

/**
 * Calculate the next deadline based on frequency
 */
export function calculateDeadline(frequency: string, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);

  // Handle specific date patterns like "31 December"
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const specificDateMatch = frequency.match(/^(\d{1,2})\s+(\w+)$/i);
  if (specificDateMatch) {
    const [, day, monthStr] = specificDateMatch;
    const month = months[monthStr.toLowerCase()];
    if (month !== undefined) {
      result.setMonth(month);
      result.setDate(parseInt(day));

      // If the date is in the past, use next year
      if (result <= fromDate) {
        result.setFullYear(result.getFullYear() + 1);
      }
      return result;
    }
  }

  // Parse standard frequencies
  let parsed: ParsedFrequency;
  try {
    parsed = parseFrequency(frequency);
  } catch {
    throw new Error('Invalid frequency: ' + frequency);
  }

  switch (parsed.type) {
    case 'daily':
      result.setDate(result.getDate() + parsed.interval);
      break;
    case 'weekly':
      result.setDate(result.getDate() + (7 * parsed.interval));
      break;
    case 'monthly':
      result.setMonth(result.getMonth() + parsed.interval);
      break;
    case 'yearly':
      result.setFullYear(result.getFullYear() + parsed.interval);
      break;
  }

  return result;
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date | string | null | undefined, gracePeriodDays: number = 0): boolean {
  if (!date) return false;

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const deadline = new Date(d);
  deadline.setHours(0, 0, 0, 0);
  deadline.setDate(deadline.getDate() + gracePeriodDays);

  return now > deadline;
}

/**
 * Get the number of days until a date
 */
export function getDaysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a date as relative time (e.g., "in 5 days", "2 days ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  const days = getDaysUntil(date);
  if (days === null) return null;

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';

  const absDays = Math.abs(days);

  if (absDays < 7) {
    return days > 0 ? `in ${days} days` : `${absDays} days ago`;
  }

  const weeks = Math.floor(absDays / 7);
  if (absDays < 30) {
    return days > 0 ? `in ${weeks} weeks` : `${weeks} weeks ago`;
  }

  const months = Math.floor(absDays / 30);
  return days > 0 ? `in ${months} months` : `${months} months ago`;
}

/**
 * Get the next occurrence of a recurring event
 */
export function getNextOccurrence(frequency: string, fromDate: Date = new Date()): Date {
  const normalized = frequency.toLowerCase().trim();

  // Handle "monthly on Xth" pattern
  const monthlyOnMatch = normalized.match(/^monthly on (\d+)(?:st|nd|rd|th)?$/);
  if (monthlyOnMatch) {
    const dayOfMonth = parseInt(monthlyOnMatch[1]);
    const result = new Date(fromDate);
    result.setDate(dayOfMonth);

    if (result <= fromDate) {
      result.setMonth(result.getMonth() + 1);
    }

    // Handle months with fewer days
    const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    if (dayOfMonth > lastDayOfMonth) {
      result.setDate(lastDayOfMonth);
    }

    return result;
  }

  // Handle "every Monday" etc.
  const daysOfWeek: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  const weeklyOnMatch = normalized.match(/^every\s+(\w+)$/);
  if (weeklyOnMatch) {
    const targetDay = daysOfWeek[weeklyOnMatch[1].toLowerCase()];
    if (targetDay !== undefined) {
      const result = new Date(fromDate);
      const currentDay = result.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      result.setDate(result.getDate() + daysToAdd);
      return result;
    }
  }

  // Default to calculateDeadline for standard frequencies
  return calculateDeadline(frequency, fromDate);
}
