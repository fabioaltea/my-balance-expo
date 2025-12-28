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

export interface IContextMenuProps {
  options: string[];
  selectedOption: string;
  onSelectOption: (option: string) => void;
  onDismiss?: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

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
    { light: "#edededee", dark: "#2a2a2a" },
    "cardBackground"
  );
  const borderColor = useThemeColor({ light: "#ccc", dark: "#555" }, "border");
  const textColor = useThemeColor({}, "text");
  const selectedBackground = useThemeColor(
    { light: "#ccc", dark: "#444" },
    "tabIconDefault"
  );

  const dynamicStyles = StyleSheet.create({
    menu: {
      ...styles.menu,
      backgroundColor: menuBackground,
      borderColor: borderColor,
      // Posizione dinamica basata sul button
      left: (() => {
        if (!buttonPosition) return 0;
        const screenWidth = Dimensions.get("window").width;
        const menuWidth = 150; // larghezza del menu
        const proposedLeft = buttonPosition.x;

        // Se il menu andrebbe oltre il bordo destro, allinealo a destra del button
        if (proposedLeft + menuWidth > screenWidth) {
          return Math.max(
            0,
            buttonPosition.x + buttonPosition.width - menuWidth
          );
        }

        return proposedLeft;
      })(),
      top: 40, // 5px di offset
    },
    menuItem: {
      ...styles.menuItem,
      color: textColor,
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

  const handleSelect = (option: string) => {
    
        onSelectOption(option);

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
        <ScrollView showsVerticalScrollIndicator={false}>
          {options?.map((option) => (
            <Pressable
              style={styles.menuItem}
              key={option}
              onPress={() => handleSelect(option)}
            >
              <Text
                style={{
                  ...dynamicStyles.menuItem,
                  backgroundColor:
                    selectedOption === option
                      ? selectedBackground
                      : "transparent",
                }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
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
    height: 200,
    width: 150,
    position: "absolute",
    zIndex: 400,
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  menuItem: {
    padding: 10,
    fontSize: 16,
    borderRadius: 15,
  },
});

export default ContextMenu;
