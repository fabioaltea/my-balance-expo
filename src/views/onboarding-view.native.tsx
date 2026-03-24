import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import Pager from "@/src/components/ui/pager";
import Card from "@/src/components/core/card";
import List from "@/src/components/ui/list";
import AccountModal from "@/src/components/ui/account-modal";
import IconSymbol from "@/src/components/ui/icon-symbol";
import { DEFAULT_TEXT_COLOR } from "@/src/constants/colors";
import { HttpHelper, AuthenticationError } from "@/src/helpers/HttpHelper";
import { AccountsApiHelper } from "@/src/helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "@/src/helpers/CategoriesApiHelper";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import InputGroup from "@/src/components/ui/input-group";
import ModalPanel from "@/src/components/ui/modal-panel";
import CategoryPanel from "@/src/components/ui/category-panel";
import { useAuthContext } from "@/src/state/AuthProvider";
import { ThemedText } from "@/src/components/core/themed-text";
import GlassButton from "@/src/components/ui/glass-button";

// ===========================
// Types
// ===========================

interface OnboardingAccount {
  name: string;
  balance: number;
  color: string;
}

interface OnboardingCategory {
  name: string;
  icon: string;
  color: string;
  selected: boolean;
}

// ===========================
// Default Categories
// ===========================

const DEFAULT_CATEGORIES: OnboardingCategory[] = [
  { name: "Groceries", icon: "restaurant", color: "#4CAF50", selected: true },
  {
    name: "Transport",
    icon: "directions-car",
    color: "#2196F3",
    selected: true,
  },
  { name: "Home", icon: "home", color: "#FF9800", selected: true },
  { name: "Health", icon: "local-hospital", color: "#F44336", selected: true },
  {
    name: "Entertainment",
    icon: "sports-esports",
    color: "#9C27B0",
    selected: true,
  },
  { name: "Work", icon: "work", color: "#607D8B", selected: true },
  {
    name: "Investments",
    icon: "trending-up",
    color: "#795548",
    selected: true,
  },
  { name: "Other", icon: "more-horiz", color: "#9E9E9E", selected: true },
];

// ===========================
// Helpers
// ===========================

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
};

const getTodayFormatted = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// ===========================
// Main Component
// ===========================

const OnboardingView: React.FC = () => {
  const { reloadData, logout } = useAuthContext();

  // Theme
  const menuBackground = useThemeColor({}, "menuBackground");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );

  // Pager state
  const [currentPage, setCurrentPage] = useState(0);

  // Step 1 state
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [sheetCreated, setSheetCreated] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  // Step 2 state
  const [accounts, setAccounts] = useState<OnboardingAccount[]>([]);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(
    null,
  );
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);

  // Step 3 state
  const [categories, setCategories] =
    useState<OnboardingCategory[]>(DEFAULT_CATEGORIES);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<
    number | null
  >(null);
  const [newCategoryIcon, setNewCategoryIcon] = useState<string>("label");
  const [newCategoryColor, setNewCategoryColor] = useState<string>("#2196F3");
  const [newCategoryName, setNewCategoryName] = useState<string>("");

  // ===========================
  // Step 1 handlers
  // ===========================

  const handleCreateSheet = async () => {
    setIsCreatingSheet(true);
    try {
      const createResponse = await HttpHelper.post("/spreadsheet/create", { title: "MyBalance" });
      const newSpreadsheetId = createResponse.data?.spreadsheetId;
      await HttpHelper.post("/spreadsheet/initialize", { spreadsheetId: newSpreadsheetId });
      setSpreadsheetId(newSpreadsheetId);
      setSheetCreated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      if (error instanceof AuthenticationError) {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => logout() },
        ]);
        return;
      }
      Alert.alert("Error", "Could not create spreadsheet. Please try again.");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // ===========================
  // Step 2 handlers
  // ===========================

  const handleAddAccount = () => {
    setEditingAccountIndex(null);
    setAccountModalVisible(true);
  };

  const handleEditAccount = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingAccountIndex(index);
    setAccountModalVisible(true);
  };

  const handleConfirmAccount = (data: {
    name: string;
    color: string;
    balance: number;
  }) => {
    if (editingAccountIndex !== null) {
      setAccounts((prev) =>
        prev.map((a, i) =>
          i === editingAccountIndex
            ? { name: data.name, balance: data.balance, color: data.color }
            : a,
        ),
      );
    } else {
      setAccounts((prev) => [
        ...prev,
        { name: data.name, balance: data.balance, color: data.color },
      ]);
    }
    setAccountModalVisible(false);
    setEditingAccountIndex(null);
  };

  const handleRemoveAccount = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Account", `Remove "${accounts[index].name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          setAccounts((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const getTotalBalance = (): number => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  };

  const handleSaveAccounts = async () => {
    if (accounts.length === 0) return;
    setIsSavingAccounts(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentPage(2);
    } catch (error) {
      console.error("Error saving accounts:", error);
      Alert.alert("Error", "Could not save accounts. Please try again.");
    } finally {
      setIsSavingAccounts(false);
    }
  };

  // ===========================
  // Step 3 handlers
  // ===========================

  const toggleCategory = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c)),
    );
  };

  const handleAddCustomCategory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategoryIndex(null);
    setNewCategoryName("");
    setNewCategoryIcon("label");
    setNewCategoryColor("#2196F3");
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const category = categories[index];
    setEditingCategoryIndex(index);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon);
    setNewCategoryColor(category.color);
    setCategoryModalVisible(true);
  };

  const handleConfirmCustomCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    if (editingCategoryIndex !== null) {
      // Editing existing category
      setCategories((prev) =>
        prev.map((c, i) =>
          i === editingCategoryIndex
            ? {
                ...c,
                name: newCategoryName.trim(),
                icon: newCategoryIcon,
                color: newCategoryColor,
              }
            : c,
        ),
      );
    } else {
      // Adding new category
      const newCategory: OnboardingCategory = {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: newCategoryColor,
        selected: true,
      };
      setCategories((prev) => [...prev, newCategory]);
    }

    setCategoryModalVisible(false);
    setEditingCategoryIndex(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleComplete = async () => {
    if (!spreadsheetId) return;
    const selectedCategories = categories.filter((c) => c.selected);
    if (selectedCategories.length === 0) {
      Alert.alert("Warning", "Select at least one category.");
      return;
    }
    setIsSavingCategories(true);
    try {
      // 1. Create accounts
      for (const account of accounts) {
        await AccountsApiHelper.createAccount(spreadsheetId, {
          name: account.name,
          balance: account.balance,
          color: account.color,
          textColor: DEFAULT_TEXT_COLOR,
        });
      }

      // 2. Create categories
      for (const category of selectedCategories) {
        await CategoriesApiHelper.createCategory(spreadsheetId, {
          name: category.name,
          color: category.color,
          icon: category.icon,
        });
      }

      // 3. Create single "MyBalance Start" movement with one transaction per account
      const today = getTodayFormatted();
      const accountsWithBalance = accounts.filter((a) => a.balance > 0);
      if (accountsWithBalance.length > 0) {
        const movementId = Crypto.randomUUID();
        await TransactionsApiHelper.createMovement(spreadsheetId, {
          movementId,
          description: "MyBalance Start",
          category: "Initial Balance",
          date: today,
          type: "in",
          transactions: accountsWithBalance.map((account) => ({
            transactionId: Crypto.randomUUID(),
            description: "MyBalance Start",
            category: "Initial Balance",
            amount: account.balance,
            type: "in",
            account: account.name,
            date: today,
          })),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Reload user profile - spreadsheet_id is now set, so mode will switch to "dashboard"
      await reloadData();
    } catch (error) {
      console.error("Error completing setup:", error);
      if (error instanceof AuthenticationError) {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => logout() },
        ]);
        return;
      }
      Alert.alert("Error", "Could not complete setup. Please try again.");
    } finally {
      setIsSavingCategories(false);
    }
  };

  // ===========================
  // Step Indicator
  // ===========================

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            {
              backgroundColor: step === currentPage ? "#2F4F3F" : borderColor,
            },
          ]}
        />
      ))}
    </View>
  );

  // ===========================
  // Step 1: Privacy & Setup
  // ===========================

  const Step1 = () => (
    <View style={styles.stepContainer}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={[styles.stepHeader, { paddingHorizontal: 16, paddingTop: 48 }]}
        >
          <ThemedText type="title" style={styles.title}>
            Welcome to MyBalance
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, { fontSize: 17, lineHeight: 25 }]}
          >
            MyBalance helps you track your income and expenses with ease. Your
            financial data is securely stored in a Google Sheets spreadsheet in
            your Google account — only you have access.{"\n\n"}
            No external servers, no third-party analytics: your finances stay
            private and fully under your control.
          </ThemedText>
        </View>

        {sheetCreated && (
          <View style={styles.successBadge}>
            <IconSymbol name="check-circle" size={24} color="#27AE60" />
            <ThemedText style={styles.successText}>
              Spreadsheet created successfully!
            </ThemedText>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <Card>
          <View style={styles.privacySection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Privacy Policy
            </ThemedText>
            <ThemedText style={styles.privacyText}>
              By accepting, you authorize MyBalance to create and manage a
              Google Sheets spreadsheet in your account to store your financial
              data. Your data stays in your Google Drive and is not shared with
              third parties.
            </ThemedText>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPrivacyAccepted(!privacyAccepted);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor },
                  privacyAccepted && styles.checkboxChecked,
                ]}
              >
                {privacyAccepted && (
                  <IconSymbol name="check" size={18} color="#fff" />
                )}
              </View>
              <ThemedText style={styles.checkboxLabel}>
                I accept the privacy policy and authorize the spreadsheet
                creation
              </ThemedText>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.totalContainer}>
        <Pressable
          style={[
            styles.submitButton,
            (!privacyAccepted || isCreatingSheet) &&
              !sheetCreated &&
              styles.buttonDisabledLight,
          ]}
          onPress={sheetCreated ? () => setCurrentPage(1) : handleCreateSheet}
          disabled={!sheetCreated && (!privacyAccepted || isCreatingSheet)}
        >
          {isCreatingSheet ? (
            <ActivityIndicator color="#2F4F3F" />
          ) : (
            <ThemedText style={styles.submitText}>
              {sheetCreated ? "Next" : "Create your spreadsheet"}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );

  // ===========================
  // Step 2: Accounts
  // ===========================

  const Step2 = () => (
    <View style={styles.stepContainer}>
      <View
        style={[styles.stepHeader, { paddingHorizontal: 16, paddingTop: 48 }]}
      >
        <ThemedText type="title" style={styles.title}>
          Your Accounts
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Add your bank accounts, cards and cash with the current balance.
        </ThemedText>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {accounts.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              name="account-balance-wallet"
              size={48}
              color={borderColor}
            />
            <ThemedText style={[styles.emptyText, { color: borderColor }]}>
              No accounts added
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: borderColor }]}>
              Tap + to add your first account
            </ThemedText>
          </View>
        )}
        <InputGroup>
          {accounts.length > 0 && (
            <ScrollView
              style={{ maxHeight: 390 }}
              showsVerticalScrollIndicator={false}
            >
              <List>
                {accounts.map((account, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleEditAccount(index)}
                    onLongPress={() => handleRemoveAccount(index)}
                    delayLongPress={300}
                  >
                    <View style={styles.accountRow}>
                      <View style={styles.accountLeft}>
                        <View
                          style={[
                            styles.colorDot,
                            {
                              backgroundColor: account.color,
                              borderColor: DEFAULT_TEXT_COLOR,
                            },
                          ]}
                        />
                        <ThemedText style={styles.accountName}>
                          {account.name}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.balanceText}>
                        {formatCurrency(account.balance)}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </List>
            </ScrollView>
          )}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleAddAccount();
            }}
            style={styles.addButton}
          >
            <IconSymbol name="add" size={24} color="#fff" />
          </Pressable>
        </InputGroup>
      </View>

      {/* Bottom total section */}
      <View style={styles.totalContainer}>
        {accounts.length > 0 && (
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Total:</ThemedText>
            <ThemedText style={styles.totalAmount}>
              {formatCurrency(getTotalBalance())}
            </ThemedText>
          </View>
        )}
        <Pressable
          style={[
            styles.submitButton,
            (accounts.length === 0 || isSavingAccounts) &&
              styles.buttonDisabledLight,
          ]}
          onPress={handleSaveAccounts}
          disabled={accounts.length === 0 || isSavingAccounts}
        >
          {isSavingAccounts ? (
            <ActivityIndicator color="#2F4F3F" />
          ) : (
            <ThemedText style={styles.submitText}>Next</ThemedText>
          )}
        </Pressable>
      </View>

      <AccountModal
        isVisible={accountModalVisible}
        onClose={() => {
          setAccountModalVisible(false);
          setEditingAccountIndex(null);
        }}
        onConfirm={handleConfirmAccount}
        title={editingAccountIndex !== null ? "Edit Account" : "New Account"}
        balanceEditable
        initialData={
          editingAccountIndex !== null
            ? accounts[editingAccountIndex]
            : undefined
        }
      />
    </View>
  );

  // ===========================
  // Step 3: Categories
  // ===========================

  const Step3 = () => (
    <View style={styles.stepContainer}>
      <View
        style={[styles.stepHeader, { paddingHorizontal: 16, paddingTop: 48 }]}
      >
        <ThemedText type="title" style={styles.title}>
          Your Categories
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Select the categories to organize your expenses and income.
        </ThemedText>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {categories.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="category" size={48} color={borderColor} />
            <ThemedText style={[styles.emptyText, { color: borderColor }]}>
              No categories
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: borderColor }]}>
              Tap + to add your first category
            </ThemedText>
          </View>
        )}
        <InputGroup>
          {categories.length > 0 && (
            <ScrollView
              style={{ maxHeight: 390 }}
              showsVerticalScrollIndicator={false}
            >
              <List>
                {categories.map((category, index) => (
                  <Pressable
                    key={index}
                    onPress={() => toggleCategory(index)}
                    onLongPress={() => handleEditCategory(index)}
                    delayLongPress={300}
                  >
                    <View style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View
                          style={[
                            styles.categoryIcon,
                            {
                              backgroundColor: category.selected
                                ? category.color
                                : borderColor,
                            },
                          ]}
                        >
                          <IconSymbol
                            name={category.icon}
                            size={22}
                            color="#FFFFFF"
                          />
                        </View>
                        <ThemedText
                          style={[
                            styles.categoryName,
                            !category.selected && { opacity: 0.4 },
                          ]}
                        >
                          {category.name}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor },
                          category.selected && styles.checkboxChecked,
                        ]}
                      >
                        {category.selected && (
                          <IconSymbol name="check" size={18} color="#fff" />
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </List>
            </ScrollView>
          )}
          <Pressable onPress={handleAddCustomCategory} style={styles.addButton}>
            <IconSymbol name="add" size={24} color="#fff" />
          </Pressable>
        </InputGroup>
      </View>

      {/* Bottom action */}
      <View style={styles.totalContainer}>
        {categories.length > 0 && (
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>
              {categories.filter((c) => c.selected).length} categories selected
            </ThemedText>
          </View>
        )}
        <Pressable
          style={[
            styles.submitButton,
            (accounts.length === 0 ||
              categories.filter((c) => c.selected).length === 0 ||
              isSavingCategories) &&
              styles.buttonDisabledLight,
          ]}
          onPress={handleComplete}
          disabled={
            accounts.length === 0 ||
            categories.filter((c) => c.selected).length === 0 ||
            isSavingCategories
          }
        >
          {isSavingCategories ? (
            <ActivityIndicator color="#2F4F3F" />
          ) : (
            <ThemedText style={styles.submitText}>Complete</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );

  // ===========================
  // Render
  // ===========================

  const handleMenuOption = (option: string) => {
    if (option === "Logout") {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => logout() },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: menuBackground }]}>
      <Pager
        selectedPage={currentPage}
        onPageSelected={setCurrentPage}
        scrollEnabled={currentPage > 0 || sheetCreated}
        style={styles.pager}
      >
        <Step1 />
        <Step2 />
        <Step3 />
      </Pager>
      <StepIndicator />

      {/* Menu button (top-right) */}
      <GlassButton
        type="menu"
        onPress={() => {}}
        style={styles.menuButton}
        contextMenuOptions={[
          {
            label: "Logout",
            icon: "log-out-outline",
            destructive: true,
          },
        ]}
        contextMenuActivationMethod="singlePress"
        onContextMenuSelect={handleMenuOption}
        accessibilityLabel="Menu"
      />

      {/* Category Modal */}
      <ModalPanel
        isVisible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setEditingCategoryIndex(null);
        }}
        onConfirm={handleConfirmCustomCategory}
        title={editingCategoryIndex !== null ? "Edit Category" : "New Category"}
        maxHeight={650}
      >
        <CategoryPanel
          name={newCategoryName}
          selectedIcon={newCategoryIcon as any}
          selectedColor={newCategoryColor}
          onNameChange={setNewCategoryName}
          onIconChange={(icon) => setNewCategoryIcon(icon)}
          onColorChange={setNewCategoryColor}
          readonly={false}
        />
      </ModalPanel>
    </View>
  );
};

export default OnboardingView;

// ===========================
// Styles
// ===========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  menuButton: {
    position: "absolute",
    top: 16,
    right: 16,
  },

  // Step layout
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  stepHeader: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  stepHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    lineHeight: 22,
    marginBottom: 16,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Privacy
  privacySection: {
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F4F3F",
    borderColor: "#2F4F3F",
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Buttons
  stepActions: {
    marginTop: 24,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonDisabledLight: {
    opacity: 0.5,
  },

  // Success
  successContainer: {
    gap: 16,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27AE60",
  },

  // Accounts list
  accountsList: {
    flex: 1,
    paddingHorizontal: 0,
  },
  accountsListContent: {
    paddingBottom: 16,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
  },
  accountName: {
    fontSize: 18,
    flex: 1,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "700",
  },

  // Add button (green centered, like transactions)
  addButton: {
    backgroundColor: "#2F4F3F",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },

  // Total container (bottom bar)
  totalContainer: {
    backgroundColor: "#2F4F3F",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  totalAmount: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    color: "#2F4F3F",
    fontSize: 17,
    fontWeight: "700",
  },

  // Categories
  categoriesList: {
    flex: 1,
  },
  categoriesListContent: {
    paddingBottom: 16,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
  },
});
