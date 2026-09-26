import React, { useMemo } from 'react';
import type { PeriodBreakdownData } from '@/src/types/charts';
import TimeSeriesChart from './time-series-chart';
import { breakdownSeries, chartPeriods } from './chart-series';

interface BreakdownStackedChartProps {
  data: PeriodBreakdownData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  onBarPress?: (data: PeriodBreakdownData) => void;
  viewMode?: 'months' | 'years';
  scrollable?: boolean;
  showLegend?: boolean;
  groupBy?: 'category' | 'account';
  selectedKey?: string | null;
  onHoverKeyChange?: (key: string | null) => void;
  onSelectKey?: (key: string) => void;
}

export default function BreakdownStackedChart({
  data,
  height,
  onBarPress,
  viewMode = 'months',
  selectedKey,
  onHoverKeyChange,
  onSelectKey,
  showLegend = false,
  groupBy = 'category',
}: BreakdownStackedChartProps) {
  const periods = useMemo(() => chartPeriods(data, viewMode), [data, viewMode]);
  const series = useMemo(() => breakdownSeries(data, groupBy), [data, groupBy]);
  return (
    <TimeSeriesChart
      periods={periods}
      series={series}
      height={height}
      areaSeriesId={series[0]?.id}
      showLegend={showLegend}
      footerSummary={(index) => ({ label: 'Total', value: data[index]?.total ?? 0 })}
      selectedKey={selectedKey}
      onHoverKeyChange={onHoverKeyChange}
      onSelectKey={onSelectKey}
      onPeriodPress={onBarPress ? (index) => onBarPress(data[index]) : undefined}
    />
  );
}
