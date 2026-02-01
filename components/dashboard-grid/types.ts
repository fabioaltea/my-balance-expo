import { ReactNode } from "react";

export type CardId = string;
export type ColumnId = string;
export type RowId = string;

export interface DashboardCard {
  id: CardId;
  title: string;
  component: ReactNode;
  minHeight?: number;
  maxHeight?: number;
}

export interface ColumnConfig {
  id: ColumnId;
  flex: number;
  minWidth?: number;
  cards: CardId[];
}

export interface RowConfig {
  id: RowId;
  flex: number;
  columns: ColumnConfig[];
}

export interface DashboardLayoutConfig {
  rows: RowConfig[];
}

export interface DragState {
  isDragging: boolean;
  draggedCardId: CardId | null;
  sourceColumnId: ColumnId | null;
  sourceRowId: RowId | null;
  dragPosition: { x: number; y: number };
}

export interface DropTarget {
  rowId: RowId;
  columnId: ColumnId;
  index: number;
}

export interface DashboardContextValue {
  layout: DashboardLayoutConfig;
  cards: Map<CardId, DashboardCard>;
  dragState: DragState;
  registerCard: (card: DashboardCard) => void;
  unregisterCard: (cardId: CardId) => void;
  startDrag: (cardId: CardId, columnId: ColumnId, rowId: RowId) => void;
  updateDragPosition: (x: number, y: number) => void;
  endDrag: (target: DropTarget | null) => void;
  moveCard: (
    cardId: CardId,
    fromColumn: ColumnId,
    fromRow: RowId,
    toColumn: ColumnId,
    toRow: RowId,
    toIndex: number,
  ) => void;
  resizeColumn: (rowId: RowId, columnId: ColumnId, newFlex: number) => void;
  reorderCardsInColumn: (
    rowId: RowId,
    columnId: ColumnId,
    newCardsOrder: CardId[],
  ) => void;
  saveLayout: () => void;
  resetLayout: () => void;
  exportLayoutJSON: () => string;
  importLayoutJSON: (jsonString: string) => boolean;
}

export const DEFAULT_DRAG_STATE: DragState = {
  isDragging: false,
  draggedCardId: null,
  sourceColumnId: null,
  sourceRowId: null,
  dragPosition: { x: 0, y: 0 },
};
