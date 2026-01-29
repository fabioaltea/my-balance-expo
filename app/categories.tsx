import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/core/themed-text';
import ScreenView from '@/layout/screen-view';
import React from 'react';
import GlassButton from '@/components/ui/glass-button';
import { useDataContext } from '@/state/DataProvider';
import CategoriesView from '@/views/categories-view';

export default function Categories() {
  const { categories } = useDataContext();

  const handleButtonPress = () => {
    // router.push("/add");
  };

  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Categories</ThemedText>
        <GlassButton onPress={handleButtonPress}></GlassButton>
      </View>
      <CategoriesView categories={categories} />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
