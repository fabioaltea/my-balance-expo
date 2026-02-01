import React, { useRef, useState, useCallback } from "react";
import { View, StyleSheet, Platform, PanResponder } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDashboardLayout } from "./DashboardLayoutContext";
import { ColumnId, RowId, CardId } from "./types";

interface DashboardColumnProps {
  id: ColumnId;
  rowId: RowId;
  flex: number;
  minWidth?: number;
  cards: CardId[];
  isLast?: boolean;
  children: React.ReactNode;
  onResize?: (newFlex: number) => void;
}

export function DashboardColumn({
  id,
  rowId,
  flex,
  minWidth = 200,
  cards,
  isLast = false,
  children,
  onResize,
}: DashboardColumnProps) {
  const borderColor = useThemeColor({ light: "#e0e0e0", dark: "#333" }, "text");

  const { reorderCardsInColumn } = useDashboardLayout();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<View>(null);
  const startFlex = useRef(flex);

  // Resize handler for the column divider
  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsResizing(true);
        startFlex.current = flex;
      },
      onPanResponderMove: (_, gestureState) => {
        if (onResize) {
          const delta = gestureState.dx / 100;
          onResize(Math.max(0.3, startFlex.current + delta));
        }
      },
      onPanResponderRelease: () => {
        setIsResizing(false);
      },
    }),
  ).current;

  const handleDragEnd = useCallback(
    ({ data }: { data: CardId[] }) => {
      reorderCardsInColumn(rowId, id, data);
    },
    [rowId, id, reorderCardsInColumn],
  );

  const webResizeProps =
    Platform.OS === "web"
      ? {
          style: [styles.resizeHandle, isResizing && styles.resizeHandleActive],
          onMouseDown: (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startFlex.current = flex;

            const startX = e.clientX;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = (moveEvent.clientX - startX) / 100;
              if (onResize) {
                onResize(Math.max(0.3, startFlex.current + delta));
              }
            };

            const handleMouseUp = () => {
              setIsResizing(false);
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          },
        }
      : {};

  // Convert children to array for draggable list
  const childrenArray = React.Children.toArray(children);

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<React.ReactNode>) => {
    return (
      <ScaleDecorator>
        <View onLongPress={drag} style={isActive && styles.draggingItem}>
          {item}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        { flex, minWidth },
        !isLast && { borderRightWidth: 1, borderRightColor: borderColor },
      ]}
    >
      <DraggableFlatList
        data={cards}
        keyExtractor={(item) => item}
        onDragEnd={handleDragEnd}
        renderItem={({ item, drag, isActive }) => {
          // Find the corresponding child by card ID
          const cardIndex = cards.indexOf(item);
          const cardElement = childrenArray[cardIndex];

          return (
            <ScaleDecorator>
              <View
                onLongPress={drag}
                disabled={isActive}
                style={isActive && styles.draggingItem}
              >
                {cardElement}
              </View>
            </ScaleDecorator>
          );
        }}
        containerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      {!isLast && (
        <View
          {...(Platform.OS !== "web" ? resizePanResponder.panHandlers : {})}
          {...(webResizeProps as any)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  draggingItem: {
    opacity: 0.7,
  },
  resizeHandle: {
    position: "absolute",
    right: -4,
    top: 0,
    bottom: 0,
    width: 8,
    ...(Platform.OS === "web"
      ? { cursor: "col-resize" as any, zIndex: 10 }
      : {}),
  },
  resizeHandleActive: {
    backgroundColor: "rgba(47, 79, 63, 0.2)",
  },
});

export default DashboardColumn;
