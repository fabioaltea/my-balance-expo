import React from "react";
import { View } from "react-native";

interface LandscapeCommandBarProps {
  accountSelector: React.ReactNode;
  periodSelector: React.ReactNode;
  rightContent?: React.ReactNode;
}

/** Native stub – CommandBar is only used in the web landscape layout */
export function CommandBar(_props: LandscapeCommandBarProps) {
  return <View />;
}

export default CommandBar;
