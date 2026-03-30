import React from 'react';
import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuthContext, useDataContext } from '@/src/state';
import { parseLocationValue } from '@/src/utils/locationValue';
import { VectorIcon } from 'expo-router';

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
        <NativeTabs.Trigger.Label>Charts</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="chart.bar.fill" />,
          android: (
            <NativeTabs.Trigger.Icon src={<VectorIcon family={MaterialIcons} name="bar-chart" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="house.fill" />,
          android: (
            <NativeTabs.Trigger.Icon src={<VectorIcon family={MaterialIcons} name="home" />} />
          ),
        })}
      </NativeTabs.Trigger>

      {hasRegisteredPositions && (
        <NativeTabs.Trigger name="map">
          <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
          {Platform.select({
            ios: <NativeTabs.Trigger.Icon sf="map.fill" />,
            android: (
              <NativeTabs.Trigger.Icon src={<VectorIcon family={MaterialIcons} name="map" />} />
            ),
          })}
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{firstName}</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="person.fill" />,
          android: (
            <NativeTabs.Trigger.Icon src={<VectorIcon family={MaterialIcons} name="person" />} />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
