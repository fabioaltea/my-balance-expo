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
  endDate: string
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
    console.warn("⚠️ convertISOToLocalFormat: Invalid input, using current date", { isoString });
    return getCurrentDate();
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn("⚠️ convertISOToLocalFormat: Invalid ISO date, using current date", { isoString });
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
export const formatDateForDisplay = (dateStr: string, locale: string = "it-IT"): string => {
  const date = parseDateFromDDMMYYYY(dateStr);
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(locale);
};
