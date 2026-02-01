import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RowId } from "./types";

interface DashboardRowProps {
  id: RowId;
  flex: number;
  isLast?: boolean;
  children: React.ReactNode;
}

export function DashboardRow({
  id,
  flex,
  isLast = false,
  children,
}: DashboardRowProps) {
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "text"
  );

  return (
    <View
      style={[
        styles.container,
        { flex },
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },
});

export default DashboardRow;
