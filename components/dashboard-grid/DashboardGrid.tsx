import React, { ReactNode, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDashboardLayout } from "./DashboardLayoutContext";
import { DashboardRow } from "./DashboardRow";
import { DashboardColumn } from "./DashboardColumn";
import { DraggableCard } from "./DraggableCard";
import { CardId, RowId, ColumnId } from "./types";

interface CardRenderer {
  id: CardId;
  title: string;
  render: () => ReactNode;
  minHeight?: number;
}

interface DashboardGridProps {
  cardRenderers: CardRenderer[];
}

export function DashboardGrid({ cardRenderers }: DashboardGridProps) {
  const backgroundColor = useThemeColor({}, "background");
  const { layout, resizeColumn } = useDashboardLayout();

  const renderersMap = new Map(cardRenderers.map((r) => [r.id, r]));

  const handleColumnResize = useCallback(
    (rowId: RowId, columnId: ColumnId, newFlex: number) => {
      resizeColumn(rowId, columnId, newFlex);
    },
    [resizeColumn]
  );

  const renderCard = (cardId: CardId, columnId: ColumnId, rowId: RowId) => {
    const renderer = renderersMap.get(cardId);
    if (!renderer) return null;

    return (
      <DraggableCard
        key={cardId}
        id={cardId}
        title={renderer.title}
        columnId={columnId}
        rowId={rowId}
        minHeight={renderer.minHeight}
      >
        {renderer.render()}
      </DraggableCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {layout.rows.map((row, rowIndex) => (
        <DashboardRow
          key={row.id}
          id={row.id}
          flex={row.flex}
          isLast={rowIndex === layout.rows.length - 1}
        >
          {row.columns.map((column, colIndex) => (
            <DashboardColumn
              key={column.id}
              id={column.id}
              rowId={row.id}
              flex={column.flex}
              minWidth={column.minWidth}
              cards={column.cards}
              isLast={colIndex === row.columns.length - 1}
              onResize={(newFlex) =>
                handleColumnResize(row.id, column.id, newFlex)
              }
            >
              {column.cards.map((cardId) =>
                renderCard(cardId, column.id, row.id)
              )}
            </DashboardColumn>
          ))}
        </DashboardRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DashboardGrid;
