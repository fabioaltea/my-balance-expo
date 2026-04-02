import { useThemeColor } from '@/src/hooks/use-theme-color';
import { Slot } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabs } from 'react-native-screens';

/**
 * Portrait layout - standard navigation with bottom tabs
 */
function PortraitLayout() {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Slot />
      </View>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  // Bottom tabs styles
  bottomTabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
    paddingTop: 8,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomTabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  // Landscape layout styles
  landscapeContainer: {
    flex: 1,
    flexDirection: 'column',
  },
});

export default PortraitLayout;
