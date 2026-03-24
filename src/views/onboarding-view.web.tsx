import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Text,
} from "react-native";
import React, { useState, useRef } from "react";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import Card from "@/src/components/core/card";
import List from "@/src/components/ui/list";
import IconSymbol from "@/src/components/ui/icon-symbol";
import CategoryPanel from "@/src/components/ui/category-panel";
import AccountPanel from "@/src/components/ui/account-panel";
import SideDrawer from "@/src/components/ui/side-drawer";
import { DEFAULT_TEXT_COLOR, COLOR_PALETTE } from "@/src/constants/colors";
import { HttpHelper, AuthenticationError } from "@/src/helpers/HttpHelper";
import { AccountsApiHelper } from "@/src/helpers/AccountsApiHelper";
import { CategoriesApiHelper } from "@/src/helpers/CategoriesApiHelper";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import * as Crypto from "expo-crypto";
import { useAuthContext } from "@/src/state/AuthProvider";
import { ThemedText } from "@/src/components/core/themed-text";
import ContextMenu from "@/src/components/ui/context-menu";
import { Ionicons } from "@expo/vector-icons";

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
}

// ===========================
// Default Categories
// ===========================

const DEFAULT_CATEGORIES: OnboardingCategory[] = [
  { name: "Groceries", icon: "restaurant", color: "#4CAF50" },
  { name: "Transport", icon: "directions-car", color: "#2196F3" },
  { name: "Home", icon: "home", color: "#FF9800" },
  { name: "Health", icon: "local-hospital", color: "#F44336" },
  { name: "Entertainment", icon: "sports-esports", color: "#9C27B0" },
  { name: "Salary", icon: "attach-money", color: "#2E7D32" },
  { name: "Subscriptions", icon: "autorenew", color: "#E91E63" },
  { name: "Investments", icon: "trending-up", color: "#795548" },
  { name: "Other", icon: "more-horiz", color: "#9E9E9E" },
];

// ===========================
// Helpers
// ===========================

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
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
  const { logout, user, completeSetup } = useAuthContext();

  const menuBackground = useThemeColor({ light: "#fff", dark: "#171717" }, "menuBackground");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );

  // Scroll ref for auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const section2Ref = useRef<View>(null);
  const section3Ref = useRef<View>(null);

  // Panel 1 state — if user already has a spreadsheetId (interrupted onboarding), skip step 1
  const existingSpreadsheetId = user?.spreadsheetId ?? null;
  const [privacyAccepted, setPrivacyAccepted] = useState(!!existingSpreadsheetId);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [sheetCreated, setSheetCreated] = useState(!!existingSpreadsheetId);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(existingSpreadsheetId);

  // Panel 2 state
  const [accounts, setAccounts] = useState<OnboardingAccount[]>([]);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(
    null,
  );
  const [drawerAccountName, setDrawerAccountName] = useState("");
  const [drawerAccountBalance, setDrawerAccountBalance] = useState(0);
  const [drawerAccountColor, setDrawerAccountColor] = useState(
    COLOR_PALETTE[0],
  );

  // Panel 3 state
  const [categories, setCategories] =
    useState<OnboardingCategory[]>(DEFAULT_CATEGORIES);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<
    number | null
  >(null);
  const [newCategoryIcon, setNewCategoryIcon] = useState<string>("label");
  const [newCategoryColor, setNewCategoryColor] = useState<string>("#2196F3");
  const [newCategoryName, setNewCategoryName] = useState<string>("");

  // ===========================
  // Panel 1 handlers
  // ===========================

  const handleCreateSheet = async () => {
    setIsCreatingSheet(true);
    try {
      const createResponse = await HttpHelper.post("/spreadsheet/create", {
        title: "MyBalance",
      });
      const newSpreadsheetId = createResponse.data?.spreadsheetId;
      await HttpHelper.post("/spreadsheet/initialize", {
        spreadsheetId: newSpreadsheetId,
      });
      setSpreadsheetId(newSpreadsheetId);
      setSheetCreated(true);
      // Auto-scroll to section 2 after a short delay
      setTimeout(() => {
        section2Ref.current?.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 24, animated: true });
          },
          () => {},
        );
      }, 300);
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
  // Panel 2 handlers
  // ===========================

  const openAddAccount = () => {
    setEditingAccountIndex(null);
    setDrawerAccountName("");
    setDrawerAccountBalance(0);
    setDrawerAccountColor(COLOR_PALETTE[0]);
    setAccountDrawerOpen(true);
  };

  const openEditAccount = (index: number) => {
    const acc = accounts[index];
    setEditingAccountIndex(index);
    setDrawerAccountName(acc.name);
    setDrawerAccountBalance(acc.balance);
    setDrawerAccountColor(acc.color);
    setAccountDrawerOpen(true);
  };

  const handleConfirmAccount = () => {
    if (!drawerAccountName.trim()) return;
    const balance = drawerAccountBalance;
    if (editingAccountIndex !== null) {
      setAccounts((prev) =>
        prev.map((a, i) =>
          i === editingAccountIndex
            ? {
                name: drawerAccountName.trim(),
                balance,
                color: drawerAccountColor,
              }
            : a,
        ),
      );
    } else {
      setAccounts((prev) => [
        ...prev,
        { name: drawerAccountName.trim(), balance, color: drawerAccountColor },
      ]);
    }
    setAccountDrawerOpen(false);
    setEditingAccountIndex(null);
    // Auto-scroll to section 3 when first account is added
    if (editingAccountIndex === null && accounts.length === 0) {
      setTimeout(() => {
        section3Ref.current?.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 24, animated: true });
          },
          () => {},
        );
      }, 300);
    }
  };

  const getTotalBalance = (): number =>
    accounts.reduce((sum, a) => sum + a.balance, 0);

  // ===========================
  // Panel 3 handlers
  // ===========================

  const handleAddCustomCategory = () => {
    setEditingCategoryIndex(null);
    setNewCategoryName("");
    setNewCategoryIcon("label");
    setNewCategoryColor("#2196F3");
    setCategoryDrawerOpen(true);
  };

  const handleEditCategory = (index: number) => {
    const category = categories[index];
    setEditingCategoryIndex(index);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon);
    setNewCategoryColor(category.color);
    setCategoryDrawerOpen(true);
  };

  const handleConfirmCustomCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }
    if (editingCategoryIndex !== null) {
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
      setCategories((prev) => [
        ...prev,
        {
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          color: newCategoryColor,
        },
      ]);
    }
    setCategoryDrawerOpen(false);
    setEditingCategoryIndex(null);
  };

  const handleComplete = async () => {
    if (!spreadsheetId) return;
    const selectedCategories = categories;
    if (selectedCategories.length === 0) {
      Alert.alert("Warning", "Select at least one category.");
      return;
    }
    setIsSaving(true);
    try {
      for (const account of accounts) {
        await AccountsApiHelper.createAccount(spreadsheetId, {
          name: account.name,
          balance: account.balance,
          color: account.color,
          textColor: DEFAULT_TEXT_COLOR,
        });
      }
      for (const category of selectedCategories) {
        await CategoriesApiHelper.createCategory(spreadsheetId, {
          name: category.name,
          color: category.color,
          icon: category.icon,
        });
      }
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
      // Mark setup as complete in the database, then go to dashboard
      await HttpHelper.post("/spreadsheet/complete-setup", {});
      completeSetup(spreadsheetId);
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
      setIsSaving(false);
    }
  };

  const handleMenuOption = (option: string) => {
    if (option.toLowerCase() === "logout") {
      logout();
    }
  };

  const canComplete = sheetCreated && accounts.length > 0 && categories.length > 0;

  // ===========================
  // Render
  // ===========================

  return (
    <View style={[styles.container, { backgroundColor: menuBackground }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.appTitle}>MyBalance</Text>
          <ThemedText style={styles.appTagline}>Set up your account</ThemedText>
        </View>
        {user && (
          <ContextMenu
            options={[
              {
                label: "Logout",
                icon: "log-out-outline",
                destructive: true,
              },
            ]}
            selectedOption=""
            onSelectOption={handleMenuOption}
          >
            <View style={styles.userInfo}>
              {user.picture && (
                <Image source={{ uri: user.picture }} style={styles.userAvatar} />
              )}
              <ThemedText style={styles.userName}>{user.name}</ThemedText>
              <Ionicons name="chevron-down" size={14} color="#888" />
            </View>
          </ContextMenu>
        )}
      </View>

      {/* Scrollable sections */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Section 1: Setup ── */}
        <View style={[styles.section, { borderColor }]}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.stepBadge,
                sheetCreated ? styles.stepBadgeDone : styles.stepBadgeActive,
              ]}
            >
              {sheetCreated ? (
                <IconSymbol name="check" size={15} color="#fff" />
              ) : (
                <Text style={styles.stepBadgeText}>1</Text>
              )}
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Welcome to MyBalance
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Create your Google Sheets spreadsheet
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.bodyText}>
            MyBalance helps you track your income and expenses. Your financial
            data is stored securely in a Google Sheets spreadsheet in your own
            Google account — no external servers, full privacy.
          </ThemedText>

          {sheetCreated && (
            <View style={styles.successBadge}>
              <IconSymbol name="check-circle" size={18} color="#27AE60" />
              <Text style={styles.successText}>
                Spreadsheet created successfully!
              </Text>
            </View>
          )}

          <Card style={{ marginTop: 20 }}>
            <View style={styles.privacySection}>
              <ThemedText
                type="defaultSemiBold"
                style={styles.cardSectionLabel}
              >
                Privacy Policy
              </ThemedText>
              <ThemedText style={styles.privacyText}>
                By accepting, you authorise MyBalance to create and manage a
                Google Sheets spreadsheet in your account. Your data stays in
                your Google Drive and is never shared with third parties.
              </ThemedText>
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor },
                    privacyAccepted && styles.checkboxChecked,
                  ]}
                >
                  {privacyAccepted && (
                    <IconSymbol name="check" size={14} color="#fff" />
                  )}
                </View>
                <ThemedText style={styles.checkboxLabel}>
                  I accept the privacy policy and authorise the spreadsheet
                  creation
                </ThemedText>
              </Pressable>
            </View>
          </Card>

          <Pressable
            style={[
              styles.primaryButton,
              { marginTop: 20 },
              (!privacyAccepted || isCreatingSheet) &&
                !sheetCreated &&
                styles.buttonDisabled,
              sheetCreated && styles.buttonDone,
            ]}
            onPress={sheetCreated ? undefined : handleCreateSheet}
            disabled={sheetCreated || !privacyAccepted || isCreatingSheet}
          >
            {isCreatingSheet ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {sheetCreated ? "✓ Spreadsheet ready" : "Create Spreadsheet"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* ── Section 2: Accounts ── */}
        <View
          ref={section2Ref}
          style={[
            styles.section,
            { borderColor },
            !sheetCreated && styles.sectionLocked,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.stepBadge,
                sheetCreated ? styles.stepBadgeActive : styles.stepBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.stepBadgeText,
                  !sheetCreated && styles.stepBadgeTextPending,
                ]}
              >
                2
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Accounts
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Add your bank accounts, cards and cash
              </ThemedText>
            </View>
            {sheetCreated && (
              <Pressable onPress={openAddAccount} style={styles.addIconButton}>
                <IconSymbol name="add" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          {accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                name="account-balance-wallet"
                size={40}
                color={borderColor}
              />
              <ThemedText style={[styles.emptyText, { color: borderColor }]}>
                No accounts yet
              </ThemedText>
              {sheetCreated && (
                <ThemedText
                  style={[styles.emptySubtext, { color: borderColor }]}
                >
                  Tap + to add your first account
                </ThemedText>
              )}
            </View>
          ) : (
            <>
              {accounts.map((account, index) => (
                <Pressable
                  key={index}
                  onPress={() => openEditAccount(index)}
                  style={[styles.accountChip, { borderColor: account.color, backgroundColor: account.color + "12" }]}
                >
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: account.color },
                    ]}
                  />
                  <ThemedText style={styles.accountName}>
                    {account.name}
                  </ThemedText>
                  <ThemedText style={styles.balanceText}>
                    {formatCurrency(account.balance)}
                  </ThemedText>
                </Pressable>
              ))}
              <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
                <ThemedText style={styles.totalLabel}>Total balance</ThemedText>
                <ThemedText style={styles.totalAmount}>
                  {formatCurrency(getTotalBalance())}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        {/* ── Section 3: Categories ── */}
        <View
          ref={section3Ref}
          style={[
            styles.section,
            { borderColor },
            !sheetCreated && styles.sectionLocked,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.stepBadge,
                sheetCreated ? styles.stepBadgeActive : styles.stepBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.stepBadgeText,
                  !sheetCreated && styles.stepBadgeTextPending,
                ]}
              >
                3
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Categories
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                {sheetCreated
                  ? `${categories.length} categories`
                  : "Organise your expenses and income"}
              </ThemedText>
            </View>
            {sheetCreated && (
              <Pressable
                onPress={handleAddCustomCategory}
                style={styles.addIconButton}
              >
                <IconSymbol name="add" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          <View style={styles.categoryGrid}>
            {categories.map((category, index) => (
              <Pressable
                key={index}
                onPress={() => sheetCreated && handleEditCategory(index)}
                style={[
                  styles.categoryChip,
                  { borderColor: category.color, backgroundColor: category.color + "12" },
                ]}
              >
                <View
                  style={[
                    styles.categoryChipIcon,
                    { backgroundColor: category.color },
                  ]}
                >
                  <IconSymbol name={category.icon} size={15} color="#fff" />
                </View>
                <Text
                  style={[
                    styles.categoryChipLabel,
                    { color: category.color },
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>

        </View>

        {/* ── Complete Setup ── */}
        <View style={styles.completeSection}>
          {!canComplete && (
            <View style={styles.hintList}>
              {!sheetCreated && (
                <ThemedText style={styles.hintText}>
                  • Create your spreadsheet first
                </ThemedText>
              )}
              {sheetCreated && accounts.length === 0 && (
                <ThemedText style={styles.hintText}>
                  • Add at least one account to track
                </ThemedText>
              )}
              {sheetCreated && categories.length === 0 && (
                <ThemedText style={styles.hintText}>
                  • Add at least one category to track
                </ThemedText>
              )}
            </View>
          )}
          <Pressable
            style={[
              styles.primaryButton,
              styles.completeButton,
              !canComplete && styles.buttonDisabled,
            ]}
            onPress={handleComplete}
            disabled={!canComplete || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Complete Setup</Text>
            )}
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Account SideDrawer */}
      <SideDrawer
        isOpen={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        width="38%"
      >
        <View style={{ flex: 1, padding: 28 }}>
          <View style={styles.drawerHeader}>
            <ThemedText type="title" style={{ fontSize: 22 }}>
              {editingAccountIndex !== null ? "Edit Account" : "New Account"}
            </ThemedText>
            <Pressable
              onPress={() => setAccountDrawerOpen(false)}
              style={styles.closeButton}
            >
              <IconSymbol name="close" size={20} color="#888" />
            </Pressable>
          </View>

          <AccountPanel
            name={drawerAccountName}
            balance={drawerAccountBalance}
            selectedColor={drawerAccountColor}
            onNameChange={setDrawerAccountName}
            onBalanceChange={setDrawerAccountBalance}
            onColorChange={setDrawerAccountColor}
          />

          <View style={[styles.drawerActions, { paddingTop: 24 }]}>
            {editingAccountIndex !== null && (
              <Pressable
                onPress={() => {
                  const indexToRemove = editingAccountIndex;
                  setAccountDrawerOpen(false);
                  setEditingAccountIndex(null);
                  setAccounts((prev) => prev.filter((_, i) => i !== indexToRemove));
                }}
                style={styles.dangerButton}
              >
                <IconSymbol name="delete" size={16} color="#E53935" />
                <Text style={styles.dangerButtonText}>Remove</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.primaryButton,
                { flex: 1 },
                !drawerAccountName.trim() && styles.buttonDisabled,
              ]}
              onPress={handleConfirmAccount}
              disabled={!drawerAccountName.trim()}
            >
              <Text style={styles.primaryButtonText}>
                {editingAccountIndex !== null ? "Save" : "Add Account"}
              </Text>
            </Pressable>
          </View>
        </View>
      </SideDrawer>

      {/* Category SideDrawer */}
      <SideDrawer
        isOpen={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        width="40%"
      >
        <View style={{ flex: 1, padding: 28 }}>
          <View style={styles.drawerHeader}>
            <ThemedText type="title" style={{ fontSize: 22 }}>
              {editingCategoryIndex !== null ? "Edit Category" : "New Category"}
            </ThemedText>
            <Pressable
              onPress={() => setCategoryDrawerOpen(false)}
              style={styles.closeButton}
            >
              <IconSymbol name="close" size={20} color="#888" />
            </Pressable>
          </View>
          <CategoryPanel
            name={newCategoryName}
            selectedIcon={newCategoryIcon as any}
            selectedColor={newCategoryColor}
            onNameChange={setNewCategoryName}
            onIconChange={(icon) => setNewCategoryIcon(icon)}
            onColorChange={setNewCategoryColor}
            readonly={false}
          />
          <View style={[styles.drawerActions, { paddingTop: 16 }]}>
            {editingCategoryIndex !== null && (
              <Pressable
                onPress={() => {
                  const indexToRemove = editingCategoryIndex;
                  setCategoryDrawerOpen(false);
                  setEditingCategoryIndex(null);
                  setCategories((prev) => prev.filter((_, i) => i !== indexToRemove));
                }}
                style={styles.dangerButton}
              >
                <IconSymbol name="delete" size={16} color="#E53935" />
                <Text style={styles.dangerButtonText}>Remove</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.primaryButton,
                { flex: 1 },
                !newCategoryName.trim() && styles.buttonDisabled,
              ]}
              onPress={handleConfirmCustomCategory}
              disabled={!newCategoryName.trim()}
            >
              <Text style={styles.primaryButtonText}>
                {editingCategoryIndex !== null ? "Save" : "Add Category"}
              </Text>
            </Pressable>
          </View>
        </View>
      </SideDrawer>
    </View>
  );
};

export default OnboardingView;

// ===========================
// Styles
// ===========================

const ACCENT = "#2F4F3F";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  appTitle: {
    color: ACCENT,
    fontSize: 17,
    fontWeight: "700",
  },
  appTagline: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  } as any,
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingTop: 40,
    maxWidth: 680,
  },

  // Section cards
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 30,
    padding: 28,
    marginBottom: 28,
  },
  sectionLocked: {
    opacity: 0.4,
    pointerEvents: "none",
  } as any,

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },

  // Step badge
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stepBadgeActive: {
    backgroundColor: ACCENT,
  },
  stepBadgeDone: {
    backgroundColor: "#27AE60",
  },
  stepBadgePending: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.15)",
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  stepBadgeTextPending: {
    color: "rgba(0,0,0,0.3)",
  },

  // Add icon button
  addIconButton: {
    backgroundColor: ACCENT,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Body text
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.6,
    marginBottom: 4,
  },

  // Success badge
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27AE60",
  },

  // Privacy card
  privacySection: {
    paddingVertical: 4,
  },
  cardSectionLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.6,
    marginBottom: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkboxLabel: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Buttons
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    alignSelf: "flex-start",
    minWidth: 200,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonDone: {
    backgroundColor: "#27AE60",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 20,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.7,
  },

  // Account chips
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  chipMenuButton: {
    padding: 4,
    marginLeft: "auto",
    opacity: 0.6,
  } as any,
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  accountName: {
    fontSize: 15,
    flex: 1,
  },
  balanceText: {
    fontSize: 15,
    fontWeight: "600",
  },
  removeButton: {
    padding: 4,
    opacity: 0.45,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    fontSize: 13,
    opacity: 0.55,
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: ACCENT,
  },

  // Category chips
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Empty state
  emptyState: {
    alignItems: "flex-start",
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    opacity: 0.65,
  },

  // Drawer form
  drawerFieldLabel: {
    fontSize: 12,
    opacity: 0.55,
    marginBottom: 6,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: ACCENT,
    transform: [{ scale: 1.2 }],
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  closeButton: {
    padding: 4,
  },
  drawerActions: {
    flexDirection: "row",
    gap: 12,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#E53935",
    borderRadius: 20,
    height: 46,
    paddingHorizontal: 20,
  },
  dangerButtonText: {
    color: "#E53935",
    fontSize: 15,
    fontWeight: "500",
  },

  // Complete setup
  completeSection: {
    alignItems: "center",
    marginBottom: 28,
    gap: 14,
  },
  hintList: {
    gap: 4,
    alignSelf: "flex-start",
  },
  hintText: {
    fontSize: 13,
    opacity: 0.5,
  },
  completeButton: {
    alignSelf: "stretch",
    minWidth: undefined,
  },
});
