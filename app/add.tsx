import AddView from "@/src/views/add-view";
import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import type { Movement } from "@/src/state";

export default function Add() {
  const { movementId, recurrenceId, initialMovement: initialMovementJson } =
    useLocalSearchParams<{
      movementId?: string;
      recurrenceId?: string;
      initialMovement?: string;
    }>();

  const initialMovement = useMemo<Partial<Movement> | undefined>(() => {
    if (!initialMovementJson) return undefined;
    try {
      return JSON.parse(initialMovementJson);
    } catch {
      return undefined;
    }
  }, [initialMovementJson]);

  return (
    <AddView
      editingMovementId={movementId}
      recurrenceId={recurrenceId}
      initialMovement={initialMovement}
    />
  );
}
