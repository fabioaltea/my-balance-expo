import { Tabs } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import DashboardHeader from "@/components/DashboardHeader";
import {
  NativeTabs,
  Label,
  Icon,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
      <NativeTabs minimizeBehavior="onScrollDown" iconColor="#2F4F3F">
        <NativeTabs.Trigger name="charts">
          <Label>Charts</Label>
          {Platform.select({
            ios: <Icon sf="chart.bar.fill" />,
            android: (
              <Icon
                src={<VectorIcon family={MaterialIcons} name="details" />}
              />
            ),
          })}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="home">
          <Label>Home</Label>
          {Platform.select({
            ios: <Icon sf="house.fill" />,
            android: (
              <Icon src={<VectorIcon family={MaterialIcons} name="house" />} />
            ),
          })}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="movements">
          <Label>Movements</Label>
          {Platform.select({
            ios: <Icon sf="list.bullet" />,
            android: (
              <Icon src={<VectorIcon family={MaterialIcons} name="list" />} />
            ),
          })}
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <Label>Fabio</Label>
          {Platform.select({
            ios: <Icon sf="person.fill" />,
            android: (
              <Icon src={<VectorIcon family={MaterialIcons} name="people" />} />
            ),
          })}
        </NativeTabs.Trigger>
      </NativeTabs>
  );
}
