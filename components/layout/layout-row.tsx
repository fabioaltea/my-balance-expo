import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";

interface LayoutRowProps {
  children: React.ReactNode;
  flex?: number;
  gap?: number;
  padding?: number;
}

/**
 * Componente per una riga del layout dashboard.
 * Utilizza flexbox per disporre i figli orizzontalmente.
 */
export function LayoutRow({
  children,
  flex = 1,
  gap = 10,
  padding,
}: LayoutRowProps) {
  const style: ViewStyle = {
    flex,
    flexDirection: "row",
    gap,
  };

  if (padding !== undefined) {
    style.padding = padding;
  }

  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({});

export default LayoutRow;
