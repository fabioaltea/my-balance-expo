import { useState, useEffect, useCallback } from "react";
import { Platform, Dimensions, ScaledSize } from "react-native";

export type PlatformType = "web" | "ios" | "android";
export type DeviceType = "mobile" | "tablet" | "desktop";
export type OrientationType = "portrait" | "landscape";

export interface PlatformInfo {
  /** Current platform: 'web', 'ios', or 'android' */
  platform: PlatformType;
  /** Whether running on web */
  isWeb: boolean;
  /** Whether running on native (iOS or Android) */
  isNative: boolean;
  /** Device type based on screen width */
  deviceType: DeviceType;
  /** Current orientation */
  orientation: OrientationType;
  /** Screen dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Whether to show sidebar navigation (desktop web in landscape) */
  showSidebar: boolean;
  /** Whether to show bottom tabs (mobile/tablet or portrait) */
  showBottomTabs: boolean;
}

// Breakpoints for device type detection
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.mobile) return "mobile";
  if (width < BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

function getOrientation(width: number, height: number): OrientationType {
  return width > height ? "landscape" : "portrait";
}

function getPlatformInfo(dimensions: ScaledSize): PlatformInfo {
  const { width, height } = dimensions;
  const platform = Platform.OS as PlatformType;
  const isWeb = platform === "web";
  const isNative = !isWeb;
  const deviceType = getDeviceType(width);
  const orientation = getOrientation(width, height);

  // On web desktop in landscape, show sidebar; otherwise show bottom tabs
  // On native, always use native tabs (handled by NativeTabs component)
  const showSidebar = isWeb && deviceType === "desktop" && orientation === "landscape";
  const showBottomTabs = isWeb && !showSidebar;

  return {
    platform,
    isWeb,
    isNative,
    deviceType,
    orientation,
    dimensions: { width, height },
    showSidebar,
    showBottomTabs,
  };
}

/**
 * Hook to detect platform, device type, and orientation.
 * Automatically updates when screen dimensions change.
 */
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() =>
    getPlatformInfo(Dimensions.get("window"))
  );

  const handleDimensionChange = useCallback(
    ({ window }: { window: ScaledSize; screen: ScaledSize }) => {
      setPlatformInfo(getPlatformInfo(window));
    },
    []
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", handleDimensionChange);
    return () => subscription.remove();
  }, [handleDimensionChange]);

  return platformInfo;
}

/**
 * Simple check if we're on web platform.
 * Use this for conditional imports or simple platform checks.
 */
export const isWeb = Platform.OS === "web";

/**
 * Simple check if we're on native platform.
 */
export const isNative = Platform.OS !== "web";
