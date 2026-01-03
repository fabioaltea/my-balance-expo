import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ScrollView from "react-native";
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChartsView from '@/views/charts-view';
import ScreenView from '@/layout/screen-view';
import React from "react";

export default function Charts() {
  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Charts</ThemedText>
      </View>
      <ChartsView />
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
