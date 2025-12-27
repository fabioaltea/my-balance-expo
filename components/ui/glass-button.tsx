import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

type GlassButtonType = "add" | "search";

type Props = {
  onPress: () => void;
  style?: ViewStyle;
  type?: GlassButtonType;
  text?: string;
  size?: number; // icon/text size
  accessibilityLabel?: string;
};

const GlassButton = ({
  onPress,
  style,
  type = "add",
  text,
  size = 24,
  accessibilityLabel,
}: Props) => {
  const scheme = useColorScheme() ?? "light";
  const iconColor = useThemeColor({}, "text");
  const dynamicBackground =
    scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)";
  const dynamicBorder =
    scheme === "dark" ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.35)";
  const sheenColors =
    scheme === "dark"
      ? [
          "rgba(62, 62, 62, 0.35)",
          "rgba(255,255,255,0.12)",
          "rgba(255,255,255,0.04)",
        ]
      : [
          "rgba(144, 143, 143, 0.55)",
          "rgba(131, 131, 131, 0.15)",
          "rgba(255, 255, 255, 0.74)",
        ];
  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Haptic feedback error:", error);
    }
    onPress();
  };

  return (
    <View pointerEvents="box-none" style={[styles.buttonWrapper, style]}>
      <Pressable
        style={[
          styles.glassButton,
          { backgroundColor: dynamicBackground, borderColor: dynamicBorder },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ??
          (text ? text : type === "search" ? "Search" : "Add")
        }
      >
        {isLiquidGlassAvailable() ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            // Let the system pick appropriate tint; can override with theme
            tintColor={undefined}
          />
        ) : (
          <>
            {/* Fallback blur + sheen for non-iOS 26 platforms */}
            <BlurView
              tint={scheme}
              intensity={40}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={sheenColors}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {text ? (
          <Text style={{ color: iconColor, fontSize: size, fontWeight: "600" }}>
            {text}
          </Text>
        ) : (
          <Ionicons
            name={type === "search" ? "search" : "add"}
            size={size}
            color={iconColor}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    zIndex: 100,
  },
  glassButton: {
    width: 48,
    height: 48,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 0.35,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default GlassButton;
