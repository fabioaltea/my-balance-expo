import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SimpleCommandBarProps {
  title?: string;
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
}

/**
 * Simple command bar without layout management dependencies
 */
export function SimpleCommandBar({
  title = "MyBalance",
  leftContent,
  centerContent,
  rightContent,
}: SimpleCommandBarProps) {
  const backgroundColor = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.section}>
        {leftContent || (
          <Text style={[styles.title, { color: "#2F4F3F" }]}>{title}</Text>
        )}
      </View>

      <View style={[styles.section, styles.centerSection]}>
        {centerContent}
      </View>

      <View style={[styles.section, styles.rightSection]}>{rightContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    minHeight: 56,
  },
  section: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  centerSection: {
    flex: 2,
    justifyContent: "center",
  },
  rightSection: {
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});

export default SimpleCommandBar;
