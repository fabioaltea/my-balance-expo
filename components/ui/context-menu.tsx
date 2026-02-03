import React from "react";
import {
  Pressable,
  ScrollView,
  View,
  StyleSheet,
  Text,
  Dimensions,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useState, useEffect, useRef } from "react";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";

export interface IContextMenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  destructive?: boolean;
}

export interface IContextMenuProps {
  options: (string | IContextMenuOption)[];
  selectedOption: string;
  onSelectOption: (option: string) => void;
  onDismiss?: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

const ITEM_HEIGHT = 44;
const MENU_PADDING = 8;
const MAX_HEIGHT = 250;
const MENU_WIDTH = 200;

const ContextMenu: React.FC<IContextMenuProps> = ({
  options,
  selectedOption,
  onSelectOption,
  onDismiss,
  buttonPosition,
}) => {
  // Animazioni iOS style
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-10)).current;

  // Animazione di apertura
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
    ]).start();
  }, []);

  // Colori del tema per il context menu
  const menuBackground = useThemeColor(
    { light: "#f2f2f7", dark: "#1c1c1e" },
    "cardBackground",
  );
  const borderColor = useThemeColor(
    { light: "rgba(0,0,0,0.1)", dark: "rgba(255,255,255,0.1)" },
    "cardBorder",
  );
  const textColor = useThemeColor({}, "text");
  const separatorColor = useThemeColor(
    { light: "rgba(0,0,0,0.1)", dark: "rgba(255,255,255,0.1)" },
    "tabIconDefault",
  );
  const pressedBackground = useThemeColor(
    { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.08)" },
    "tabIconDefault",
  );

  // Calcola l'altezza dinamica basata sul numero di elementi
  const calculatedHeight = Math.min(
    options.length * ITEM_HEIGHT + MENU_PADDING * 2,
    MAX_HEIGHT,
  );

  const dynamicStyles = StyleSheet.create({
    menu: {
      ...styles.menu,
      backgroundColor: menuBackground,
      borderColor: borderColor,
      height: calculatedHeight,
      width: MENU_WIDTH,
      // Posizione dinamica basata sul button
      left: (() => {
        if (!buttonPosition) return 0;
        const screenWidth = Dimensions.get("window").width;

        // Allinea il menu al bordo sinistro del bottone
        const proposedLeft = buttonPosition.x;

        // Se il menu andrebbe oltre il bordo destro dello schermo, allinealo a destra
        if (proposedLeft + MENU_WIDTH > screenWidth - 8) {
          return Math.max(8, screenWidth - MENU_WIDTH - 8);
        }

        return proposedLeft;
      })(),
      top: buttonPosition ? buttonPosition.y + buttonPosition.height + 4 : 40,
    },
  });

  const handleDismissWithAnimation = () => {
    // Animazione di chiusura
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.3,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 20,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: -10,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const handleSelect = (optionLabel: string) => {
    onSelectOption(optionLabel);

    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.error("Haptic feedback error:", error);
    }
    // Animazione veloce prima di chiudere
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 500,
        friction: 8,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const normalizeOption = (
    option: string | IContextMenuOption,
  ): IContextMenuOption => {
    if (typeof option === "string") {
      return { label: option };
    }
    return option;
  };

  return (
    <>
      {/* Overlay trasparente per catturare i tap al di fuori */}
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismissWithAnimation}
        />
      </Animated.View>
      <Animated.View
        style={[
          dynamicStyles.menu,
          {
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {options?.map((option, index) => {
            const normalizedOption = normalizeOption(option);
            const isDestructive = normalizedOption.destructive;
            const itemColor = isDestructive
              ? "#ff3b30"
              : normalizedOption.color || textColor;
            const isSelected = selectedOption === normalizedOption.label;
            const isLast = index === options.length - 1;

            return (
              <React.Fragment key={index}>
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItemContainer,
                    pressed && { backgroundColor: pressedBackground },
                  ]}
                  onPress={() => handleSelect(normalizedOption.label)}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      { color: itemColor },
                      isSelected && styles.menuItemTextSelected,
                    ]}
                  >
                    {normalizedOption.label}
                  </Text>
                  {normalizedOption.icon && (
                    <Ionicons
                      name={normalizedOption.icon}
                      size={20}
                      color={itemColor}
                      style={styles.menuItemIcon}
                    />
                  )}
                </Pressable>
                {!isLast && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: separatorColor },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: -1000,
    left: -1000,
    width: Dimensions.get("window").width + 2000,
    height: Dimensions.get("window").height + 2000,
    zIndex: 399,
    backgroundColor: "transparent",
  },
  menu: {
    position: "absolute",
    zIndex: 400,
    borderWidth: 0.5,
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
    overflow: "hidden",
  },
  scrollContent: {
    paddingVertical: MENU_PADDING,
  },
  menuItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: ITEM_HEIGHT,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: "400",
    flex: 1,
  },
  menuItemTextSelected: {
    fontWeight: "600",
  },
  menuItemIcon: {
    marginLeft: 12,
  },
  separator: {
    height: 0.5,
    marginLeft: 16,
  },
});

export default ContextMenu;
