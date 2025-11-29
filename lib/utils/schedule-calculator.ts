/**
 * Schedule Calculator Utilities
 * Calculates next_due_date based on frequency and base_date
 * Reference: EP_Compliance_Product_Logic_Specification.md Section B.3
 */

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME' | 'CONTINUOUS' | 'EVENT_TRIGGERED';

/**
 * Calculate next due date based on frequency and base date
 */
export function calculateNextDueDate(
  frequency: Frequency,
  baseDate: Date,
  lastCompletedDate: Date | null = null,
  adjustForBusinessDays: boolean = false
): Date {
  const referenceDate = lastCompletedDate || baseDate;
  
  // If base_date is in the past, calculate from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveBaseDate = baseDate < today ? today : baseDate;
  const effectiveReferenceDate = lastCompletedDate || effectiveBaseDate;

  let nextDate: Date;

  switch (frequency) {
    case 'DAILY':
      nextDate = addDays(effectiveReferenceDate, 1);
      break;
    case 'WEEKLY':
      nextDate = addWeeks(effectiveReferenceDate, 1);
      break;
    case 'MONTHLY':
      nextDate = addMonths(effectiveReferenceDate, 1);
      break;
    case 'QUARTERLY':
      nextDate = addMonths(effectiveReferenceDate, 3);
      break;
    case 'ANNUAL':
      nextDate = addYears(effectiveReferenceDate, 1);
      break;
    case 'ONE_TIME':
      nextDate = effectiveBaseDate; // One-time obligations use base_date as deadline
      break;
    case 'CONTINUOUS':
      // Continuous obligations don't have a next_due_date
      return effectiveBaseDate;
    case 'EVENT_TRIGGERED':
      // Event-triggered obligations don't have a next_due_date until event occurs
      return effectiveBaseDate;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }

  // Adjust for business days if requested
  if (adjustForBusinessDays) {
    nextDate = adjustToBusinessDay(nextDate);
  }

  return nextDate;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Add years to a date
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Adjust date to next business day (Monday-Friday)
 * Note: This is a simplified version. For production, use a proper business days library
 * that accounts for UK bank holidays.
 */
function adjustToBusinessDay(date: Date): Date {
  const dayOfWeek = date.getDay();
  
  // If Saturday (6), move to Monday
  if (dayOfWeek === 6) {
    return addDays(date, 2);
  }
  
  // If Sunday (0), move to Monday
  if (dayOfWeek === 0) {
    return addDays(date, 1);
  }
  
  // Already a weekday
  return date;
}

