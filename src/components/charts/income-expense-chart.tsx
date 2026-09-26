import React, { useMemo } from 'react';
import type { IncomeExpenseData } from '@/src/types/charts';
import TimeSeriesChart from './time-series-chart';
import { chartPeriods, incomeExpenseSeries } from './chart-series';

interface IncomeExpenseChartProps {
  data: IncomeExpenseData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  onBarPress?: (data: IncomeExpenseData) => void;
  viewMode?: 'months' | 'years';
  scrollable?: boolean;
  selectedKey?: string | null;
  onHoverKeyChange?: (key: string | null) => void;
  onSelectKey?: (key: string) => void;
}

export default function IncomeExpenseChart({
  data,
  height,
  onBarPress,
  viewMode = 'months',
  selectedKey,
  onHoverKeyChange,
  onSelectKey,
}: IncomeExpenseChartProps) {
  const periods = useMemo(() => chartPeriods(data, viewMode), [data, viewMode]);
  const series = useMemo(() => incomeExpenseSeries(data), [data]);
  return (
    <TimeSeriesChart
      periods={periods}
      series={series}
      height={height}
      areaSeriesId="income"
      footerSummary={(index) => {
        const value = (data[index]?.income ?? 0) - (data[index]?.expenses ?? 0);
        return { label: 'Net', value, color: value < 0 ? '#D07862' : '#298965' };
      }}
      selectedKey={selectedKey}
      onHoverKeyChange={onHoverKeyChange}
      onSelectKey={onSelectKey}
      onPeriodPress={onBarPress ? (index) => onBarPress(data[index]) : undefined}
    />
  );
}
