import React, { useId, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { area, curveMonotoneX, line } from 'd3-shape';

import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { CashFlowPoint } from './cash-flow-series';

const GradientDefs = Defs as unknown as React.ComponentType<React.PropsWithChildren>;

type Props = {
  points: CashFlowPoint[];
  incomeColor: string;
  expenseColor: string;
  height?: number;
  style?: ViewStyle;
};

type PlotPoint = { x: number; y: number };

const exactAmount = (value: number) =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
  })}`;

export default function CashFlowMiniChart({
  points,
  incomeColor,
  expenseColor,
  height = 66,
  style,
}: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(0);
  const surfaceColor = useThemeColor({ light: '#F9FBFA', dark: '#232725' }, 'cardBackground');
  const last = points.at(-1) ?? { income: 0, expense: 0 };

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((previous) => (previous === nextWidth ? previous : nextWidth));
  };

  const graph = useMemo(() => {
    if (width <= 24 || points.length === 0) return null;
    const top = 8;
    const bottom = height - 8;
    const startX = 3;
    const endX = width - 6;
    const maximum = Math.max(1, ...points.map((point) => Math.max(point.income, point.expense)));
    const y = (value: number) => bottom - (value / maximum) * (bottom - top);
    const plot = (key: 'income' | 'expense') => {
      const coordinates = points.map((point, index) => ({
        x: startX + (index / Math.max(1, points.length - 1)) * (endX - startX),
        y: y(point[key]),
      }));
      return {
        line:
          line<PlotPoint>()
            .x((point) => point.x)
            .y((point) => point.y)
            .curve(curveMonotoneX)(coordinates) ?? '',
        area:
          area<PlotPoint>()
            .x((point) => point.x)
            .y0(bottom)
            .y1((point) => point.y)
            .curve(curveMonotoneX)(coordinates) ?? '',
      };
    };
    const income = plot('income');
    const expense = plot('expense');
    const incomeY = y(last.income);
    const expenseY = y(last.expense);
    return {
      income,
      expense,
      endX,
      incomeY,
      expenseY,
    };
  }, [height, last.expense, last.income, points, width]);

  return (
    <View
      style={[{ height, minWidth: 0 }, style]}
      onLayout={onLayout}
      accessible
      accessibilityLabel={`Income ${exactAmount(last.income)}, expenses ${exactAmount(last.expense)}`}
    >
      {graph && (
        <Svg width={width} height={height}>
          <GradientDefs>
            <LinearGradient id={`${id}-income`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={incomeColor} stopOpacity="0.19" />
              <Stop offset="1" stopColor={incomeColor} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id={`${id}-expense`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={expenseColor} stopOpacity="0.14" />
              <Stop offset="1" stopColor={expenseColor} stopOpacity="0" />
            </LinearGradient>
          </GradientDefs>
          <Path d={graph.income.area} fill={`url(#${id}-income)`} />
          <Path d={graph.expense.area} fill={`url(#${id}-expense)`} />
          <Path
            d={graph.income.line}
            fill="none"
            stroke={incomeColor}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={graph.expense.line}
            fill="none"
            stroke={expenseColor}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx={graph.endX}
            cy={graph.incomeY}
            r={3.5}
            fill={incomeColor}
            stroke={surfaceColor}
            strokeWidth={1.4}
          />
          <Circle
            cx={graph.endX}
            cy={graph.expenseY}
            r={3.5}
            fill={expenseColor}
            stroke={surfaceColor}
            strokeWidth={1.4}
          />
        </Svg>
      )}
    </View>
  );
}
