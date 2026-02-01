import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";

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
    flexDirection: "column",
    gap,
  };

  if (flex !== undefined) {
    style.flex = flex;
  }

  if (flexGrow !== undefined) {
    style.flexGrow = flexGrow;
  }

  if (padding !== undefined) {
    style.padding = padding;
  }

  if (minWidth !== undefined) {
    style.minWidth = minWidth;
  }

  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({});

export default LayoutColumn;
