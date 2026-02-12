import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { ThemedText } from "@/components/core/themed-text";
import IconSymbol, { IconName } from "@/components/ui/icon-symbol";
import TextBox from "@/components/ui/text-box";
import { COLOR_PALETTE } from "@/constants/colors";
import { VALID_ICONS } from "@/constants/icons";

interface CategoryPanelProps {
  name: string;
  selectedIcon: IconName;
  selectedColor: string;
  onNameChange?: (name: string) => void;
  onIconChange: (icon: IconName) => void;
  onColorChange: (color: string) => void;
  readonly?: boolean;
}

const CategoryPanel: React.FC<CategoryPanelProps> = ({
  name,
  selectedIcon,
  selectedColor,
  onNameChange,
  onIconChange,
  onColorChange,
  readonly = false,
}) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Name input */}
      {!readonly && onNameChange && (
        <View style={styles.nameContainer}>
          <TextBox
            value={name}
            onChange={onNameChange}
            label="Name"
            placeholder="Category name"
          />
        </View>
      )}

      {/* Selected preview */}
      {/* <View style={styles.previewContainer}>
        <View
          style={[styles.previewIcon, { backgroundColor: selectedColor }]}
        >
          <IconSymbol name={selectedIcon} size={32} color="#FFFFFF" />
        </View>
      </View> */}

      {/* Color selection */}
      <ThemedText style={styles.sectionTitle}>Color</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorScrollView}
        contentContainerStyle={styles.colorScrollContent}
      >
        {COLOR_PALETTE.map((color) => (
          <Pressable
            key={color}
            onPress={() => onColorChange(color)}
            style={[
              styles.colorItem,
              { backgroundColor: color },
              selectedColor === color && styles.selectedItem,
            ]}
          />
        ))}
      </ScrollView>

      {/* Icon selection */}
      <ThemedText style={styles.sectionTitle}>Icon</ThemedText>
      <View style={styles.iconGrid}>
        {VALID_ICONS.map((icon) => (
          <Pressable
            key={icon}
            onPress={() => onIconChange(icon as IconName)}
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
  );
};

export default CategoryPanel;

const styles = StyleSheet.create({
  nameContainer: {
    marginBottom: 16,
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
