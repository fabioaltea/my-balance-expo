import React, { ReactNode, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useDashboardLayout } from "./DashboardLayoutContext";
import LayoutManager from "./LayoutManager";

interface CommandBarProps {
  title?: string;
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  showLayoutControls?: boolean;
}

export function CommandBar({
  title = "MyBalance",
  leftContent,
  centerContent,
  rightContent,
  showLayoutControls = true,
}: CommandBarProps) {
  const backgroundColor = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const { saveLayout, resetLayout } = useDashboardLayout();
  const [showLayoutManager, setShowLayoutManager] = useState(false);

  return (
    <>
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.section}>
          {leftContent || (
            <Text style={[styles.title, { color: "#2F4F3F" }]}>{title}</Text>
          )}
        </View>

        <View style={[styles.section, styles.centerSection]}>
          {centerContent}
        </View>

        <View style={[styles.section, styles.rightSection]}>
          {rightContent}
          {showLayoutControls && (
            <View style={styles.layoutControls}>
              <Pressable
                style={styles.iconButton}
                onPress={() => setShowLayoutManager(true)}
                hitSlop={8}
              >
                <MaterialIcons name="settings" size={20} color={textColor} />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={saveLayout}
                hitSlop={8}
              >
                <MaterialIcons name="save" size={20} color={textColor} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <LayoutManager
        visible={showLayoutManager}
        onClose={() => setShowLayoutManager(false)}
      />
    </>
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
  layoutControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(47, 79, 63, 0.08)",
  },
});

export default CommandBar;
