import { View, StyleSheet, Pressable } from "react-native";
import React from "react";
import { ThemedText } from "../core/themed-text";
import ContextMenu from "./context-menu";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Account } from "@/state";

export interface CompactAccountPickerProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

/**
 * Compact account picker for landscape command bar
 * iOS 26 style with pill shape and dropdown
 */
const CompactAccountPicker: React.FC<CompactAccountPickerProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [buttonPosition, setButtonPosition] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>();
  const buttonRef = React.useRef<View>(null);

  const backgroundColor = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.1)" },
    "background"
  );
  const textColor = useThemeColor({}, "text");

  const handleSelectOption = (option: string) => {
    setSelectedAccount(option);
    setMenuOpen(false);
  };

  const handleOpenMenu = () => {
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setButtonPosition({ x: pageX, y: pageY, width, height });
    });
    setMenuOpen(true);
  };

  const handleDismissMenu = () => {
    setMenuOpen(false);
  };

  // Display label
  const displayLabel = selectedAccount === "All" ? "All accounts" : selectedAccount;

  return (
    <View ref={buttonRef}>
      <Pressable
        style={[styles.pressable, { backgroundColor }]}
        onPress={handleOpenMenu}
      >
        <ThemedText style={styles.label}>{displayLabel}</ThemedText>
        <ThemedText style={styles.chevron}>▾</ThemedText>
      </Pressable>
      {menuOpen && buttonPosition && (
        <ContextMenu
          options={accounts.map((a) => a.name === "All" ? "All accounts" : a.name)}
          onSelectOption={(option) => handleSelectOption(option === "All accounts" ? "All" : option)}
          onDismiss={handleDismissMenu}
          selectedOption={displayLabel}
          buttonPosition={buttonPosition}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 10,
    opacity: 0.6,
  },
});

export default CompactAccountPicker;
