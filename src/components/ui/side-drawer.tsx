import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  width?: number | string; // percentage or fixed width
  side?: "right" | "left";
}

/**
 * SideDrawer - A sliding drawer overlay
 * Opens from the right (default) or left, covers specified width (default 40%)
 * Full height, high z-index, content underneath doesn't shift
 */
const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  children,
  width = "40%",
  side = "right",
}) => {
  const backgroundColor = useThemeColor({ light: "#FFFFFF" }, "menuBackground");
  const screenWidth = Dimensions.get("window").width;

  // Calculate drawer width in pixels for animation
  const drawerWidth = typeof width === "string" && width.endsWith("%")
    ? (parseFloat(width) / 100) * screenWidth
    : typeof width === "number"
      ? width
      : screenWidth * 0.4;

  // Initialize off-screen
  const hiddenValue = side === "left" ? -drawerWidth : drawerWidth;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(hiddenValue)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: hiddenValue,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, drawerWidth, hiddenValue]);

  return (
    <View style={styles.overlay} pointerEvents={isOpen ? "auto" : "none"}>
      {/* Semi-transparent backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
      </Animated.View>

      {/* Animated drawer container - handles animation only */}
      <Animated.View
        style={[
          side === "left" ? styles.drawerAnimatedContainerLeft : styles.drawerAnimatedContainerRight,
          {
            width: drawerWidth,
            transform: [{ translateX }],
          }
        ]}
      >
        {/* Content wrapper - handles padding and background */}
        <View style={[styles.drawerContent, { backgroundColor }]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropPressable: {
    flex: 1,
  },
  drawerAnimatedContainerRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    padding: 15,
  },
  drawerAnimatedContainerLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    padding: 15,
  },
  drawerContent: {
    flex: 1,
    padding: 10,
    borderRadius: 35,
    // Shadow follows the borderRadius
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 20,
  },
});

export default SideDrawer;
