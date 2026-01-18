import { StyleSheet, View, ScrollView, Pressable, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ScreenView from '@/layout/screen-view';
import React, { useState } from 'react';
import GlassButton from '@/components/ui/glass-button';
import { router } from "expo-router";
import { useDataContext } from '@/state/DataProvider';
import Card from '@/components/card';
import List from '@/components/ui/list';
import ModalPanel from '@/components/ui/modal-panel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Category } from '@/hooks/useMyBalanceData';
import * as Haptics from 'expo-haptics';

// SF Symbols icons for categories
const SF_SYMBOLS = [
  'house.fill', 'car.fill', 'cart.fill', 'bag.fill', 'creditcard.fill',
  'banknote.fill', 'dollarsign.circle.fill', 'eurosign.circle.fill',
  'heart.fill', 'star.fill', 'gift.fill', 'gamecontroller.fill',
  'fork.knife', 'cup.and.saucer.fill', 'wineglass.fill', 'birthday.cake.fill',
  'tram.fill', 'airplane', 'bus.fill', 'ferry.fill',
  'fuelpump.fill', 'bolt.fill', 'lightbulb.fill', 'flame.fill',
  'drop.fill', 'leaf.fill', 'tree.fill', 'pawprint.fill',
  'figure.walk', 'figure.run', 'dumbbell.fill', 'sportscourt.fill',
  'music.note', 'tv.fill', 'film.fill', 'book.fill',
  'graduationcap.fill', 'pencil', 'briefcase.fill', 'hammer.fill',
  'wrench.fill', 'scissors', 'paintbrush.fill', 'camera.fill',
  'phone.fill', 'envelope.fill', 'wifi', 'network',
  'pills.fill', 'cross.case.fill', 'stethoscope', 'bandage.fill',
  'tshirt.fill', 'shoe.fill', 'eyeglasses', 'crown.fill',
  'building.2.fill', 'house.lodge.fill', 'tent.fill', 'bed.double.fill',
  'washer.fill', 'refrigerator.fill', 'oven.fill', 'microwave.fill',
  'party.popper.fill', 'balloon.2.fill', 'theatermasks.fill', 'ticket.fill',
  'tag.fill', 'giftcard.fill', 'percent', 'chart.bar.fill',
] as const;

// Color palette (ordered by hue)
const COLOR_PALETTE = [
  // Reds
  '#C0392B', '#E74C3C',
  // Oranges
  '#D35400', '#E67E22', '#F39C12',
  // Yellows
  '#F1C40F',
  // Greens
  '#27AE60', '#2ECC71', '#16A085', '#1ABC9C',
  // Blues
  '#2980B9', '#3498DB', '#1E3A5F',
  // Purples
  '#8E44AD', '#9B59B6', '#3D2E4F',
  // Browns
  '#5C3D2E', '#4A2C2A', '#4A3D2E',
  // Teals/Dark greens
  '#2F4F3F', '#2E4A3D', '#3D4A2E', '#2E5C3D', '#2E3D5C',
  // Grays
  '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#ECF0F1',
];

export default function Categories() {
  const { categories } = useDataContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('tag.fill');
  const [selectedColor, setSelectedColor] = useState<string>('#2F4F3F');

  const handleButtonPress = () => {
    // router.push("/add");
  };

  const handleIconLongPress = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(category);
    setSelectedIcon('tag.fill'); // TODO: load from category
    setSelectedColor(category.color || '#2F4F3F');
    setModalVisible(true);
  };

  const handleConfirm = () => {
    // TODO: save icon and color to category
    console.log('Save:', selectedCategory?.id, selectedIcon, selectedColor);
  };

  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Categories</ThemedText>
        <GlassButton onPress={handleButtonPress}></GlassButton>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <List>
            {categories.map((category) => (
              <View key={category.id} style={styles.categoryRow}>
                <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                <Pressable
                  onLongPress={() => handleIconLongPress(category)}
                  delayLongPress={300}
                >
                  <View style={[styles.iconContainer, { backgroundColor: category.color || '#2F4F3F' }]}>
                    <IconSymbol name="tag.fill" size={24} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
            ))}
          </List>
        </Card>
      </ScrollView>

      <ModalPanel
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirm}
        title={selectedCategory?.name || 'Modifica Categoria'}
        maxHeight={Dimensions.get('window').height * 0.75}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Selected preview */}
          <View style={styles.previewContainer}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
              <IconSymbol name={selectedIcon as any} size={32} color="#FFFFFF" />
            </View>
          </View>

          {/* Color selection */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Colore</ThemedText>
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
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Icona</ThemedText>
          <View style={styles.iconGrid}>
            {SF_SYMBOLS.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => setSelectedIcon(icon)}
                style={[
                  styles.iconItem,
                  selectedIcon === icon && styles.selectedItem,
                ]}
              >
                <IconSymbol name={icon as any} size={28} color={selectedColor} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ModalPanel>
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
