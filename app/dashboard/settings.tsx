import { Image } from 'expo-image';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Text,
} from "react-native";

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
import React from 'react';
import { useAuthContext } from '@/state';

export default function Settings() {
  const { user, logout } = useAuthContext();
  
    const handleLogout = () => {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]);
    };
  
  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Settings</ThemedText>
      </View>
      <Pressable onPress={handleLogout}><Text>Logout</Text></Pressable>
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
