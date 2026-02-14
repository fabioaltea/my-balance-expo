import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useState, useRef, useEffect, ReactNode } from "react";
import { ThemedText } from "../core/themed-text";
import * as Haptics from "expo-haptics";
import GlassButton from "./glass-button";
import React from "react";

interface IModalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  children: ReactNode;
  maxHeight?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DEFAULT_MAX_HEIGHT = SCREEN_HEIGHT * 0.5;

const ModalPanel: React.FC<IModalPanelProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title,
  showConfirmButton = true,
  showCancelButton = true,
  confirmText = "Conferma",
  cancelText = "Annulla",
  children,
  maxHeight = DEFAULT_MAX_HEIGHT,
}) => {
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#1a1a1a" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );
  const overlayColor = useThemeColor(
    { light: "rgba(0,0,0,0.5)", dark: "rgba(0,0,0,0.7)" },
    "tabIconDefault",
  );

  const hideModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    hideModal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const dynamicStyles = StyleSheet.create({
    modalContent: {
      backgroundColor: backgroundColor,
      borderTopColor: borderColor,
      maxHeight: maxHeight,
    },
    overlay: {
      backgroundColor: overlayColor,
    },
  });

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        {/* Overlay - tappable to close */}
        <Pressable
          style={[styles.modalOverlay, dynamicStyles.overlay]}
          onPress={hideModal}
        />

        {/* Content panel - separate from overlay */}
        <Animated.View
          style={[
            styles.modalContent,
            dynamicStyles.modalContent,
            {
              opacity: opacityAnimation,
              transform: [
                {
                  translateY: slideAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [maxHeight, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Modal Header */}
          {(title || showCancelButton || showConfirmButton) && (
            <View style={styles.modalHeader}>
              {showCancelButton ? (
                <GlassButton onPress={hideModal} type="dismiss" />
              ) : (
                <View style={styles.spacer} />
              )}

              {title && (
                <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
                  {title}
                </ThemedText>
              )}

              {showConfirmButton ? (
                <GlassButton onPress={handleConfirm} type="confirm" />
              ) : (
                <View style={styles.spacer} />
              )}
            </View>
          )}

          {/* Modal Content */}
          <View style={styles.contentContainer}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  cancelText: {
    color: "#ff4444",
    fontSize: 16,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: "flex-end",
  },
  confirmText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  spacer: {
    width: 48,
    height: 48,
  },
  contentContainer: {
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexShrink: 1,
  },
});

export default ModalPanel;
