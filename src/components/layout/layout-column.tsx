import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface LayoutColumnProps {
  children: React.ReactNode;
  flex?: number;
  flexGrow?: number;
  gap?: number;
  padding?: number;
  minWidth?: number;
}

/**
 * Componente per una colonna del layout dashboard.
 * Utilizza flexbox per disporre i figli verticalmente.
 */
export function LayoutColumn({
  children,
  flex,
  flexGrow,
  gap = 10,
  padding,
  minWidth,
}: LayoutColumnProps) {
  const style: ViewStyle = {
    flexDirection: 'column',
    gap,
    minHeight: 0,
    flex,
    flexGrow,
    padding,
    minWidth,
  };

  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({});

export default LayoutColumn;
