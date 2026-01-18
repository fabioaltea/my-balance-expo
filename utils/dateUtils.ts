/**
 * Utility functions for date handling in dd-MM-yyyy format
 */

/**
 * Format a Date object to dd-MM-yyyy string
 */
export const formatDateToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Parse dd-MM-yyyy string to Date object
 */
export const parseDateFromDDMMYYYY = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const parts = dateStr.split("-");
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
  if (
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
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
export const isDateInRange = (
  date: string,
  startDate: string,
  endDate: string,
): boolean => {
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
  if (!isoString || typeof isoString !== "string") {
    console.warn(
      "⚠️ convertISOToLocalFormat: Invalid input, using current date",
      { isoString },
    );
    return getCurrentDate();
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn(
        "⚠️ convertISOToLocalFormat: Invalid ISO date, using current date",
        { isoString },
      );
      return getCurrentDate();
    }
    const formatted = formatDateToDDMMYYYY(date);

    // Log first few conversions for debugging
    const debugCount = (global as any).__dateConversionCount || 0;
    if (debugCount < 3) {
      console.log("🔄 Date conversion:", { from: isoString, to: formatted });
      (global as any).__dateConversionCount = debugCount + 1;
    }

    return formatted;
  } catch (error) {
    console.error("❌ Error converting ISO date:", isoString, error);
    return getCurrentDate();
  }
};

/**
 * Format date for display (locale-aware)
 */
export const formatDateForDisplay = (
  dateStr: string,
  locale: string = "it-IT",
): string => {
  const date = parseDateFromDDMMYYYY(dateStr);
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(locale);
};

// ===========================
// Recurrence Pattern Utilities
// ===========================

export type RecurrenceUnit = "D" | "W" | "M" | "Y";

export interface ParsedRecurrencePattern {
  unit: RecurrenceUnit;
  frequency: number;
}

/**
 * Parse ISO 8601 duration pattern (e.g., P1W, P2M, P1Y)
 * Returns the unit and frequency
 */
export const parseRecurrencePattern = (
  pattern: string,
): ParsedRecurrencePattern | null => {
  if (!pattern || typeof pattern !== "string") {
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
  startDate: string,
  endDate: string,
): number => {
  const parsed = parseRecurrencePattern(pattern);
  if (!parsed) {
    return 0;
  }

  const start = parseDateFromDDMMYYYY(startDate);
  const end = parseDateFromDDMMYYYY(endDate);

  if (!start || !end) {
    return 0;
  }

  // Calculate total days in the period
  const totalDays =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const { unit, frequency } = parsed;

  switch (unit) {
    case "D":
      // Daily: every N days
      return Math.floor(totalDays / frequency);
    case "W":
      // Weekly: every N weeks (N * 7 days)
      return Math.floor(totalDays / (frequency * 7));
    case "M":
      // Monthly: calculate months in period
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      const totalMonths =
        (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      return Math.floor(totalMonths / frequency);
    case "Y":
      // Yearly: calculate years in period
      const years = end.getFullYear() - start.getFullYear() + 1;
      return Math.floor(years / frequency);
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

  // Calculate the earliest month we want to check (maxMonthsBack months before current)
  const earliestYear = now.getFullYear();
  const earliestMonth = now.getMonth() - maxMonthsBack + 1;
  const earliestDate = new Date(earliestYear, earliestMonth, 1);

  // If template start is after the earliest date we care about, start from template
  if (startDate > earliestDate) {
    currentYear = startDate.getFullYear();
    currentMonth = startDate.getMonth();
  } else {
    currentYear = earliestDate.getFullYear();
    currentMonth = earliestDate.getMonth();
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
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
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
