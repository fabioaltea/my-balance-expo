import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import ChipButton from "@/components/ui/chip-button";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Haptics from "expo-haptics";
import Input from "@/components/ui/text-box";
import TextBox from "@/components/ui/text-box";
import Card from "@/components/card";
import List from "@/components/ui/list";
import InputGroup from "@/components/ui/input-group";

const AddView: React.FC = () => {
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Categoria");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState([{ id: 1, amount: 0 }]);
  const [location, setLocation] = useState("sestu");

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const cardColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "tabIconDefault"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault"
  );

  const categories = [
    "Spesa",
    "Trasporti",
    "Ristoranti",
    "Shopping",
    "Salute",
    "Sport",
    "Viaggi",
    "Casa",
    "Altro",
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const addTransaction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newId = Math.max(...transactions.map((t) => t.id)) + 1;
    setTransactions([...transactions, { id: newId, amount: 0 }]);
  };

  const updateTransactionAmount = (id: number, amount: string) => {
    const numAmount = parseFloat(amount.replace(",", ".")) || 0;
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, amount: numAmount } : t))
    );
  };

  const removeTransaction = (id: number) => {
    if (transactions.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert("Errore", "Inserisci una descrizione");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Successo", "Movimento inserito correttamente");
    // Here you would typically save the data
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: backgroundColor,
    },
    inputCard: {
      backgroundColor: cardColor,
      borderColor: borderColor,
    },
    input: {
      color: textColor,
    },
    dateText: {
      color: textColor,
    },
    totalContainer: {
      backgroundColor: "#2F4F3F",
    },
    submitButton: {
      backgroundColor: "#4a4a4a",
    },
  });

  return (
    <View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          Inserisci Movimento
        </ThemedText>
          <InputGroup>
              <TextBox
                value={description}
                onChange={setDescription}
                label="Description"
              />
              <TextBox
                value={selectedCategory}
                onChange={setSelectedCategory}
                label="Category"
              />
              <TextBox
                value={selectedDate.toLocaleDateString("it-IT")}
                onChange={setSelectedDate}
                label="Date"
              />
          </InputGroup>
        {/* Transactions Section */}
        {/* <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Transazioni
          </ThemedText>

          {transactions.map((transaction, index) => (
            <View
              key={transaction.id}
              style={[styles.transactionRow, dynamicStyles.inputCard]}
            >
              <View style={styles.transactionContent}>
                <TextInput
                  style={[styles.amountInput, dynamicStyles.input]}
                  value={
                    transaction.amount === 0
                      ? ""
                      : transaction.amount.toFixed(2).replace(".", ",")
                  }
                  onChangeText={(text) =>
                    updateTransactionAmount(transaction.id, text)
                  }
                  placeholder="0,00"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                />
                <ThemedText>€</ThemedText>
              </View>
              {transactions.length > 1 && (
                <Pressable
                  onPress={() => removeTransaction(transaction.id)}
                  style={styles.removeButton}
                >
                  <IconSymbol
                    name="minus.circle.fill"
                    size={20}
                    color="#ff4444"
                  />
                </Pressable>
              )}
              {index === transactions.length - 1 && (
                <Pressable onPress={addTransaction} style={styles.addButton}>
                  <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={placeholderColor}
                  />
                </Pressable>
              )}
            </View>
          ))}

          <Pressable
            onPress={addTransaction}
            style={styles.addTransactionButton}
          >
            <IconSymbol name="plus" size={24} color="#fff" />
          </Pressable>
        </View> */}

        {/* Location Section */}
        {/* <View style={[styles.inputCard, dynamicStyles.inputCard]}>
          <ThemedText style={styles.label}>Location</ThemedText>
          <ThemedText style={styles.locationText}>{location}</ThemedText>
          <View style={styles.mapPlaceholder}>
            <ThemedText style={styles.mapText}>Mappa - {location}</ThemedText>
            <ThemedText style={styles.mapSubtext}>
              Visualizza mappa più grande
            </ThemedText>
          </View>
        </View> */}
      </ScrollView>

      {/* Bottom Total and Submit */}
      {/* <View style={[styles.bottomSection, dynamicStyles.totalContainer]}>
        <ThemedText style={styles.totalLabel}>Importo totale:</ThemedText>
        <ThemedText style={styles.totalAmount}>
          {getTotalAmount().toFixed(2).replace(".", ",")}€
        </ThemedText>
        <Pressable
          onPress={handleSubmit}
          style={[styles.submitButton, dynamicStyles.submitButton]}
        >
          <ThemedText style={styles.submitText}>Inserisci</ThemedText>
        </Pressable>
      </View> */}
    </View>
  );
};

export default AddView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    marginBottom: 30,
    textAlign: "left",
  },
  inputCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 40,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 16,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  transactionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  amountInput: {
    fontSize: 16,
    textAlign: "right",
    flex: 1,
    marginRight: 8,
    paddingVertical: 4,
  },
  removeButton: {
    marginLeft: 12,
  },
  addButton: {
    marginLeft: 12,
  },
  addTransactionButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  locationText: {
    fontSize: 16,
    marginBottom: 12,
  },
  mapPlaceholder: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: {
    fontSize: 14,
    fontWeight: "600",
  },
  mapSubtext: {
    fontSize: 12,
    color: "#0066cc",
    marginTop: 4,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 8,
  },
  submitButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
