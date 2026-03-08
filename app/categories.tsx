import { StyleSheet, View } from 'react-native';
import { ThemedText } from "@/src/components/core/themed-text";
import React from 'react';
import GlassButton from "@/src/components/ui/glass-button";
import { useDataContext } from "@/src/state/DataProvider";
import CategoriesView from "@/src/views/categories-view";
import { ScreenView } from "@/src/components/core";

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
