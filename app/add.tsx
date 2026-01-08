import AddView from '@/views/add-view';
import React from "react";
import { useLocalSearchParams } from "expo-router";

export default function Add() {
  const params = useLocalSearchParams<{
    movementId?: string;
    description?: string;
    category?: string;
    date?: string;
    transactions?: string;
  }>();

  return (
    <AddView
      editingMovementId={params.movementId}
      initialDescription={params.description}
      initialCategory={params.category}
      initialDate={params.date}
      initialTransactions={params.transactions}
    />
  );
}

