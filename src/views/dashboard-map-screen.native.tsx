import React, { useMemo } from "react";
import { Redirect } from "expo-router";
import MapViewNative from "@/src/views/map-view.native";
import { useDataContext } from "@/src/state";
import { parseLocationValue } from "@/src/utils/locationValue";

export default function DashboardMapScreen() {
  const { movements } = useDataContext();

  const hasRegisteredPositions = useMemo(
    () =>
      movements.some(
        (movement) => parseLocationValue(movement.location).hasCoordinates,
      ),
    [movements],
  );

  if (!hasRegisteredPositions) {
    return <Redirect href="/dashboard/home" />;
  }

  return <MapViewNative />;
}
