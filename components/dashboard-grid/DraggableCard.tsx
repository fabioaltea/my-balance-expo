import React, { ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CardId, ColumnId, RowId } from "./types";

interface DraggableCardProps {
  id: CardId;
  title: string;
  columnId: ColumnId;
  rowId: RowId;
  children: ReactNode;
  minHeight?: number;
  collapsible?: boolean;
}

export function DraggableCard({
  id,
  title,
  columnId,
  rowId,
  children,
  minHeight = 100,
  collapsible = true,
}: DraggableCardProps) {
  const backgroundColor = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({ light: "#e0e0e0", dark: "#333" }, "text");

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          minHeight: isCollapsed ? 48 : minHeight,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.dragHandle}>
          <MaterialIcons name="drag-indicator" size={18} color="#999" />
        </View>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {collapsible && (
          <Pressable
            style={styles.collapseButton}
            onPress={() => setIsCollapsed(!isCollapsed)}
            hitSlop={8}
          >
            <MaterialIcons
              name={isCollapsed ? "expand-more" : "expand-less"}
              size={20}
              color="#999"
            />
          </Pressable>
        )}
      </View>
      {!isCollapsed && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "rgba(47, 79, 63, 0.03)",
  },
  dragHandle: {
    padding: 4,
    marginRight: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  collapseButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
});

export default DraggableCard;
