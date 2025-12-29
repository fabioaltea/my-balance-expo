import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenView from '@/layout/screen-view';
import MovementsView from '@/views/movements-view';
import React from 'react';

export default function Movements() {
  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Movements</ThemedText>
      </View>
      <MovementsView />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
