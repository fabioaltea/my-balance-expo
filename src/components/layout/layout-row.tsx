import React from 'react';
import { View, ViewStyle } from 'react-native';

interface LayoutRowProps {
  children: React.ReactNode;
  flex?: number;
  gap?: number;
  padding?: number;
  height?: number | string;
  minHeight?: number;
}

/**
 * Componente per una riga del layout dashboard.
 * Utilizza flexbox per disporre i figli orizzontalmente.
 */
export function LayoutRow({
  children,
  flex,
  gap = 10,
  padding,
  height,
  minHeight = 0,
}: LayoutRowProps) {
  const style: ViewStyle = {
    flexDirection: 'row',
    gap,
    minHeight,
  };

  if (height !== undefined) {
    style.height = height as any;
  }

  if (flex !== undefined) {
    style.flex = flex;
    style.flexGrow = 1;
    style.flexShrink = 1;
  }

  if (padding !== undefined) {
    style.padding = padding;
  }

  return <View style={style}>{children}</View>;
}

export default LayoutRow;
