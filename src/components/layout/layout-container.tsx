import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";

interface LayoutContainerProps {
  children: React.ReactNode;
  padding?: number;
  gap?: number;
  scrollable?: boolean;
}

/**
 * Container principale per il layout dashboard landscape.
 * Gestisce il padding generale e il gap tra gli elementi.
 */
export function LayoutContainer({
  children,
  padding = 10,
  gap = 10,
  scrollable = false,
}: LayoutContainerProps) {
  const containerStyle = {
    flex: 1,
    flexDirection: "column" as const,
    padding,
    gap,
  };

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});

export default LayoutContainer;
