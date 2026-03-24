import {
  StyleSheet,
  View,
  ScrollView,
  Animated,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import { ThemedText } from "@/src/components/core/themed-text";
import React, { useState, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import Card from "@/src/components/core/card";
import List from "@/src/components/ui/list";
import ModalPanel from "@/src/components/ui/modal-panel";
import type { Category } from "@/src/types/models";
import * as Haptics from "expo-haptics";
import IconSymbol, { IconName } from "@/src/components/ui/icon-symbol";
import { DEFAULT_COLOR } from "@/src/constants/colors";
import { DEFAULT_ICON } from "@/src/constants/icons";
import CategoryPanel from "@/src/components/ui/category-panel";
import { useSpreadsheetMutation } from "@/src/hooks/useSpreadsheetMutation";
import { CategoriesApiHelper } from "@/src/helpers/CategoriesApiHelper";
import {
  CategoriesMutationHelpers,
  type UpdateCategoryData,
  type CategorySnapshot,
} from "@/src/helpers/CategoriesMutationHelpers";

interface CategoriesViewProps {
  categories: Category[];
}

const CategoriesView: React.FC<CategoriesViewProps> = ({ categories }) => {
  const menuBackground = useThemeColor({}, "menuBackground");
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const updateCategory = useSpreadsheetMutation<
    UpdateCategoryData,
    CategorySnapshot
  >({
    mutationFn: (spreadsheetId, data) => {
      const { categoryName, ...updates } = data;
      return CategoriesApiHelper.updateCategory(
        spreadsheetId,
        categoryName,
        updates,
      );
    },
    onMutate: (qc, data) =>
      CategoriesMutationHelpers.optimisticUpdateCategory(qc, data),
    onError: (qc, ctx) =>
      CategoriesMutationHelpers.rollbackCategories(qc, ctx),
    onSuccess: (qc, variables) =>
      CategoriesMutationHelpers.invalidateCategoryCaches(
        qc,
        !!variables.name && variables.name !== variables.categoryName,
      ),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>(
    DEFAULT_ICON as IconName,
  );
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);

  const handleIconLongPress = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(category);
    setEditName(category.name);
    setSelectedIcon((category.icon || DEFAULT_ICON) as IconName);
    setSelectedColor(category.color || DEFAULT_COLOR);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedCategory(null);
  };

  const performUpdate = async (
    name: string,
    icon: string,
    color: string,
  ) => {
    if (!selectedCategory) return;

    try {
      await updateCategory.mutateAsync({
        categoryName: selectedCategory.name,
        name,
        icon,
        color,
      });
      handleCloseModal();
    } catch (error) {
      console.error("Error updating category:", error);
      Alert.alert("Errore", "Impossibile aggiornare la categoria");
    }
  };

  const handleConfirm = () => {
    if (!selectedCategory) return;

    const nameChanged = editName !== selectedCategory.name;

    if (nameChanged) {
      Alert.alert(
        "Conferma modifica",
        `Stai per rinominare la categoria da "${selectedCategory.name}" a "${editName}".\n\nTutte le transazioni associate a questa categoria saranno aggiornate con il nuovo nome.`,
        [
          { text: "Annulla", style: "cancel" },
          {
            text: "Conferma",
            onPress: () =>
              performUpdate(editName, selectedIcon, selectedColor),
          },
        ],
      );
    } else {
      performUpdate(editName, selectedIcon, selectedColor);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          height: 20,
          marginBottom: -20,
          zIndex: 1,
          opacity: fadeOpacity,
        }}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[menuBackground, menuBackground + "00"]}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        <Card>
          <List>
            {categories.map((category) => (
              <View key={category.id} style={styles.categoryRow}>
                <ThemedText style={styles.categoryName}>
                  {category.name}
                </ThemedText>
                <Pressable
                  onLongPress={() => handleIconLongPress(category)}
                  delayLongPress={300}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: category.color || DEFAULT_COLOR },
                    ]}
                  >
                    <IconSymbol
                      name={(category.icon || DEFAULT_ICON) as IconName}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                </Pressable>
              </View>
            ))}
          </List>
        </Card>
      </Animated.ScrollView>

      <ModalPanel
        isVisible={modalVisible}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        title={selectedCategory?.name || "Modifica Categoria"}
        maxHeight={Dimensions.get("window").height * 0.75}
      >
        <CategoryPanel
          name={editName}
          selectedIcon={selectedIcon}
          selectedColor={selectedColor}
          onNameChange={setEditName}
          onIconChange={setSelectedIcon}
          onColorChange={setSelectedColor}
          readonly={false}
        />
      </ModalPanel>
    </View>
  );
};

export default CategoriesView;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  categoryName: {
    fontSize: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
