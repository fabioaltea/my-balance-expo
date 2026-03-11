import { View, StyleSheet, Pressable, Text } from "react-native";
import { useState, useMemo, useEffect } from "react";
import React from "react";
import { formatDateToDDMMYYYY } from "@/src/utils/dateUtils";
import type { IDateRange } from "@/src/state";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import ContextMenu from "./context-menu";

function monthStartEnd(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return {
    start: formatDateToDDMMYYYY(start),
    end: formatDateToDDMMYYYY(end),
  };
}

interface CompactPeriodPickerProps {
  setDateRange: (range: IDateRange & { isTransitioning?: boolean }) => void;
  isLoading?: boolean;
}

/**
 * Compact period picker for landscape command bar
 * iOS 26 style with inline navigation
 */
const CompactPeriodPicker: React.FC<CompactPeriodPickerProps> = ({
  setDateRange,
  isLoading = false,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();

  const months = useMemo(
    () => [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    [],
  );

  const fullMonths = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    [],
  );

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] =
    useState<number>(currentMonthIndex);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const backgroundColor = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.1)" },
    "background",
  );
  const arrowColor = useThemeColor({}, "text");

  useEffect(() => {
    if (!isLoading && isTransitioning) {
      setIsTransitioning(false);
    }
  }, [isLoading, isTransitioning]);

  const availableYears = useMemo(
    () => Array.from({ length: 6 }, (_, i) => String(currentYear - i)),
    [currentYear],
  );

  const setCustomRange = (
    startDate: string,
    endDate: string,
    label?: string,
  ) => {
    setIsTransitioning(true);
    setDateRange({
      startDate,
      endDate,
      label: label || `${startDate} - ${endDate}`,
      isTransitioning: true,
    });
  };

  const updateMonthRange = (year: number, monthIndex: number) => {
    const { start, end } = monthStartEnd(year, monthIndex);
    setCustomRange(start, end, `${fullMonths[monthIndex]} ${year}`);
  };

  const canGoNext = () => {
    return !(
      selectedYear === currentYear && selectedMonthIndex === currentMonthIndex
    );
  };

  const goToPrevious = () => {
    let newMonthIndex = selectedMonthIndex - 1;
    let newYear = selectedYear;

    if (newMonthIndex < 0) {
      newMonthIndex = 11;
      newYear = newYear - 1;
    }

    setSelectedMonthIndex(newMonthIndex);
    setSelectedYear(newYear);
    updateMonthRange(newYear, newMonthIndex);
  };

  const goToNext = () => {
    if (!canGoNext()) return;

    let newMonthIndex = selectedMonthIndex + 1;
    let newYear = selectedYear;

    if (newMonthIndex > 11) {
      newMonthIndex = 0;
      newYear = newYear + 1;
    }

    setSelectedMonthIndex(newMonthIndex);
    setSelectedYear(newYear);
    updateMonthRange(newYear, newMonthIndex);
  };

  const availableMonths = useMemo(() => {
    if (selectedYear < currentYear) {
      return fullMonths;
    } else if (selectedYear === currentYear) {
      return fullMonths.slice(0, currentMonthIndex + 1);
    }
    return [];
  }, [selectedYear, currentYear, currentMonthIndex, fullMonths]);

  const handleMonthSelect = (opt: string) => {
    const monthIndex = fullMonths.indexOf(opt);
    setSelectedMonthIndex(monthIndex);
    updateMonthRange(selectedYear, monthIndex);
  };

  const handleYearSelect = (opt: string) => {
    const y = parseInt(opt, 10);
    setSelectedYear(y);
    let monthIndex = selectedMonthIndex;
    if (y === currentYear && monthIndex > currentMonthIndex) {
      monthIndex = currentMonthIndex;
      setSelectedMonthIndex(monthIndex);
    }
    updateMonthRange(y, monthIndex);
  };

  return (
    <View style={styles.wrapper}>
      {/* Previous arrow */}
      <Pressable
        style={[styles.arrowButton, { backgroundColor }]}
        onPress={goToPrevious}
      >
        <Text style={[styles.arrowText, { color: arrowColor }]}>‹</Text>
      </Pressable>

      {/* Month selector */}
      <ContextMenu
        options={availableMonths}
        selectedOption={fullMonths[selectedMonthIndex]}
        onSelectOption={handleMonthSelect}
      >
        <View style={[styles.selectorButton, { backgroundColor }]}>
          <Text style={[styles.selectorText, { color: arrowColor }]}>
            {months[selectedMonthIndex]}
          </Text>
          <Text style={[styles.chevron, { color: arrowColor }]}>▾</Text>
        </View>
      </ContextMenu>

      {/* Year selector */}
      <ContextMenu
        options={availableYears}
        selectedOption={String(selectedYear)}
        onSelectOption={handleYearSelect}
      >
        <View style={[styles.selectorButton, { backgroundColor }]}>
          <Text style={[styles.selectorText, { color: arrowColor }]}>
            {selectedYear}
          </Text>
          <Text style={[styles.chevron, { color: arrowColor }]}>▾</Text>
        </View>
      </ContextMenu>

      {/* Next arrow */}
      <Pressable
        style={[
          styles.arrowButton,
          { backgroundColor },
          !canGoNext() && styles.disabled,
        ]}
        onPress={goToNext}
        disabled={!canGoNext()}
      >
        <Text
          style={[
            styles.arrowText,
            { color: arrowColor },
            !canGoNext() && styles.disabledText,
          ]}
        >
          ›
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 20,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 8,
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default CompactPeriodPicker;
