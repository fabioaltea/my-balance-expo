// Core data types used across the app state

export interface IDateRange {
  startDate: string; // Format: dd-MM-yyyy
  endDate: string; // Format: dd-MM-yyyy
  label: string;
  isTransitioning?: boolean; // Flag to indicate data is reloading
}

import {
  getMonthStart,
  getMonthEnd,
  getYearStart,
  getCurrentDate,
} from "../utils/dateUtils";

// Preset date ranges (computed at runtime)
export const DATE_RANGES = {
  THIS_MONTH: {
    get startDate() {
      const now = new Date();
      return getMonthStart(now.getFullYear(), now.getMonth());
    },
    get endDate() {
      const now = new Date();
      return getMonthEnd(now.getFullYear(), now.getMonth());
    },
    label: "This Month",
  },
  LAST_MONTH: {
    get startDate() {
      const now = new Date();
      return getMonthStart(now.getFullYear(), now.getMonth() - 1);
    },
    get endDate() {
      const now = new Date();
      return getMonthEnd(now.getFullYear(), now.getMonth() - 1);
    },
    label: "Last Month",
  },
  LAST_3_MONTHS: {
    get startDate() {
      const now = new Date();
      return getMonthStart(now.getFullYear(), now.getMonth() - 2);
    },
    get endDate() {
      return getCurrentDate();
    },
    label: "Last 3 Months",
  },
  THIS_YEAR: {
    get startDate() {
      const now = new Date();
      return getYearStart(now.getFullYear());
    },
    get endDate() {
      return getCurrentDate();
    },
    label: "This Year",
  },
};
