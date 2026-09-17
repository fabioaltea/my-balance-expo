import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateToDDMMYYYY } from '@/src/utils/dateUtils';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { IDateRange } from '@/src/state';
import ChipButton from './chip-button';

interface PeriodPickerProps {
  setDateRange: (range: IDateRange & { isTransitioning?: boolean }) => void;
  isLoading?: boolean;
  onModeChange?: (mode: 'month' | 'year') => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getMonthRange(year: number, monthIndex: number) {
  return {
    start: formatDateToDDMMYYYY(new Date(year, monthIndex, 1)),
    end: formatDateToDDMMYYYY(new Date(year, monthIndex + 1, 0)),
  };
}

const PeriodPicker: React.FC<PeriodPickerProps> = ({
  setDateRange,
  isLoading = false,
  onModeChange,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const controlBackground = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const controlColor = useThemeColor({ light: '#34443C', dark: '#E7ECE9' }, 'text');
  const borderColor = useThemeColor(
    { light: 'rgba(36, 68, 55, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );

  useEffect(() => {
    if (!isLoading && isTransitioning) setIsTransitioning(false);
  }, [isLoading, isTransitioning]);

  const availableYears = useMemo(
    () => Array.from({ length: 6 }, (_, index) => String(currentYear - index)),
    [currentYear],
  );
  const availableMonths = useMemo(
    () => (selectedYear < currentYear ? MONTHS : MONTHS.slice(0, currentMonth + 1)),
    [currentMonth, currentYear, selectedYear],
  );

  const publishMonth = (year: number, month: number) => {
    const range = getMonthRange(year, month);
    setIsTransitioning(true);
    setDateRange({
      startDate: range.start,
      endDate: range.end,
      label: `${MONTHS[month]} ${year}`,
      isTransitioning: true,
    });
  };

  const publishYear = (year: number) => {
    setIsTransitioning(true);
    setDateRange({
      startDate: formatDateToDDMMYYYY(new Date(year, 0, 1)),
      endDate: formatDateToDDMMYYYY(new Date(year, 11, 31)),
      label: String(year),
      isTransitioning: true,
    });
  };

  const canGoNext =
    mode === 'year'
      ? selectedYear < currentYear
      : selectedYear < currentYear || selectedMonth < currentMonth;

  const move = (direction: -1 | 1) => {
    if (direction === 1 && !canGoNext) return;

    if (mode === 'year') {
      const year = selectedYear + direction;
      setSelectedYear(year);
      publishYear(year);
      return;
    }

    const date = new Date(selectedYear, selectedMonth + direction, 1);
    setSelectedYear(date.getFullYear());
    setSelectedMonth(date.getMonth());
    publishMonth(date.getFullYear(), date.getMonth());
  };

  const selectMonth = (monthName: string) => {
    const month = MONTHS.indexOf(monthName);
    setSelectedMonth(month);
    publishMonth(selectedYear, month);
  };

  const selectYear = (yearValue: string) => {
    const year = Number(yearValue);
    const month = year === currentYear ? Math.min(selectedMonth, currentMonth) : selectedMonth;
    setSelectedYear(year);
    setSelectedMonth(month);
    if (mode === 'year') publishYear(year);
    else publishMonth(year, month);
  };

  const setPeriodMode = (nextMode: 'month' | 'year') => {
    setMode(nextMode);
    onModeChange?.(nextMode);
    if (nextMode === 'year') publishYear(selectedYear);
    else publishMonth(selectedYear, selectedMonth);
  };

  const arrowStyle = {
    backgroundColor: controlBackground,
    borderColor,
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.arrows}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous period"
          onPress={() => move(-1)}
          style={({ pressed }) => [styles.arrow, arrowStyle, pressed && styles.pressed]}
        >
          <MaterialIcons name="chevron-left" size={20} color={controlColor} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next period"
          disabled={!canGoNext}
          onPress={() => move(1)}
          style={({ pressed }) => [
            styles.arrow,
            arrowStyle,
            !canGoNext && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="chevron-right" size={20} color={controlColor} />
        </Pressable>
      </View>
      <ChipButton
        text="Month"
        active={mode === 'month'}
        onPress={() => setPeriodMode('month')}
        options={availableMonths}
        defaultOption={MONTHS[selectedMonth]}
        onOptionSelect={selectMonth}
      />
      <ChipButton
        text="Year"
        minWidth={72}
        active={mode === 'year'}
        onPress={() => setPeriodMode('year')}
        options={availableYears}
        defaultOption={String(selectedYear)}
        onOptionSelect={selectYear}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  arrows: {
    flexDirection: 'row',
    gap: 4,
  },
  arrow: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.38,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
});

export default PeriodPicker;
