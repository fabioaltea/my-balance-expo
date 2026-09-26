import React, { useId, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { scaleLinear, scalePoint } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { useThemeColor } from '@/src/hooks/use-theme-color';

// The SVG runtime accepts children here; its bundled Defs type omits them with React 19.
const GradientDefs = Defs as unknown as React.ComponentType<React.PropsWithChildren>;
const SvgClipPath = ClipPath as unknown as React.ComponentType<
  React.PropsWithChildren<{ id: string }>
>;

export interface ChartPeriod {
  key: string;
  label: string;
  detail: string;
  partial?: boolean;
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  values: number[];
}

interface TimeSeriesChartProps {
  periods: ChartPeriod[];
  series: ChartSeries[];
  height?: number;
  selectedKey?: string | null;
  onHoverKeyChange?: (key: string | null) => void;
  onSelectKey?: (key: string) => void;
  onPeriodPress?: (index: number) => void;
  showLegend?: boolean;
  areaSeriesId?: string;
  emptyLabel?: string;
  footerSummary: (index: number) => { label: string; value: number; color?: string };
}

const LEFT = 42;
const RIGHT = 12;
const TOP = 13;
const BOTTOM = 26;

const compactAmount = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}M`;
  if (abs >= 10_000)
    return `${(value / 1_000).toLocaleString('it-IT', { maximumFractionDigits: 0 })}k`;
  if (abs >= 1_000)
    return `${(value / 1_000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k`;
  return value.toLocaleString('it-IT', { maximumFractionDigits: abs < 10 ? 1 : 0 });
};

const exactAmount = (value: number) =>
  `${value < 0 ? '−' : ''}€${Math.abs(value).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TimeSeriesChart({
  periods,
  series,
  height,
  selectedKey,
  onHoverKeyChange,
  onSelectKey,
  onPeriodPress,
  showLegend = true,
  areaSeriesId,
  emptyLabel = 'No data for this period',
  footerSummary,
}: TimeSeriesChartProps) {
  const chartId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#708178', dark: '#9AA9A0' }, 'tabIconDefault');
  const gridColor = useThemeColor({ light: '#DDE6E0', dark: '#36423B' }, 'cardBorder');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [localHover, setLocalHover] = useState<string | null>(null);
  const [localSelection, setLocalSelection] = useState<string | null>(null);
  const [highlightedSeries, setHighlightedSeries] = useState<string | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: nextHeight } = event.nativeEvent.layout;
    setSize((previous) =>
      previous.width === width && previous.height === nextHeight
        ? previous
        : { width, height: nextHeight },
    );
  };

  const selected =
    localHover ?? selectedKey ?? (onSelectKey ? null : localSelection) ?? periods.at(-1)?.key;
  const foundIndex = periods.findIndex((period) => period.key === selected);
  const selectedIndex = foundIndex >= 0 ? foundIndex : Math.max(0, periods.length - 1);
  const graph = useMemo(() => {
    if (size.width < 100 || size.height < 90 || periods.length === 0 || series.length === 0) {
      return null;
    }
    const plotRight = size.width - RIGHT;
    const plotBottom = size.height - BOTTOM;
    const values = series.flatMap((entry) => entry.values.filter(Number.isFinite));
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const padding = Math.max((max - min) * 0.08, max === min ? 1 : 0);
    const y = scaleLinear()
      .domain([min - padding, max + padding])
      .range([plotBottom, TOP])
      .nice(3);
    const x = scalePoint<string>()
      .domain(periods.map((period) => period.key))
      .range([LEFT, plotRight])
      .padding(0.5);
    const paths = series.map((entry) => {
      const points = periods.map((period, index) => ({
        x: x(period.key) ?? LEFT,
        y: y(entry.values[index] ?? 0),
      }));
      return {
        ...entry,
        points,
        linePath:
          line<(typeof points)[number]>()
            .x((point) => point.x)
            .y((point) => point.y)
            .curve(curveMonotoneX)(points) ?? '',
        areaPath:
          area<(typeof points)[number]>()
            .x((point) => point.x)
            .y0(y(0))
            .y1((point) => point.y)
            .curve(curveMonotoneX)(points) ?? '',
      };
    });
    return { x, y, paths, plotRight, plotBottom, ticks: y.ticks(3) };
  }, [periods, series, size]);

  if (periods.length === 0 || series.length === 0) {
    return (
      <View style={[styles.empty, height ? { height } : undefined]}>
        <Text style={{ color: mutedColor }}>{emptyLabel}</Text>
      </View>
    );
  }

  const selectedPeriod = periods[selectedIndex];
  const summary = footerSummary(selectedIndex);
  const formattedSummary =
    size.width >= 450
      ? exactAmount(summary.value)
      : `${summary.value < 0 ? '−' : ''}€${compactAmount(Math.abs(summary.value))}`;
  const hover = (key: string | null) => {
    setLocalHover(key);
    onHoverKeyChange?.(key);
  };

  return (
    <View style={[styles.container, height ? { height } : undefined]}>
      <View style={styles.plot} onLayout={onLayout}>
        {graph && (
          <>
            <Svg width={size.width} height={size.height} accessible={false}>
              <GradientDefs>
                {graph.paths.map((entry) => (
                  <LinearGradient
                    key={entry.id}
                    id={`${chartId}-gradient-${entry.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <Stop offset="0" stopColor={entry.color} stopOpacity="0.25" />
                    <Stop offset="1" stopColor={entry.color} stopOpacity="0" />
                  </LinearGradient>
                ))}
                <LinearGradient id={`${chartId}-negative-gradient`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#D07862" stopOpacity="0.03" />
                  <Stop offset="1" stopColor="#D07862" stopOpacity="0.22" />
                </LinearGradient>
                <SvgClipPath id={`${chartId}-negative`}>
                  <Rect
                    x={0}
                    y={graph.y(0)}
                    width={size.width}
                    height={Math.max(0, size.height - graph.y(0))}
                  />
                </SvgClipPath>
              </GradientDefs>
              {graph.ticks.map((tick) => (
                <G key={tick}>
                  <Line
                    x1={LEFT}
                    x2={graph.plotRight}
                    y1={graph.y(tick)}
                    y2={graph.y(tick)}
                    stroke={gridColor}
                    strokeWidth={tick === 0 ? 1.4 : 0.8}
                  />
                </G>
              ))}
              {graph.paths.map((entry) => {
                const isDimmed = highlightedSeries !== null && highlightedSeries !== entry.id;
                const filled = entry.id === (highlightedSeries ?? areaSeriesId);
                return (
                  <G key={entry.id} opacity={isDimmed ? 0.17 : 1}>
                    {filled && (
                      <Path
                        d={entry.areaPath}
                        fill={`url(#${chartId}-gradient-${entry.id.replace(/[^a-zA-Z0-9]/g, '-')})`}
                      />
                    )}
                    {filled && entry.id === 'balance' && (
                      <Path
                        d={entry.areaPath}
                        fill={`url(#${chartId}-negative-gradient)`}
                        clipPath={`url(#${chartId}-negative)`}
                      />
                    )}
                    <Path
                      d={entry.linePath}
                      fill="none"
                      stroke={entry.color}
                      strokeWidth={filled ? 2.8 : 2.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {entry.id === 'balance' && (
                      <Path
                        d={entry.linePath}
                        fill="none"
                        stroke="#D07862"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        clipPath={`url(#${chartId}-negative)`}
                      />
                    )}
                  </G>
                );
              })}
              {selectedPeriod && (
                <>
                  <Line
                    x1={graph.x(selectedPeriod.key) ?? LEFT}
                    x2={graph.x(selectedPeriod.key) ?? LEFT}
                    y1={TOP}
                    y2={graph.plotBottom}
                    stroke={mutedColor}
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    opacity={0.65}
                  />
                  {graph.paths.map((entry) => (
                    <G key={entry.id}>
                      <Circle
                        cx={entry.points[selectedIndex]?.x ?? LEFT}
                        cy={entry.points[selectedIndex]?.y ?? graph.y(0)}
                        r={5}
                        fill={
                          entry.id === 'balance' && (entry.values[selectedIndex] ?? 0) < 0
                            ? '#D07862'
                            : entry.color
                        }
                        stroke={textColor}
                        strokeWidth={1.5}
                      />
                    </G>
                  ))}
                </>
              )}
              <Rect
                x={LEFT}
                y={TOP}
                width={Math.max(0, graph.plotRight - LEFT)}
                height={Math.max(0, graph.plotBottom - TOP)}
                fill="transparent"
              />
            </Svg>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {graph.ticks.map((tick) => (
                <Text
                  key={tick}
                  style={[styles.yLabel, { color: mutedColor, top: graph.y(tick) - 7 }]}
                >
                  {compactAmount(tick)}
                </Text>
              ))}
              {[0, Math.floor((periods.length - 1) / 2), periods.length - 1]
                .filter((index, position, all) => all.indexOf(index) === position)
                .map((index) => (
                  <Text
                    key={periods[index].key}
                    style={[
                      styles.xLabel,
                      {
                        color: mutedColor,
                        left: (graph.x(periods[index].key) ?? LEFT) - 24,
                        top: graph.plotBottom + 5,
                      },
                    ]}
                  >
                    {periods[index].label}
                  </Text>
                ))}
            </View>
            <View style={[styles.hitRow, { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM }]}>
              {periods.map((period, index) => (
                <Pressable
                  key={period.key}
                  style={styles.hitTarget}
                  accessibilityRole="button"
                  accessibilityLabel={`${period.detail}. ${series.map((entry) => `${entry.name} ${exactAmount(entry.values[index] ?? 0)}`).join(', ')}`}
                  onHoverIn={() => hover(period.key)}
                  onHoverOut={() => hover(null)}
                  onFocus={() => hover(period.key)}
                  onBlur={() => hover(null)}
                  onPress={() => {
                    setLocalSelection(period.key);
                    onSelectKey?.(period.key);
                    onPeriodPress?.(index);
                  }}
                />
              ))}
            </View>
          </>
        )}
      </View>
      <View style={[styles.footer, { borderTopColor: gridColor }]}>
        <Text style={[styles.periodLabel, { color: mutedColor }]} numberOfLines={1}>
          {selectedPeriod?.detail}
          {selectedPeriod?.partial ? ' · partial' : ''}
        </Text>
        <Text style={[styles.summaryLabel, { color: mutedColor }]} numberOfLines={1}>
          {summary.label}
        </Text>
        <Text
          style={[styles.summaryValue, { color: summary.color ?? textColor }]}
          accessibilityLabel={`${summary.label} ${exactAmount(summary.value)}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {formattedSummary}
        </Text>
      </View>
      {showLegend && series.length > 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.legend}
          contentContainerStyle={styles.legendContent}
        >
          {series.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() =>
                setHighlightedSeries((previous) => (previous === entry.id ? null : entry.id))
              }
              accessibilityRole="button"
              accessibilityLabel={`Highlight ${entry.name}`}
              style={[styles.legendItem, highlightedSeries === entry.id && styles.legendItemActive]}
            >
              <View style={[styles.dot, { backgroundColor: entry.color }]} />
              <Text style={[styles.legendText, { color: mutedColor }]} numberOfLines={1}>
                {entry.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 110, width: '100%' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  plot: { flex: 1, minHeight: 90, position: 'relative' },
  yLabel: { position: 'absolute', left: 0, width: 38, fontSize: 10, textAlign: 'right' },
  xLabel: { position: 'absolute', width: 48, fontSize: 10, textAlign: 'center' },
  hitRow: { position: 'absolute', flexDirection: 'row' },
  hitTarget: { flex: 1 },
  footer: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'baseline',
    borderTopWidth: 1,
    paddingLeft: 4,
    paddingRight: RIGHT,
    paddingTop: 10,
    gap: 6,
  },
  periodLabel: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  summaryLabel: {
    flexShrink: 0,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legend: { height: 28, flexGrow: 0, marginLeft: LEFT },
  legendContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  legendItemActive: { backgroundColor: 'rgba(115, 141, 126, 0.16)' },
  legendText: { fontSize: 10, maxWidth: 72 },
});
