import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import ChipButton from './chip-button';
import { useState, useMemo, useEffect } from 'react';
import React from 'react';
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

  const inactiveBackground = useThemeColor(
    { light: '#a8a8a8ff', dark: '#4a4a4a' },
    'tabIconDefault',
  );
  const activeBackground = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  const dynamicStyles = StyleSheet.create({
    chipButton: {
      ...styles.chipButton,
      backgroundColor: inactiveBackground,
    },
  });

  return (
    <View style={[styles.wrapper, !isLandscape && { marginBottom: 16 }]}>
      <TouchableOpacity
        style={[styles.arrowButton, dynamicStyles.chipButton]}
        onPress={goToPreviousMonth}
      >
        <Text style={[styles.arrowText, isLandscape && { fontSize: 13 }]}>←</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.arrowButton,
          !canGoNext() && styles.arrowButtonDisabled,
          dynamicStyles.chipButton,
        ]}
        onPress={goToNextMonth}
        disabled={!canGoNext()}
      >
        <Text
          style={[
            styles.arrowText,
            !canGoNext() && styles.arrowTextDisabled,
            isLandscape && { fontSize: 13 },
          ]}
        >
          →
        </Text>
      </TouchableOpacity>
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
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  arrowTextDisabled: {
    color: '#e3e3e3',
  },
  chipWrapper: {
    position: 'relative',
    flexGrow: 1,
  },
  chipButton: {
    padding: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    display: 'flex',
  },
});

export default PeriodPicker;
