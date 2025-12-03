/**
 * Schedule Calculator Utilities
 * Calculates next_due_date based on frequency and base_date
 * Reference: docs/specs/30_Product_Business_Logic.md Section B.3
 */

import Holidays from 'date-holidays';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME' | 'CONTINUOUS' | 'EVENT_TRIGGERED';

// Initialize UK holidays
const ukHolidays = new Holidays('GB');

/**
 * Calculate next due date based on frequency and base date
 */
export function calculateNextDueDate(
  frequency: Frequency,
  baseDate: Date,
  lastCompletedDate: Date | null = null,
  adjustForBusinessDays: boolean = false,
  gracePeriodDays: number = 0,
  compliancePeriod?: string
): Date {
  const referenceDate = lastCompletedDate || baseDate;
  
  // If base_date is in the past, calculate from today and log warning
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let effectiveBaseDate = baseDate;
  if (baseDate < today) {
    console.warn(`Base date ${baseDate.toISOString().split('T')[0]} is in the past. Calculating from today.`);
    effectiveBaseDate = today;
  }
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

  // Apply grace period if specified
  if (gracePeriodDays > 0) {
    nextDate = addDays(nextDate, gracePeriodDays);
    // Note: Grace period may push deadline into next compliance period,
    // but deadline remains in original compliance period per spec
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
 * Adjust date to previous business day (Monday-Friday, excluding UK bank holidays)
 * Per spec: "If deadline falls on weekend/UK bank holiday AND adjust_for_business_days = true:
 * Move deadline to previous working day"
 */
function adjustToBusinessDay(date: Date): Date {
  let adjustedDate = new Date(date);
  
  // Keep moving back until we find a business day
  let attempts = 0;
  const maxAttempts = 10; // Safety limit
  
  while (attempts < maxAttempts && !isBusinessDay(adjustedDate)) {
    adjustedDate = addDays(adjustedDate, -1);
    attempts++;
  }
  
  return adjustedDate;
}

/**
 * Check if a date is a business day (Monday-Friday and not a UK bank holiday)
 */
function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  
  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // UK bank holiday check
  const holidays = ukHolidays.getHolidays(date.getFullYear());
  const dateStr = date.toISOString().split('T')[0];
  
  const isHoliday = holidays.some((holiday: any) => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.toISOString().split('T')[0] === dateStr;
  });
  
  if (isHoliday) {
    return false;
  }
  
  // Also check next year if date is near year boundary
  if (date.getMonth() === 11 && date.getDate() > 25) {
    const nextYearHolidays = ukHolidays.getHolidays(date.getFullYear() + 1);
    const isNextYearHoliday = nextYearHolidays.some((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toISOString().split('T')[0] === dateStr;
    });
    if (isNextYearHoliday) {
      return false;
    }
  }
  
  return true;
}

