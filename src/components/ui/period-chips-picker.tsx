import { View, StyleSheet, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ChipButton from './chip-button';
import React, { useState, useMemo, useEffect } from 'react';
import { formatDateToDDMMYYYY } from '@/src/utils/dateUtils';
import { usePlatformContext, type IDateRange } from '@/src/state';
import { useThemeColor } from '@/src/hooks/use-theme-color';

function monthStartEnd(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return {
    start: formatDateToDDMMYYYY(start),
    end: formatDateToDDMMYYYY(end),
  };
}

interface PeriodPickerProps {
  setDateRange: (range: IDateRange & { isTransitioning?: boolean }) => void;
  isLoading?: boolean;
  onModeChange?: (mode: 'month' | 'year') => void;
}

const PeriodPicker: React.FC<PeriodPickerProps> = ({
  setDateRange,
  isLoading = false,
  onModeChange,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const months = useMemo(
    () => [
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
    ],
    [],
  );

  const { orientation } = usePlatformContext();

  const isLandscape = orientation === 'landscape';

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentMonthIndex);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Reset transitioning state when loading is complete
  useEffect(() => {
    if (!isLoading && isTransitioning) {
      setIsTransitioning(false);
    }
  }, [isLoading, isTransitioning]);

  const availableYears = useMemo(
    () => Array.from({ length: 6 }, (_, i) => String(currentYear - i)),
    [currentYear],
  );

  const setCustomRange = (startDate: string, endDate: string, label?: string) => {
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
    setCustomRange(start, end, `${months[monthIndex]} ${year}`);
  };

  const updateYearRange = (year: number) => {
    const start = formatDateToDDMMYYYY(new Date(year, 0, 1));
    const end = formatDateToDDMMYYYY(new Date(year, 11, 31));
    setCustomRange(start, end, `${year}`);
  };

  const canGoNext = () => {
    if (mode === 'year') {
      return selectedYear < currentYear;
    }
    return !(selectedYear === currentYear && selectedMonthIndex === currentMonthIndex);
  };

  const goToPreviousMonth = () => {
    if (mode === 'year') {
      const newYear = selectedYear - 1;
      setSelectedYear(newYear);
      updateYearRange(newYear);
    } else {
      let newMonthIndex = selectedMonthIndex - 1;
      let newYear = selectedYear;

      if (newMonthIndex < 0) {
        newMonthIndex = 11;
        newYear = newYear - 1;
      }

      setSelectedMonthIndex(newMonthIndex);
      setSelectedYear(newYear);
      updateMonthRange(newYear, newMonthIndex);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext()) return;

    if (mode === 'year') {
      const newYear = selectedYear + 1;
      setSelectedYear(newYear);
      updateYearRange(newYear);
    } else {
      let newMonthIndex = selectedMonthIndex + 1;
      let newYear = selectedYear;

      if (newMonthIndex > 11) {
        newMonthIndex = 0;
        newYear = newYear + 1;
      }

      setSelectedMonthIndex(newMonthIndex);
      setSelectedYear(newYear);
      updateMonthRange(newYear, newMonthIndex);
    }
  };

  const handleMonthSelect = (opt: string) => {
    const monthIndex = months.indexOf(opt);
    setSelectedMonthIndex(monthIndex);
    updateMonthRange(selectedYear, monthIndex);
  };

  const handleYearSelect = (opt: string) => {
    const y = parseInt(opt, 10);
    setSelectedYear(y);

    if (mode === 'year') {
      updateYearRange(y);
    } else {
      // If selecting current year and current month is beyond available months, adjust
      let monthIndex = selectedMonthIndex;
      if (y === currentYear && monthIndex > currentMonthIndex) {
        monthIndex = currentMonthIndex;
        setSelectedMonthIndex(monthIndex);
      }
      updateMonthRange(y, monthIndex);
    }
  };

  const handleMonthModeClick = () => {
    setMode('month');
    updateMonthRange(selectedYear, selectedMonthIndex);
    onModeChange?.('month');
  };

  const handleYearModeClick = () => {
    setMode('year');
    updateYearRange(selectedYear);
    onModeChange?.('year');
  };

  const availableMonths = useMemo(() => {
    if (selectedYear < currentYear) {
      return months;
    } else if (selectedYear === currentYear) {
      return months.slice(0, currentMonthIndex + 1);
    }
    return [];
  }, [selectedYear, currentYear, currentMonthIndex, months]);

  const controlBackground = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const controlColor = useThemeColor({ light: '#34443C', dark: '#E7ECE9' }, 'text');
  const borderColor = useThemeColor(
    { light: 'rgba(36, 68, 55, 0.12)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );

  const arrowStyle = { backgroundColor: controlBackground, borderColor };

  return (
    <View style={[styles.wrapper, !isLandscape && { marginBottom: 16 }]}>
      <View style={styles.arrows}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous period"
          style={({ pressed }) => [styles.arrowButton, arrowStyle, pressed && styles.pressed]}
          onPress={goToPreviousMonth}
        >
          <MaterialIcons name="chevron-left" size={20} color={controlColor} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next period"
          style={({ pressed }) => [
            styles.arrowButton,
            arrowStyle,
            !canGoNext() && styles.arrowButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={goToNextMonth}
          disabled={!canGoNext()}
        >
          <MaterialIcons name="chevron-right" size={20} color={controlColor} />
        </Pressable>
      </View>
      <ChipButton
        text="Months"
        key="Months"
        active={mode === 'month'}
        onPress={handleMonthModeClick}
        options={availableMonths}
        defaultOption={months[selectedMonthIndex]}
        onOptionSelect={handleMonthSelect}
      />
      <ChipButton
        text="Years"
        key="Years"
        active={mode === 'year'}
        onPress={handleYearModeClick}
        options={availableYears}
        defaultOption={String(selectedYear)}
        onOptionSelect={handleYearSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrows: { flexDirection: 'row', gap: 4 },
  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: { opacity: 0.38 },
  pressed: { opacity: 0.82 },
});

export default PeriodPicker;
