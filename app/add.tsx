import AddView from "@/views/add-view";
import React from "react";
import { useLocalSearchParams } from "expo-router";

export default function Add() {
  const { movementId, recurrenceId } = useLocalSearchParams<{
    movementId?: string;
    recurrenceId?: string;
  }>();

  return <AddView editingMovementId={movementId} recurrenceId={recurrenceId} />;
}
