import React, { createContext, useContext, ReactNode } from "react";
import { usePlatform, PlatformInfo } from "@/hooks/use-platform";

const PlatformContext = createContext<PlatformInfo | null>(null);

interface PlatformProviderProps {
  children: ReactNode;
}

/**
 * Provider that makes platform information available throughout the app.
 * Wraps the usePlatform hook in a context for easy access.
 */
export function PlatformProvider({ children }: PlatformProviderProps) {
  const platformInfo = usePlatform();

  return (
    <PlatformContext.Provider value={platformInfo}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to access platform information from context.
 * Must be used within a PlatformProvider.
 */
export function usePlatformContext(): PlatformInfo {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error("usePlatformContext must be used within a PlatformProvider");
  }
  return context;
}

/**
 * Component that conditionally renders children based on platform.
 */
interface PlatformSwitchProps {
  web?: ReactNode;
  native?: ReactNode;
  ios?: ReactNode;
  android?: ReactNode;
  children?: ReactNode; // fallback
}

export function PlatformSwitch({
  web,
  native,
  ios,
  android,
  children,
}: PlatformSwitchProps) {
  const { platform, isWeb, isNative } = usePlatformContext();

  if (isWeb && web !== undefined) return <>{web}</>;
  if (platform === "ios" && ios !== undefined) return <>{ios}</>;
  if (platform === "android" && android !== undefined) return <>{android}</>;
  if (isNative && native !== undefined) return <>{native}</>;

  return <>{children}</>;
}

/**
 * Component that conditionally renders based on device type.
 */
interface DeviceSwitchProps {
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
  children?: ReactNode; // fallback
}

export function DeviceSwitch({
  mobile,
  tablet,
  desktop,
  children,
}: DeviceSwitchProps) {
  const { deviceType } = usePlatformContext();

  if (deviceType === "mobile" && mobile !== undefined) return <>{mobile}</>;
  if (deviceType === "tablet" && tablet !== undefined) return <>{tablet}</>;
  if (deviceType === "desktop" && desktop !== undefined) return <>{desktop}</>;

  return <>{children}</>;
}

/**
 * Component that conditionally renders based on orientation.
 */
interface OrientationSwitchProps {
  portrait?: ReactNode;
  landscape?: ReactNode;
  children?: ReactNode; // fallback
}

export function OrientationSwitch({
  portrait,
  landscape,
  children,
}: OrientationSwitchProps) {
  const { orientation } = usePlatformContext();

  if (orientation === "portrait" && portrait !== undefined) return <>{portrait}</>;
  if (orientation === "landscape" && landscape !== undefined) return <>{landscape}</>;

  return <>{children}</>;
}
