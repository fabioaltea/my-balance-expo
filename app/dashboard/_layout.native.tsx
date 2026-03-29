import React from 'react';
import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs, Label, Icon, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useAuthContext, useDataContext } from '@/src/state';
import { parseLocationValue } from '@/src/utils/locationValue';

/**
 * Native tab layout for iOS and Android.
 * Uses NativeTabs which provides native tab bar experience.
 */
export default function TabLayout() {
  const { user } = useAuthContext();
  const { movements } = useDataContext();
  const firstName = user?.name?.split(' ')[0] || 'Profile';
  const hasRegisteredPositions = movements.some(
    (movement) => parseLocationValue(movement.location).hasCoordinates,
  );

  return (
    <NativeTabs minimizeBehavior="onScrollDown" iconColor="#2F4F3F">
      <NativeTabs.Trigger name="charts">
        <Label>Charts</Label>
        {Platform.select({
          ios: <Icon sf="chart.bar.fill" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="bar-chart" />} />,
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        <Label>Home</Label>
        {Platform.select({
          ios: <Icon sf="house.fill" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />,
        })}
      </NativeTabs.Trigger>

      {hasRegisteredPositions && (
        <NativeTabs.Trigger name="map">
          <Label>Map</Label>
          {Platform.select({
            ios: <Icon sf="map.fill" />,
            android: <Icon src={<VectorIcon family={MaterialIcons} name="map" />} />,
          })}
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="settings">
        <Label>{firstName}</Label>
        {Platform.select({
          ios: <Icon sf="person.fill" />,
          android: <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />,
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
