import AddView from '@/views/add-view';
import React from "react";
import { useLocalSearchParams } from "expo-router";

export default function Add() {
  const { movementId } = useLocalSearchParams<{ movementId?: string }>();

  return <AddView editingMovementId={movementId} />;
}

