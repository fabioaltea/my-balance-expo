import React, { useMemo } from 'react';
import type { MonthlyData } from '@/src/types/charts';
import TimeSeriesChart from './time-series-chart';
import { balanceSeries, chartPeriods } from './chart-series';

interface StackedBarChartProps {
  data: MonthlyData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  showTotal?: boolean;
  onBarPress?: (data: MonthlyData) => void;
  viewMode?: 'months' | 'years';
  scrollable?: boolean;
  selectedKey?: string | null;
  onHoverKeyChange?: (key: string | null) => void;
  onSelectKey?: (key: string) => void;
}

/** Historical total balance. The existing mobile detail callback remains available. */
export default function StackedBarChart({
  data,
  height,
  showLegend = false,
  onBarPress,
  viewMode = 'months',
  selectedKey,
  onHoverKeyChange,
  onSelectKey,
}: StackedBarChartProps) {
  const periods = useMemo(() => chartPeriods(data, viewMode), [data, viewMode]);
  const series = useMemo(() => balanceSeries(data), [data]);
  return (
    <TimeSeriesChart
      periods={periods}
      series={series}
      height={height}
      showLegend={showLegend}
      areaSeriesId="balance"
      footerSummary={(index) => ({
        label: 'Balance',
        value: data[index]?.totalBalance ?? 0,
        color: (data[index]?.totalBalance ?? 0) < 0 ? '#D07862' : '#28765B',
      })}
      selectedKey={selectedKey}
      onHoverKeyChange={onHoverKeyChange}
      onSelectKey={onSelectKey}
      onPeriodPress={onBarPress ? (index) => onBarPress(data[index]) : undefined}
    />
  );
}
