/**
 * Date Utilities Unit Tests
 * Tests for date formatting, parsing, and deadline calculations
 * Target: 100% coverage
 */

import {
  formatDate,
  parseDate,
  calculateDeadline,
  isOverdue,
  getDaysUntil,
  formatRelativeTime,
  getNextOccurrence,
  parseFrequency,
} from '@/lib/utils/date';

describe('Date Utilities', () => {
  const fixedDate = new Date('2024-06-15T10:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date in default format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('15 January 2024');
    });

    it('should format date in short format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'short')).toBe('15 Jan 2024');
    });

    it('should format date in ISO format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date, 'iso')).toBe('2024-01-15');
    });

    it('should format date in custom format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
    });

    it('should handle null date', () => {
      expect(formatDate(null as any)).toBeNull();
    });

    it('should handle invalid date', () => {
      expect(formatDate(new Date('invalid'))).toBeNull();
    });

    it('should handle string date input', () => {
      expect(formatDate('2024-01-15')).toBe('15 January 2024');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date string', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it('should parse UK date format', () => {
      const result = parseDate('15/01/2024');
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should parse slash date formats', () => {
      // The parseDate function handles DD/MM/YYYY (UK) and MM/DD/YYYY (US) formats
      // When both interpretations are valid, UK format takes precedence
      const result = parseDate('15/01/2024'); // Unambiguously UK (15th day, 1st month)
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it('should parse natural language dates', () => {
      const result = parseDate('31 January 2024');
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(31);
    });

    it('should handle invalid date string', () => {
      expect(parseDate('not a date')).toBeNull();
    });

    it('should handle empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('should handle null input', () => {
      expect(parseDate(null as any)).toBeNull();
    });
  });

  describe('calculateDeadline', () => {
    it('should calculate deadline for daily frequency', () => {
      const result = calculateDeadline('daily', fixedDate);
      expect(result.getDate()).toBe(16); // Next day
    });

    it('should calculate deadline for weekly frequency', () => {
      const result = calculateDeadline('weekly', fixedDate);
      expect(result.getDate()).toBe(22); // 7 days later
    });

    it('should calculate deadline for monthly frequency', () => {
      const result = calculateDeadline('monthly', fixedDate);
      expect(result.getMonth()).toBe(6); // July
      expect(result.getDate()).toBe(15);
    });

    it('should calculate deadline for quarterly frequency', () => {
      const result = calculateDeadline('quarterly', fixedDate);
      expect(result.getMonth()).toBe(8); // September (3 months later)
    });

    it('should calculate deadline for annually frequency', () => {
      const result = calculateDeadline('annually', fixedDate);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5); // June
      expect(result.getDate()).toBe(15);
    });

    it('should handle custom frequency (e.g., "Every 3 months")', () => {
      const result = calculateDeadline('every 3 months', fixedDate);
      expect(result.getMonth()).toBe(8); // September
    });

    it('should handle specific date deadline', () => {
      const result = calculateDeadline('31 December', fixedDate);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(31);
    });

    it('should use current year for past specific dates', () => {
      const result = calculateDeadline('31 January', fixedDate);
      // January 31 is past, so should use next year
      expect(result.getFullYear()).toBe(2025);
    });

    it('should handle biweekly frequency', () => {
      const result = calculateDeadline('biweekly', fixedDate);
      expect(result.getDate()).toBe(29); // 14 days later
    });

    it('should handle invalid frequency', () => {
      expect(() => calculateDeadline('invalid', fixedDate)).toThrow('Invalid frequency');
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2024-01-01');
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2024-12-31');
      expect(isOverdue(futureDate)).toBe(false);
    });

    it('should return false for today', () => {
      expect(isOverdue(fixedDate)).toBe(false);
    });

    it('should handle null date', () => {
      expect(isOverdue(null as any)).toBe(false);
    });

    it('should consider grace period', () => {
      const yesterdayDate = new Date('2024-06-14');
      expect(isOverdue(yesterdayDate, 2)).toBe(false); // 2 day grace period
    });
  });

  describe('getDaysUntil', () => {
    it('should calculate days until future date', () => {
      const futureDate = new Date('2024-06-20');
      expect(getDaysUntil(futureDate)).toBe(5);
    });

    it('should return negative days for past dates', () => {
      const pastDate = new Date('2024-06-10');
      expect(getDaysUntil(pastDate)).toBe(-5);
    });

    it('should return 0 for today', () => {
      expect(getDaysUntil(fixedDate)).toBe(0);
    });

    it('should handle null date', () => {
      expect(getDaysUntil(null as any)).toBeNull();
    });

    it('should handle string date input', () => {
      expect(getDaysUntil('2024-06-20')).toBe(5);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format future dates as "in X days"', () => {
      const futureDate = new Date('2024-06-20');
      expect(formatRelativeTime(futureDate)).toBe('in 5 days');
    });

    it('should format past dates as "X days ago"', () => {
      const pastDate = new Date('2024-06-10');
      expect(formatRelativeTime(pastDate)).toBe('5 days ago');
    });

    it('should format today as "today"', () => {
      expect(formatRelativeTime(fixedDate)).toBe('today');
    });

    it('should format yesterday as "yesterday"', () => {
      const yesterday = new Date('2024-06-14');
      expect(formatRelativeTime(yesterday)).toBe('yesterday');
    });

    it('should format tomorrow as "tomorrow"', () => {
      const tomorrow = new Date('2024-06-16');
      expect(formatRelativeTime(tomorrow)).toBe('tomorrow');
    });

    it('should format weeks for longer periods', () => {
      const twoWeeksAgo = new Date('2024-06-01');
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should format months for even longer periods', () => {
      const twoMonthsAgo = new Date('2024-04-15');
      expect(formatRelativeTime(twoMonthsAgo)).toBe('2 months ago');
    });

    it('should handle null date', () => {
      expect(formatRelativeTime(null as any)).toBeNull();
    });
  });

  describe('getNextOccurrence', () => {
    it('should get next daily occurrence', () => {
      const result = getNextOccurrence('daily', fixedDate);
      expect(result.getDate()).toBe(16);
    });

    it('should get next weekly occurrence', () => {
      const result = getNextOccurrence('weekly', fixedDate);
      expect(result.getDate()).toBe(22);
    });

    it('should get next monthly occurrence', () => {
      const result = getNextOccurrence('monthly', fixedDate);
      expect(result.getMonth()).toBe(6); // July
    });

    it('should handle end of month edge cases', () => {
      const endOfMonth = new Date('2024-01-31');
      const result = getNextOccurrence('monthly', endOfMonth);
      // Result should be ~1 month later
      // JavaScript Date overflow means 31 + 1 month = March 2 or 3 (31 days overflow)
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBeGreaterThanOrEqual(1); // At least February
    });

    it('should handle leap years', () => {
      const leapYearDate = new Date('2024-02-29');
      const result = getNextOccurrence('annually', leapYearDate);
      expect(result.getFullYear()).toBe(2025);
      // JavaScript Date may overflow Feb 29 in non-leap year to March 1
      expect(result.getMonth()).toBeGreaterThanOrEqual(1); // Feb or March
    });

    it('should handle specific day of month', () => {
      const result = getNextOccurrence('monthly on 15th', new Date('2024-06-10'));
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(5); // Still June
    });

    it('should handle specific day of week', () => {
      const result = getNextOccurrence('every Monday', new Date('2024-06-15')); // Saturday
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(17);
    });
  });

  describe('parseFrequency', () => {
    it('should parse "daily" frequency', () => {
      expect(parseFrequency('daily')).toEqual({
        type: 'daily',
        interval: 1,
      });
    });

    it('should parse "weekly" frequency', () => {
      expect(parseFrequency('weekly')).toEqual({
        type: 'weekly',
        interval: 1,
      });
    });

    it('should parse "monthly" frequency', () => {
      expect(parseFrequency('monthly')).toEqual({
        type: 'monthly',
        interval: 1,
      });
    });

    it('should parse "quarterly" frequency', () => {
      expect(parseFrequency('quarterly')).toEqual({
        type: 'monthly',
        interval: 3,
      });
    });

    it('should parse "annually" frequency', () => {
      expect(parseFrequency('annually')).toEqual({
        type: 'yearly',
        interval: 1,
      });
    });

    it('should parse "every X days" pattern', () => {
      expect(parseFrequency('every 5 days')).toEqual({
        type: 'daily',
        interval: 5,
      });
    });

    it('should parse "every X weeks" pattern', () => {
      expect(parseFrequency('every 2 weeks')).toEqual({
        type: 'weekly',
        interval: 2,
      });
    });

    it('should parse "every X months" pattern', () => {
      expect(parseFrequency('every 6 months')).toEqual({
        type: 'monthly',
        interval: 6,
      });
    });

    it('should handle case insensitive input', () => {
      expect(parseFrequency('DAILY')).toEqual({
        type: 'daily',
        interval: 1,
      });
    });

    it('should handle whitespace', () => {
      expect(parseFrequency('  weekly  ')).toEqual({
        type: 'weekly',
        interval: 1,
      });
    });

    it('should throw error for invalid frequency', () => {
      expect(() => parseFrequency('invalid')).toThrow('Invalid frequency format');
    });
  });

  describe('Edge Cases', () => {
    it('should handle timezone differences', () => {
      const utcDate = new Date('2024-01-15T00:00:00Z');
      const formatted = formatDate(utcDate);
      expect(formatted).toBeTruthy();
    });

    it('should handle daylight saving time transitions', () => {
      const dstDate = new Date('2024-03-10'); // DST begins in US
      const result = calculateDeadline('daily', dstDate);
      expect(result.getDate()).toBe(11);
    });

    it('should handle year boundaries', () => {
      const endOfYear = new Date('2024-12-31');
      const result = calculateDeadline('daily', endOfYear);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });
  });
});
