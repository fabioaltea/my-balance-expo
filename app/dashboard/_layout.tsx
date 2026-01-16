import React from "react";
import { Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  NativeTabs,
  Label,
  Icon,
  VectorIcon,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      iconColor="#2F4F3F"
    >
      <NativeTabs.Trigger name="charts">
        <Label>Charts</Label>
        {Platform.select({
          ios: <Icon sf="chart.bar.fill" />,
          android: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="bar-chart" />}
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        <Label>Home</Label>
        {Platform.select({
          ios: <Icon sf="house.fill" />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />
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
            <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
