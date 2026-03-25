import React from "react";
import { router } from "expo-router";
import MapView from "@/src/views/map-view.web";

export default function DashboardMapScreen() {
  return <MapView onBack={() => router.push("/dashboard/home")} />;
}
