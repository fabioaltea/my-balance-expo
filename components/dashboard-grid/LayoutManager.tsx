import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDashboardLayout } from "./DashboardLayoutContext";
import * as Clipboard from "expo-clipboard";

interface LayoutManagerProps {
  visible: boolean;
  onClose: () => void;
}

export function LayoutManager({ visible, onClose }: LayoutManagerProps) {
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({ light: "#e0e0e0", dark: "#333" }, "text");

  const { exportLayoutJSON, importLayoutJSON, resetLayout } =
    useDashboardLayout();

  const [importText, setImportText] = useState("");
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [exportedJSON, setExportedJSON] = useState("");

  const handleExport = () => {
    const json = exportLayoutJSON();
    setExportedJSON(json);
  };

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(exportedJSON);
      Alert.alert("Successo", "Layout copiato negli appunti");
    } catch (error) {
      Alert.alert("Errore", "Impossibile copiare negli appunti");
    }
  };

  const handleImport = () => {
    const success = importLayoutJSON(importText);
    if (success) {
      Alert.alert("Successo", "Layout importato correttamente", [
        { text: "OK", onPress: onClose },
      ]);
      setImportText("");
    } else {
      Alert.alert(
        "Errore",
        "JSON non valido. Controlla la struttura del layout.",
      );
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setImportText(text);
    } catch (error) {
      Alert.alert("Errore", "Impossibile incollare dagli appunti");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Layout",
      "Sei sicuro di voler ripristinare il layout predefinito?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetLayout();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Text style={[styles.title, { color: textColor }]}>
              Gestione Layout
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={textColor} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === "export" && styles.activeTab]}
              onPress={() => setActiveTab("export")}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: textColor },
                  activeTab === "export" && styles.activeTabText,
                ]}
              >
                Esporta
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === "import" && styles.activeTab]}
              onPress={() => setActiveTab("import")}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: textColor },
                  activeTab === "import" && styles.activeTabText,
                ]}
              >
                Importa
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {activeTab === "export" ? (
              <View>
                <Text style={[styles.description, { color: textColor }]}>
                  Esporta la configurazione attuale del layout per salvarla o
                  condividerla.
                </Text>

                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleExport}
                >
                  <MaterialIcons name="download" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Genera JSON</Text>
                </Pressable>

                {exportedJSON ? (
                  <>
                    <View
                      style={[
                        styles.jsonContainer,
                        { backgroundColor, borderColor },
                      ]}
                    >
                      <ScrollView
                        style={styles.jsonScroll}
                        nestedScrollEnabled={true}
                      >
                        <Text style={[styles.jsonText, { color: textColor }]}>
                          {exportedJSON}
                        </Text>
                      </ScrollView>
                    </View>

                    <Pressable
                      style={[styles.button, styles.secondaryButton]}
                      onPress={handleCopyToClipboard}
                    >
                      <MaterialIcons
                        name="content-copy"
                        size={20}
                        color="#2F4F3F"
                      />
                      <Text style={[styles.buttonText, { color: "#2F4F3F" }]}>
                        Copia negli Appunti
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : (
              <View>
                <Text style={[styles.description, { color: textColor }]}>
                  Incolla un JSON di configurazione per importare un layout.
                </Text>

                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handlePasteFromClipboard}
                >
                  <MaterialIcons
                    name="content-paste"
                    size={20}
                    color="#2F4F3F"
                  />
                  <Text style={[styles.buttonText, { color: "#2F4F3F" }]}>
                    Incolla dagli Appunti
                  </Text>
                </Pressable>

                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor, borderColor, color: textColor },
                  ]}
                  multiline
                  value={importText}
                  onChangeText={setImportText}
                  placeholder="Incolla qui il JSON del layout..."
                  placeholderTextColor="#999"
                />

                <Pressable
                  style={[
                    styles.button,
                    styles.primaryButton,
                    !importText && styles.disabledButton,
                  ]}
                  onPress={handleImport}
                  disabled={!importText}
                >
                  <MaterialIcons name="upload" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Importa Layout</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <Pressable
              style={[styles.button, styles.dangerButton]}
              onPress={handleReset}
            >
              <MaterialIcons name="restore" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reset Layout</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2F4F3F",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2F4F3F",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#2F4F3F",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2F4F3F",
  },
  dangerButton: {
    backgroundColor: "#d32f2f",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  jsonContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxHeight: 300,
  },
  jsonScroll: {
    maxHeight: 280,
  },
  jsonText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 200,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    textAlignVertical: "top",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});

export default LayoutManager;
