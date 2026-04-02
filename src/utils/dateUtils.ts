/**
 * Utility functions for date handling in dd-MM-yyyy format
 */

/**
 * Format a Date object to dd-MM-yyyy string
 */
export const formatDateToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Parse dd-MM-yyyy string to Date object
 */
export const parseDateFromDDMMYYYY = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const date = new Date(year, month, day);

  // Validate the date is correct (e.g., not 31-02-2024)
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
};

/**
 * Compare two dd-MM-yyyy date strings
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDates = (date1: string, date2: string): number => {
  const d1 = parseDateFromDDMMYYYY(date1);
  const d2 = parseDateFromDDMMYYYY(date2);

  if (!d1 || !d2) {
    // console.warn("⚠️ compareDates: Failed to parse dates", { date1, date2, d1, d2 });
    return 0;
  }

  const time1 = d1.getTime();
  const time2 = d2.getTime();

  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
};

/**
 * Check if date is between start and end (inclusive)
 */
export const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  return compareDates(date, startDate) >= 0 && compareDates(date, endDate) <= 0;
};

/**
 * Get start of month in dd-MM-yyyy format
 */
export const getMonthStart = (year: number, month: number): string => {
  const date = new Date(year, month, 1);
  return formatDateToDDMMYYYY(date);
};

/**
 * Get end of month in dd-MM-yyyy format
 */
export const getMonthEnd = (year: number, month: number): string => {
  const date = new Date(year, month + 1, 0); // Last day of month
  return formatDateToDDMMYYYY(date);
};

/**
 * Get start of year in dd-MM-yyyy format
 */
export const getYearStart = (year: number): string => {
  const date = new Date(year, 0, 1);
  return formatDateToDDMMYYYY(date);
};

/**
 * Get end of year in dd-MM-yyyy format
 */
export const getYearEnd = (year: number): string => {
  const date = new Date(year, 11, 31);
  return formatDateToDDMMYYYY(date);
};

/**
 * Get current date in dd-MM-yyyy format
 */
export const getCurrentDate = (): string => {
  return formatDateToDDMMYYYY(new Date());
};

/**
 * Convert ISO string from backend to dd-MM-yyyy
 * Handles formats like: "2024-01-15T00:00:00.000Z" or "2024-01-15"
 */
export const convertISOToLocalFormat = (isoString: string): string => {
  if (!isoString || typeof isoString !== 'string') {
    console.warn('⚠️ convertISOToLocalFormat: Invalid input, using current date', { isoString });
    return getCurrentDate();
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn('⚠️ convertISOToLocalFormat: Invalid ISO date, using current date', {
        isoString,
      });
      return getCurrentDate();
    }
    const formatted = formatDateToDDMMYYYY(date);

    // Log first few conversions for debugging
    const debugCount = (global as any).__dateConversionCount || 0;
    if (debugCount < 3) {
      console.log('🔄 Date conversion:', { from: isoString, to: formatted });
      (global as any).__dateConversionCount = debugCount + 1;
    }

    return formatted;
  } catch (error) {
    console.error('❌ Error converting ISO date:', isoString, error);
    return getCurrentDate();
  }
};

/**
 * Format date for display (locale-aware)
 */
export const formatDateForDisplay = (dateStr: string, locale: string = 'it-IT'): string => {
  const date = parseDateFromDDMMYYYY(dateStr);
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(locale);
};

// ===========================
// Recurrence Pattern Utilities
// ===========================

export type RecurrenceUnit = 'D' | 'W' | 'M' | 'Y';

export interface ParsedRecurrencePattern {
  unit: RecurrenceUnit;
  frequency: number;
}

/**
 * Parse ISO 8601 duration pattern (e.g., P1W, P2M, P1Y)
 * Returns the unit and frequency
 */
export const parseRecurrencePattern = (pattern: string): ParsedRecurrencePattern | null => {
  if (!pattern || typeof pattern !== 'string') {
    return null;
  }

  const match = pattern.match(/^P(\d+)([DWMY])$/);
  if (!match) {
    return null;
  }

  return {
    frequency: parseInt(match[1], 10),
    unit: match[2] as RecurrenceUnit,
  };
};

/**
 * Calculate the number of expected occurrences for a recurrence pattern within a date range
 *
 * Examples:
 * - P1W (weekly) in a 30-day month → ~4 occurrences
 * - P2W (bi-weekly) in a 30-day month → ~2 occurrences
 * - P1M (monthly) in a month → 1 occurrence
 * - P1D (daily) in a 30-day month → 30 occurrences
 */
export const calculateExpectedOccurrences = (
  pattern: string,
  periodStartDate: string,
  periodEndDate: string,
  templateStartDate?: string,
): number => {
  const parsed = parseRecurrencePattern(pattern);
  if (!parsed) {
    return 0;
  }

  const periodStart = parseDateFromDDMMYYYY(periodStartDate);
  const periodEnd = parseDateFromDDMMYYYY(periodEndDate);

  if (!periodStart || !periodEnd) {
    return 0;
  }

  const { unit, frequency } = parsed;

  // If we have the template start date, enumerate actual occurrences
  // that fall within the period for accurate calculation
  const templateStart = templateStartDate ? parseDateFromDDMMYYYY(templateStartDate) : null;

  if (templateStart) {
    let count = 0;
    const current = new Date(templateStart);

    // Iterate through occurrences starting from the template date
    while (current <= periodEnd) {
      if (current >= periodStart && current <= periodEnd) {
        count++;
      }

      // Advance to next occurrence
      switch (unit) {
        case 'D':
          current.setDate(current.getDate() + frequency);
          break;
        case 'W':
          current.setDate(current.getDate() + frequency * 7);
          break;
        case 'M':
          current.setMonth(current.getMonth() + frequency);
          break;
        case 'Y':
          current.setFullYear(current.getFullYear() + frequency);
          break;
      }
    }

    return count;
  }

  // Fallback: estimate based on period length (less accurate)
  const totalDays =
    Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  switch (unit) {
    case 'D':
      return Math.floor(totalDays / frequency);
    case 'W':
      return Math.floor(totalDays / (frequency * 7));
    case 'M': {
      const totalMonths =
        (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
        (periodEnd.getMonth() - periodStart.getMonth()) +
        1;
      return Math.floor(totalMonths / frequency);
    }
    case 'Y': {
      const years = periodEnd.getFullYear() - periodStart.getFullYear() + 1;
      return Math.floor(years / frequency);
    }
    default:
      return 0;
  }
};

/**
 * Get the period (month boundaries) containing a specific date
 * Returns start and end of that month
 */
export const getMonthPeriodForDate = (
  dateStr: string,
): { startDate: string; endDate: string } | null => {
  const date = parseDateFromDDMMYYYY(dateStr);
  if (!date) {
    return null;
  }

  return {
    startDate: getMonthStart(date.getFullYear(), date.getMonth()),
    endDate: getMonthEnd(date.getFullYear(), date.getMonth()),
  };
};

/**
 * Get list of month periods from a start date to current date
 * Used to check for overdue recurring movements
 *
 * @param startDateStr - The start date (e.g., template's date)
 * @param maxMonthsBack - Maximum number of months to look back (default 3)
 */
export const getMonthPeriodsFromStartDate = (
  startDateStr: string,
  maxMonthsBack: number = 3,
): Array<{
  startDate: string;
  endDate: string;
  label: string;
  isOverdue: boolean;
}> => {
  const startDate = parseDateFromDDMMYYYY(startDateStr);
  const now = new Date();

  if (!startDate) {
    return [];
  }

  const periods: Array<{
    startDate: string;
    endDate: string;
    label: string;
    isOverdue: boolean;
  }> = [];

  // Start from the template's start month
  let currentYear = startDate.getFullYear();
  let currentMonth = startDate.getMonth();

  // Calculate the earliest month we want to check
  if (maxMonthsBack !== Infinity) {
    const earliestMonth = now.getMonth() - maxMonthsBack + 1;
    const earliestDate = new Date(now.getFullYear(), earliestMonth, 1);

    // If template start is after the earliest date we care about, start from template
    if (startDate <= earliestDate) {
      currentYear = earliestDate.getFullYear();
      currentMonth = earliestDate.getMonth();
    }
  }

  // Iterate through months until current month
  while (
    currentYear < now.getFullYear() ||
    (currentYear === now.getFullYear() && currentMonth <= now.getMonth())
  ) {
    const periodStart = getMonthStart(currentYear, currentMonth);
    const periodEnd = getMonthEnd(currentYear, currentMonth);

    // Determine if this period is overdue (before current month)
    const isOverdue =
      currentYear < now.getFullYear() ||
      (currentYear === now.getFullYear() && currentMonth < now.getMonth());

    const monthNames = [
      'Gennaio',
      'Febbraio',
      'Marzo',
      'Aprile',
      'Maggio',
      'Giugno',
      'Luglio',
      'Agosto',
      'Settembre',
      'Ottobre',
      'Novembre',
      'Dicembre',
    ];

    periods.push({
      startDate: periodStart,
      endDate: periodEnd,
      label: `${monthNames[currentMonth]} ${currentYear}`,
      isOverdue,
    });

    // Move to next month
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  return periods;
};

/**
 * Get the current month period (start and end dates)
 */
export const getCurrentMonthPeriod = (): {
  startDate: string;
  endDate: string;
} => {
  const now = new Date();
  return {
    startDate: getMonthStart(now.getFullYear(), now.getMonth()),
    endDate: getMonthEnd(now.getFullYear(), now.getMonth()),
  };
};

/**
 * Get the last 12 months as periods (excluding current month)
 * Used for calculating historical averages
 */
export const getLast12MonthsPeriods = (): Array<{
  startDate: string;
  endDate: string;
}> => {
  const periods: Array<{ startDate: string; endDate: string }> = [];
  const now = new Date();

  // Start from 12 months ago up to last month (exclude current month)
  for (let i = 12; i >= 1; i--) {
    let month = now.getMonth() - i;
    let year = now.getFullYear();

    // Handle year rollover
    while (month < 0) {
      month += 12;
      year -= 1;
    }

    periods.push({
      startDate: getMonthStart(year, month),
      endDate: getMonthEnd(year, month),
    });
  }

  return periods;
};

/**
 * Get the current year period (full year boundaries)
 */
export const getCurrentYearPeriod = (): {
  startDate: string;
  endDate: string;
} => {
  const now = new Date();
  return {
    startDate: getYearStart(now.getFullYear()),
    endDate: getYearEnd(now.getFullYear()),
  };
};

/**
 * Get completed years for historical analysis (excludes current year)
 * @param maxYears - Maximum number of years to look back (default 5)
 */
export const getPastYearsPeriods = (
  maxYears: number = 5,
): Array<{
  year: number;
  startDate: string;
  endDate: string;
}> => {
  const periods: Array<{ year: number; startDate: string; endDate: string }> = [];
  const currentYear = new Date().getFullYear();

  for (let i = 1; i <= maxYears; i++) {
    const year = currentYear - i;
    periods.push({
      year,
      startDate: getYearStart(year),
      endDate: getYearEnd(year),
    });
  }

  return periods;
};

/**
 * Get the day of year (1-366)
 */
export const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

/**
 * Get total days in a year (365 or 366 for leap year)
 */
export const getDaysInYear = (year: number): number => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
};

/**
 * Get date range from start of year to a specific day of year
 * @param year - The year
 * @param dayOfYear - The day number (1-366)
 */
export const getYearRangeUpToDay = (
  year: number,
  dayOfYear: number,
): { startDate: string; endDate: string } => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 0, dayOfYear);

  return {
    startDate: formatDateToDDMMYYYY(startDate),
    endDate: formatDateToDDMMYYYY(endDate),
  };
};

/**
 * Detect if a date range represents a full year vs a single month
 * Returns 'year' if the range spans from Jan 1 to Dec 31 (or current date for current year)
 * Returns 'month' otherwise
 */
export const detectPeriodType = (startDate: string, endDate: string): 'month' | 'year' => {
  const start = parseDateFromDDMMYYYY(startDate);
  const end = parseDateFromDDMMYYYY(endDate);

  if (!start || !end) {
    return 'month';
  }

  // Check if start is January 1st
  const isJanFirst = start.getMonth() === 0 && start.getDate() === 1;

  // Check if end is in December or the range spans multiple months
  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

  // If starts Jan 1 and spans more than 2 months, it's a year view
  if (isJanFirst && monthsDiff >= 2) {
    return 'year';
  }

  return 'month';
};
