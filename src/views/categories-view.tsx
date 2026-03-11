import {
  StyleSheet,
  View,
  ScrollView,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { ThemedText } from "@/src/components/core/themed-text";
import React, { useState, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import Card from "@/src/components/core/card";
import List from "@/src/components/ui/list";
import ModalPanel from "@/src/components/ui/modal-panel";
import { Category } from "@/src/hooks/useMyBalanceData";
import * as Haptics from "expo-haptics";
import IconSymbol, { IconName } from "@/src/components/ui/icon-symbol";
import { DEFAULT_COLOR } from "@/src/constants/colors";
import { DEFAULT_ICON } from "@/src/constants/icons";
import CategoryPanel from "@/src/components/ui/category-panel";

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

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedIcon, setSelectedIcon] = useState<IconName>(
    DEFAULT_ICON as IconName,
  );
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);

  const handleIconLongPress = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(category);
    setSelectedIcon((category.icon || DEFAULT_ICON) as IconName);
    setSelectedColor(category.color || DEFAULT_COLOR);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedCategory(null);
  };

  const handleConfirm = () => {
    // TODO: save icon and color to category
    console.log("Save:", selectedCategory?.id, selectedIcon, selectedColor);
    handleCloseModal();
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
          name={selectedCategory?.name || ""}
          selectedIcon={selectedIcon}
          selectedColor={selectedColor}
          onIconChange={setSelectedIcon}
          onColorChange={setSelectedColor}
          readonly={true}
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
