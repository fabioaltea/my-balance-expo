import { View, StyleSheet, Pressable, Modal } from "react-native";
import React from "react";
import { ThemedText } from "../core/themed-text.native";
import { Picker } from "@react-native-picker/picker";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Account } from "@/state";

export interface CompactAccountPickerProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

/**
 * Compact account picker for landscape command bar
 * Base version - use .native.tsx or .web.tsx for platform-specific implementations
 */
const CompactAccountPicker: React.FC<CompactAccountPickerProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
}) => {
  const [pickerVisible, setPickerVisible] = React.useState(false);

  const backgroundColor = useThemeColor(
    { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.1)" },
    "background",
  );
  const modalBackground = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1e" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)" },
    "cardBorder",
  );
  const handleColor = useThemeColor(
    { light: "rgba(0, 0, 0, 0.3)", dark: "rgba(255, 255, 255, 0.3)" },
    "cardBorder",
  );

  const handleSelectOption = (value: string) => {
    setSelectedAccount(value);
  };

  // Display label
  const displayLabel =
    selectedAccount === "All" ? "All accounts" : selectedAccount;

  return (
    <>
      <Pressable
        style={[styles.pressable, { backgroundColor }]}
        onPress={() => setPickerVisible(true)}
      >
        <ThemedText style={styles.label}>{displayLabel}</ThemedText>
        <ThemedText style={styles.chevron}>▾</ThemedText>
      </Pressable>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPickerVisible(false)}
          />
          <View
            style={[
              styles.pickerContainer,
              { backgroundColor: modalBackground },
            ]}
          >
            {/* Drag handle */}
            <View
              style={[styles.dragHandle, { backgroundColor: handleColor }]}
            />

            <View
              style={[styles.pickerHeader, { borderBottomColor: borderColor }]}
            >
              <ThemedText style={styles.headerTitle}>Select Account</ThemedText>
              <Pressable
                onPress={() => setPickerVisible(false)}
                style={styles.doneButtonContainer}
              >
                <ThemedText style={styles.doneButton}>Done</ThemedText>
              </Pressable>
            </View>

            <Picker
              selectedValue={selectedAccount}
              onValueChange={handleSelectOption}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {accounts.map((account) => (
                <Picker.Item
                  key={account.name}
                  label={account.name === "All" ? "All accounts" : account.name}
                  value={account.name}
                />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  doneButtonContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  doneButton: {
    fontSize: 17,
    fontWeight: "600",
    color: "#007AFF",
  },
  picker: {
    width: "100%",
    height: 200,
  },
  pickerItem: {
    fontSize: 20,
    height: 200,
  },
});

export default CompactAccountPicker;
