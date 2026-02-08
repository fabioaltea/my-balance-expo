import { StyleSheet, View, ScrollView, Animated, Pressable, Dimensions } from 'react-native';
import { ThemedText } from '@/components/core/themed-text';
import React, { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColor } from '@/hooks/use-theme-color';
import Card from '@/components/core/card';
import List from '@/components/ui/list';
import ModalPanel from '@/components/ui/modal-panel';
import { Category } from '@/hooks/useMyBalanceData';
import * as Haptics from 'expo-haptics';
import IconSymbol, { IconName } from '@/components/ui/icon-symbol';
import { COLOR_PALETTE, DEFAULT_COLOR } from '@/constants/colors';
import { VALID_ICONS, DEFAULT_ICON } from '@/constants/icons';

interface CategoriesViewProps {
  categories: Category[];
}

const CategoriesView: React.FC<CategoriesViewProps> = ({ categories }) => {
  const menuBackground = useThemeColor({}, 'menuBackground');
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconName>(DEFAULT_ICON as IconName);
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
    console.log('Save:', selectedCategory?.id, selectedIcon, selectedColor);
    handleCloseModal();
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ height: 20, marginBottom: -20, zIndex: 1, opacity: fadeOpacity }}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[menuBackground, menuBackground + '00']}
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Selected preview */}
          <View style={styles.previewContainer}>
            <View
              style={[styles.previewIcon, { backgroundColor: selectedColor }]}
            >
              <IconSymbol name={selectedIcon} size={32} color="#FFFFFF" />
            </View>
          </View>

          {/* Color selection */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Color
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.colorScrollView}
            contentContainerStyle={styles.colorScrollContent}
          >
            {COLOR_PALETTE.map((color) => (
              <Pressable
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[
                  styles.colorItem,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedItem,
                ]}
              />
            ))}
          </ScrollView>

          {/* Icon selection */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Icona
          </ThemedText>
          <View style={styles.iconGrid}>
            {VALID_ICONS.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => setSelectedIcon(icon as IconName)}
                style={[
                  styles.iconItem,
                  selectedIcon === icon && styles.selectedItem,
                ]}
              >
                <IconSymbol name={icon} size={28} color={selectedColor} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
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
  previewContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  previewIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
    textAlign: "center",
  },
  colorScrollView: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  colorScrollContent: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 40,
    justifyContent: "center",
  },
  iconItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedItem: {
    borderWidth: 3,
    borderColor: "#007AFF",
  },
});
