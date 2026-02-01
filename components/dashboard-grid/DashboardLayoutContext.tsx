import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DashboardContextValue,
  DashboardLayoutConfig,
  DashboardCard,
  CardId,
  ColumnId,
  RowId,
  DragState,
  DropTarget,
  DEFAULT_DRAG_STATE,
} from "./types";
import {
  stringifyLayout,
  parseLayout,
  validateLayout,
  exportLayoutToJSON,
} from "@/helpers/DashboardLayoutHelper";

const LAYOUT_STORAGE_KEY = "@mybalance/dashboard-layout";

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface DashboardLayoutProviderProps {
  children: ReactNode;
  defaultLayout: DashboardLayoutConfig;
}

export function DashboardLayoutProvider({
  children,
  defaultLayout,
}: DashboardLayoutProviderProps) {
  const [layout, setLayout] = useState<DashboardLayoutConfig>(defaultLayout);
  const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);
  const [cards, setCards] = useState<Map<CardId, DashboardCard>>(new Map());
  const [dragState, setDragState] = useState<DragState>(DEFAULT_DRAG_STATE);

  // Load saved layout on mount
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const saved = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
        if (saved) {
          const loadedLayout = JSON.parse(saved) as DashboardLayoutConfig;
          setLayout(loadedLayout);
        }
      } catch (error) {
        console.error("Failed to load layout:", error);
      } finally {
        setIsLayoutLoaded(true);
      }
    };
    loadLayout();
  }, []);

  // Auto-save layout when it changes (after initial load)
  useEffect(() => {
    if (isLayoutLoaded) {
      const timeoutId = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(
            LAYOUT_STORAGE_KEY,
            JSON.stringify(layout),
          );
        } catch (error) {
          console.error("Failed to save layout:", error);
        }
      }, 500); // Debounce save by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [layout, isLayoutLoaded]);

  const registerCard = useCallback((card: DashboardCard) => {
    setCards((prev) => {
      const next = new Map(prev);
      next.set(card.id, card);
      return next;
    });
  }, []);

  const unregisterCard = useCallback((cardId: CardId) => {
    setCards((prev) => {
      const next = new Map(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  const startDrag = useCallback(
    (cardId: CardId, columnId: ColumnId, rowId: RowId) => {
      setDragState({
        isDragging: true,
        draggedCardId: cardId,
        sourceColumnId: columnId,
        sourceRowId: rowId,
        dragPosition: { x: 0, y: 0 },
      });
    },
    [],
  );

  const updateDragPosition = useCallback((x: number, y: number) => {
    setDragState((prev) => ({
      ...prev,
      dragPosition: { x, y },
    }));
  }, []);

  const endDrag = useCallback((target: DropTarget | null) => {
    // Solo resetta il drag state, moveCard viene chiamato direttamente dove necessario
    setDragState(DEFAULT_DRAG_STATE);
  }, []);

  const moveCard = useCallback(
    (
      cardId: CardId,
      fromColumn: ColumnId,
      fromRow: RowId,
      toColumn: ColumnId,
      toRow: RowId,
      toIndex: number,
    ) => {
      setLayout((prev) => {
        const newLayout = JSON.parse(
          JSON.stringify(prev),
        ) as DashboardLayoutConfig;

        // Find source and remove card
        for (const row of newLayout.rows) {
          if (row.id === fromRow) {
            for (const col of row.columns) {
              if (col.id === fromColumn) {
                col.cards = col.cards.filter((id) => id !== cardId);
                break;
              }
            }
            break;
          }
        }

        // Find target and add card
        for (const row of newLayout.rows) {
          if (row.id === toRow) {
            for (const col of row.columns) {
              if (col.id === toColumn) {
                col.cards.splice(toIndex, 0, cardId);
                break;
              }
            }
            break;
          }
        }

        return newLayout;
      });
    },
    [],
  );

  const resizeColumn = useCallback(
    (rowId: RowId, columnId: ColumnId, newFlex: number) => {
      setLayout((prev) => {
        const newLayout = JSON.parse(
          JSON.stringify(prev),
        ) as DashboardLayoutConfig;

        for (const row of newLayout.rows) {
          if (row.id === rowId) {
            for (const col of row.columns) {
              if (col.id === columnId) {
                col.flex = Math.max(0.2, Math.min(5, newFlex));
                break;
              }
            }
            break;
          }
        }

        return newLayout;
      });
    },
    [],
  );

  const reorderCardsInColumn = useCallback(
    (rowId: RowId, columnId: ColumnId, newCardsOrder: CardId[]) => {
      setLayout((prev) => {
        const newLayout = JSON.parse(
          JSON.stringify(prev),
        ) as DashboardLayoutConfig;

        for (const row of newLayout.rows) {
          if (row.id === rowId) {
            for (const col of row.columns) {
              if (col.id === columnId) {
                col.cards = newCardsOrder;
                break;
              }
            }
            break;
          }
        }

        return newLayout;
      });
    },
    [],
  );

  const saveLayout = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.error("Failed to save layout:", error);
    }
  }, [layout]);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    setIsLayoutLoaded(false);
    AsyncStorage.removeItem(LAYOUT_STORAGE_KEY)
      .then(() => setIsLayoutLoaded(true))
      .catch(console.error);
  }, [defaultLayout]);

  const exportLayoutJSON = useCallback(() => {
    return stringifyLayout(layout);
  }, [layout]);

  const importLayoutJSON = useCallback((jsonString: string) => {
    try {
      const parsedLayout = parseLayout(jsonString);
      if (!parsedLayout) {
        console.error("Invalid layout JSON");
        return false;
      }

      const simpleLayout = exportLayoutToJSON(parsedLayout);
      if (!validateLayout(simpleLayout)) {
        console.error("Layout validation failed");
        return false;
      }

      setLayout(parsedLayout);
      return true;
    } catch (error) {
      console.error("Failed to import layout:", error);
      return false;
    }
  }, []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      layout,
      cards,
      dragState,
      registerCard,
      unregisterCard,
      startDrag,
      updateDragPosition,
      endDrag,
      moveCard,
      resizeColumn,
      reorderCardsInColumn,
      saveLayout,
      resetLayout,
      exportLayoutJSON,
      importLayoutJSON,
    }),
    [
      layout,
      cards,
      dragState,
      registerCard,
      unregisterCard,
      startDrag,
      updateDragPosition,
      endDrag,
      moveCard,
      resizeColumn,
      reorderCardsInColumn,
      saveLayout,
      resetLayout,
      exportLayoutJSON,
      importLayoutJSON,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardLayout(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardLayout must be used within a DashboardLayoutProvider",
    );
  }
  return context;
}

export async function loadSavedLayout(): Promise<DashboardLayoutConfig | null> {
  try {
    const saved = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as DashboardLayoutConfig;
    }
  } catch (error) {
    console.error("Failed to load saved layout:", error);
  }
  return null;
}
