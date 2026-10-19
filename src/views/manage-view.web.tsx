import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Image,
  useWindowDimensions,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { ThemedText } from '@/src/components/core/themed-text';
import IconSymbol from '@/src/components/ui/icon-symbol';
import AccountPanel from '@/src/components/ui/account-panel';
import CategoryPanel from '@/src/components/ui/category-panel';
import SideDrawer from '@/src/components/ui/side-drawer';
import Toast from '@/src/components/ui/toast';
import { COLOR_PALETTE, DEFAULT_TEXT_COLOR } from '@/src/constants/colors';
import { DEFAULT_ICON } from '@/src/constants/icons';
import { useDataContext, useAuthContext } from '@/src/state';
import { webPanelBackground } from '@/src/constants/theme';
import { useSpreadsheetMutation } from '@/src/hooks/useSpreadsheetMutation';
import { AccountsApiHelper } from '@/src/helpers/AccountsApiHelper';
import { CategoriesApiHelper } from '@/src/helpers/CategoriesApiHelper';
import {
  AccountsMutationHelpers,
  type UpdateAccountData,
  type AccountSnapshot,
} from '@/src/helpers/AccountsMutationHelpers';
import {
  CategoriesMutationHelpers,
  type UpdateCategoryData,
  type CategorySnapshot,
} from '@/src/helpers/CategoriesMutationHelpers';
import type { Account, Category } from '@/src/types/models';
import { QUERY_KEYS } from '@/src/constants/queryKeys';

const ACCENT = '#2F4F3F';

const formatCurrency = (amount: number): string =>
  amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

type ToastStatus = 'loading' | 'success' | 'error';
type DrawerMode = 'add' | 'edit';
type ManageSection = 'overview' | 'accounts' | 'categories';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'accounts', label: 'Accounts', icon: 'wallet-outline' },
  { key: 'categories', label: 'Categories', icon: 'pricetags-outline' },
] as const;

interface ManageViewProps {
  onBack: () => void;
}

const ManageView: React.FC<ManageViewProps> = ({ onBack }) => {
  const backgroundColor = useThemeColor({ light: '#F2F5F3', dark: '#171A18' }, 'background');
  const borderColor = useThemeColor({ light: '#DFE6E1', dark: '#343C37' }, 'cardBorder');
  const panelColor = useThemeColor(webPanelBackground, 'cardBackground');
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const mutedColor = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'tabIconDefault');
  const selectedBackground = useThemeColor({ light: '#E7EEE9', dark: '#2C3E33' }, 'background');
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [activeSection, setActiveSection] = useState<ManageSection>('overview');

  const { accounts, categories } = useDataContext();
  const { user, selectedSpreadsheetId } = useAuthContext();

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastStatus, setToastStatus] = useState<ToastStatus>('loading');
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const showToast = useCallback((status: ToastStatus, message?: string) => {
    setToastStatus(status);
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  // ── Mutations ──

  const updateAccount = useSpreadsheetMutation<UpdateAccountData, AccountSnapshot>({
    mutationFn: (sid, data) => {
      const { accountId, ...updates } = data;
      return AccountsApiHelper.updateAccount(sid, accountId, updates);
    },
    onMutate: (qc, data) => AccountsMutationHelpers.optimisticUpdateAccount(qc, data),
    onError: (qc, ctx) => AccountsMutationHelpers.rollbackAccounts(qc, ctx),
    onSuccess: (qc, v) => AccountsMutationHelpers.invalidateAccountCaches(qc, !!v.name),
  });

  const updateCategory = useSpreadsheetMutation<UpdateCategoryData, CategorySnapshot>({
    mutationFn: (sid, data) => {
      const { categoryName, ...updates } = data;
      return CategoriesApiHelper.updateCategory(sid, categoryName, updates);
    },
    onMutate: (qc, data) => CategoriesMutationHelpers.optimisticUpdateCategory(qc, data),
    onError: (qc, ctx) => CategoriesMutationHelpers.rollbackCategories(qc, ctx),
    onSuccess: (qc, v) =>
      CategoriesMutationHelpers.invalidateCategoryCaches(qc, !!v.name && v.name !== v.categoryName),
  });

  const createAccount = useSpreadsheetMutation<any, void>({
    mutationFn: (sid, data) => AccountsApiHelper.createAccount(sid, data),
    onMutate: async () => {},
    onError: () => {},
    onSuccess: (qc) => qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all }),
  });

  const createCategory = useSpreadsheetMutation<any, void>({
    mutationFn: (sid, data) => CategoriesApiHelper.createCategory(sid, data),
    onMutate: async () => {},
    onError: () => {},
    onSuccess: (qc) => qc.invalidateQueries({ queryKey: QUERY_KEYS.categories.all }),
  });

  // ── Account drawer ──

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountDrawerMode, setAccountDrawerMode] = useState<DrawerMode>('edit');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [drawerAccountName, setDrawerAccountName] = useState('');
  const [drawerAccountBalance, setDrawerAccountBalance] = useState(0);
  const [drawerAccountColor, setDrawerAccountColor] = useState(COLOR_PALETTE[0]);

  const openAddAccount = () => {
    setAccountDrawerMode('add');
    setEditingAccount(null);
    setDrawerAccountName('');
    setDrawerAccountBalance(0);
    setDrawerAccountColor(COLOR_PALETTE[0]);
    setAccountDrawerOpen(true);
  };

  const openEditAccount = (account: Account) => {
    setAccountDrawerMode('edit');
    setEditingAccount(account);
    setDrawerAccountName(account.name);
    setDrawerAccountBalance(account.balance);
    setDrawerAccountColor(account.color || COLOR_PALETTE[0]);
    setAccountDrawerOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!drawerAccountName.trim()) return;

    // Close drawer immediately (optimistic)
    setAccountDrawerOpen(false);

    if (accountDrawerMode === 'add') {
      showToast('loading', 'Creating account...');
      try {
        await createAccount.mutateAsync({
          name: drawerAccountName.trim(),
          balance: drawerAccountBalance,
          color: drawerAccountColor,
          textColor: DEFAULT_TEXT_COLOR,
        });
        showToast('success', 'Account created');
      } catch {
        showToast('error', 'Failed to create account');
      }
      return;
    }

    if (!editingAccount) return;
    const nameChanged = drawerAccountName.trim() !== editingAccount.name;

    if (nameChanged) {
      const confirmed = window.confirm(
        `Rename "${editingAccount.name}" to "${drawerAccountName.trim()}"?\n\nAll associated transactions will be updated.`,
      );
      if (!confirmed) {
        setAccountDrawerOpen(true); // reopen
        return;
      }
    }

    showToast('loading', 'Saving...');
    try {
      await updateAccount.mutateAsync({
        accountId: editingAccount.accountId,
        name: drawerAccountName.trim(),
        color: drawerAccountColor,
      });
      setEditingAccount(null);
      showToast('success', 'Account updated');
    } catch {
      showToast('error', 'Failed to update account');
    }
  };

  // ── Category drawer ──

  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [categoryDrawerMode, setCategoryDrawerMode] = useState<DrawerMode>('edit');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [drawerCategoryName, setDrawerCategoryName] = useState('');
  const [drawerCategoryIcon, setDrawerCategoryIcon] = useState(DEFAULT_ICON);
  const [drawerCategoryColor, setDrawerCategoryColor] = useState('#2196F3');

  const openAddCategory = () => {
    setCategoryDrawerMode('add');
    setEditingCategory(null);
    setDrawerCategoryName('');
    setDrawerCategoryIcon(DEFAULT_ICON);
    setDrawerCategoryColor('#2196F3');
    setCategoryDrawerOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setCategoryDrawerMode('edit');
    setEditingCategory(category);
    setDrawerCategoryName(category.name);
    setDrawerCategoryIcon(category.icon || DEFAULT_ICON);
    setDrawerCategoryColor(category.color || '#2196F3');
    setCategoryDrawerOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!drawerCategoryName.trim()) return;

    // Close drawer immediately (optimistic)
    setCategoryDrawerOpen(false);

    if (categoryDrawerMode === 'add') {
      showToast('loading', 'Creating category...');
      try {
        await createCategory.mutateAsync({
          name: drawerCategoryName.trim(),
          icon: drawerCategoryIcon,
          color: drawerCategoryColor,
        });
        showToast('success', 'Category created');
      } catch {
        showToast('error', 'Failed to create category');
      }
      return;
    }

    if (!editingCategory) return;
    const nameChanged = drawerCategoryName.trim() !== editingCategory.name;

    if (nameChanged) {
      const confirmed = window.confirm(
        `Rename "${editingCategory.name}" to "${drawerCategoryName.trim()}"?\n\nAll associated transactions will be updated.`,
      );
      if (!confirmed) {
        setCategoryDrawerOpen(true); // reopen
        return;
      }
    }

    showToast('loading', 'Saving...');
    try {
      await updateCategory.mutateAsync({
        categoryName: editingCategory.name,
        name: drawerCategoryName.trim(),
        icon: drawerCategoryIcon,
        color: drawerCategoryColor,
      });
      setEditingCategory(null);
      showToast('success', 'Category updated');
    } catch {
      showToast('error', 'Failed to update category');
    }
  };

  // ── Render ──

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.commandBarOuter}>
        <View
          style={[
            styles.commandBar,
            compact && styles.commandBarCompact,
            { backgroundColor: panelColor, borderColor },
          ]}
        >
          <View style={styles.navigationSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to dashboard"
              title="Back to dashboard"
              onPress={onBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={19} color={mutedColor} />
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.sectionTabs}
            >
              <View accessibilityRole="tablist" style={styles.sectionTabs}>
                {SECTIONS.map((section) => (
                  <Pressable
                    key={section.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeSection === section.key }}
                    onPress={() => setActiveSection(section.key)}
                    style={({ hovered, pressed }) => [
                      styles.sectionTab,
                      {
                        backgroundColor:
                          activeSection === section.key || hovered || pressed
                            ? selectedBackground
                            : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={17}
                      color={activeSection === section.key ? textColor : mutedColor}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: activeSection === section.key ? textColor : mutedColor },
                      ]}
                    >
                      {section.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.brandSection}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandText, { color: textColor }]}>Manage</Text>
          </View>
        </View>
      </View>

      {activeSection === 'overview' && (
        <ScrollView contentContainerStyle={styles.overviewContent}>
          <ThemedText style={styles.overviewTitle}>Overview</ThemedText>
          <View style={[styles.overviewSection, { borderColor, backgroundColor: panelColor }]}>
            <ThemedText style={styles.sectionTitle}>Personal information</ThemedText>
            <View style={styles.profileRow}>
              {user?.picture ? (
                <Image
                  source={{ uri: user.picture }}
                  style={styles.avatar}
                  accessibilityLabel="Profile picture"
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: selectedBackground }]}>
                  <Text style={{ color: textColor, fontSize: 22, fontWeight: '600' }}>
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <ThemedText type="defaultSemiBold">{user?.name || 'MyBalance user'}</ThemedText>
                <Text style={[styles.detailText, { color: mutedColor }]}>
                  {user?.email || 'No email available'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.overviewSection, { borderColor, backgroundColor: panelColor }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={21} color={mutedColor} />
              <ThemedText style={[styles.sectionTitle, { flex: 1 }]}>
                Connected spreadsheet
              </ThemedText>
              <Text style={{ color: mutedColor, fontSize: 12 }}>
                {selectedSpreadsheetId ? 'Connected' : 'Not connected'}
              </Text>
            </View>
            <Text selectable style={[styles.detailText, { color: mutedColor }]}>
              {selectedSpreadsheetId || 'No spreadsheet connected'}
            </Text>
            {selectedSpreadsheetId && (
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  window.open(
                    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(selectedSpreadsheetId)}/edit`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                style={styles.sheetLink}
              >
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
                  Open in Google Sheets
                </ThemedText>
                <Ionicons name="open-outline" size={16} color={mutedColor} />
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {/* Two-column content */}
      {activeSection !== 'overview' && (
        <View style={styles.columns}>
          {/* Left: Accounts */}
          {activeSection === 'accounts' && (
            <ScrollView
              style={styles.column}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnContent}
            >
              <View style={[styles.section, { borderColor, backgroundColor: panelColor }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.badge}>
                    <IconSymbol name="account-balance-wallet" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Accounts
                    </ThemedText>
                    <ThemedText style={styles.sectionSubtitle}>
                      {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add account"
                    title="Add account"
                    onPress={openAddAccount}
                    style={styles.addButton}
                  >
                    <IconSymbol name="add" size={20} color="#fff" />
                  </Pressable>
                </View>

                {accounts.length === 0 ? (
                  <View style={styles.empty}>
                    <IconSymbol name="account-balance-wallet" size={36} color={borderColor} />
                    <ThemedText style={styles.emptyText}>No accounts yet</ThemedText>
                  </View>
                ) : (
                  accounts.map((account) => (
                    <Pressable
                      key={account.accountId}
                      onPress={() => openEditAccount(account)}
                      style={[
                        styles.accountChip,
                        {
                          borderColor: account.color || ACCENT,
                          backgroundColor: (account.color || ACCENT) + '12',
                        },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: account.color || ACCENT }]} />
                      <ThemedText style={styles.chipLabel}>{account.name}</ThemedText>
                      <ThemedText style={styles.chipValue}>
                        {formatCurrency(account.balance)}
                      </ThemedText>
                    </Pressable>
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* Right: Categories */}
          {activeSection === 'categories' && (
            <ScrollView
              style={styles.column}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnContent}
            >
              <View style={[styles.section, { borderColor, backgroundColor: panelColor }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.badge}>
                    <IconSymbol name="label" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Categories
                    </ThemedText>
                    <ThemedText style={styles.sectionSubtitle}>
                      {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add category"
                    title="Add category"
                    onPress={openAddCategory}
                    style={styles.addButton}
                  >
                    <IconSymbol name="add" size={20} color="#fff" />
                  </Pressable>
                </View>

                {categories.length === 0 ? (
                  <View style={styles.empty}>
                    <IconSymbol name="label" size={36} color={borderColor} />
                    <ThemedText style={styles.emptyText}>No categories yet</ThemedText>
                  </View>
                ) : (
                  <View style={styles.categoryGrid}>
                    {categories.map((cat) => (
                      <Pressable
                        key={cat.id || cat.name}
                        onPress={() => openEditCategory(cat)}
                        style={[
                          styles.categoryChip,
                          {
                            borderColor: cat.color || '#808080',
                            backgroundColor: (cat.color || '#808080') + '12',
                          },
                        ]}
                      >
                        <View style={[styles.catIcon, { backgroundColor: cat.color || '#808080' }]}>
                          <IconSymbol name={cat.icon || DEFAULT_ICON} size={15} color="#fff" />
                        </View>
                        <Text style={[styles.catLabel, { color: cat.color || '#808080' }]}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* Account drawer — opens from RIGHT (account panel is on the left) */}
      <SideDrawer
        isOpen={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        width={Math.min(width, 460)}
      >
        <View style={styles.drawerInner}>
          <View style={[styles.drawerHeader, { borderColor }]}>
            <ThemedText style={styles.drawerTitle}>
              {accountDrawerMode === 'add' ? 'New Account' : 'Edit Account'}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close account form"
              title="Close"
              onPress={() => setAccountDrawerOpen(false)}
              style={[styles.closeBtn, { backgroundColor: selectedBackground }]}
            >
              <IconSymbol name="close" size={20} color={mutedColor} />
            </Pressable>
          </View>
          <AccountPanel
            name={drawerAccountName}
            balance={drawerAccountBalance}
            selectedColor={drawerAccountColor}
            onNameChange={setDrawerAccountName}
            onBalanceChange={accountDrawerMode === 'add' ? setDrawerAccountBalance : undefined}
            onColorChange={setDrawerAccountColor}
          />
          <View style={[styles.drawerActions, { borderColor }]}>
            <Pressable
              style={[styles.primaryBtn, !drawerAccountName.trim() && styles.btnDisabled]}
              onPress={handleSaveAccount}
              disabled={!drawerAccountName.trim()}
            >
              <Text style={styles.primaryBtnText}>
                {accountDrawerMode === 'add' ? 'Add Account' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </SideDrawer>

      {/* Category drawer — opens from LEFT (category panel is on the right) */}
      <SideDrawer
        isOpen={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        width={Math.min(width, 460)}
      >
        <View style={styles.drawerInner}>
          <View style={[styles.drawerHeader, { borderColor }]}>
            <ThemedText style={styles.drawerTitle}>
              {categoryDrawerMode === 'add' ? 'New Category' : 'Edit Category'}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close category form"
              title="Close"
              onPress={() => setCategoryDrawerOpen(false)}
              style={[styles.closeBtn, { backgroundColor: selectedBackground }]}
            >
              <IconSymbol name="close" size={20} color={mutedColor} />
            </Pressable>
          </View>
          <CategoryPanel
            name={drawerCategoryName}
            selectedIcon={drawerCategoryIcon as any}
            selectedColor={drawerCategoryColor}
            onNameChange={setDrawerCategoryName}
            onIconChange={(icon) => setDrawerCategoryIcon(icon)}
            onColorChange={setDrawerCategoryColor}
            readonly={false}
          />
          <View style={[styles.drawerActions, { borderColor }]}>
            <Pressable
              style={[styles.primaryBtn, !drawerCategoryName.trim() && styles.btnDisabled]}
              onPress={handleSaveCategory}
              disabled={!drawerCategoryName.trim()}
            >
              <Text style={styles.primaryBtnText}>
                {categoryDrawerMode === 'add' ? 'Add Category' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </SideDrawer>

      {/* Toast */}
      <Toast
        isVisible={toastVisible}
        status={toastStatus}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
};

export default ManageView;

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commandBarOuter: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  commandBar: {
    minHeight: 58,
    padding: 8,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    boxShadow: '0 1px 2px rgba(17,31,24,0.03), 0 8px 24px rgba(17,31,24,0.05)',
  },
  commandBarCompact: { gap: 8 },
  navigationSection: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabsScroll: { flexShrink: 1, minWidth: 0, flexGrow: 0 },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  sectionTabs: { flexDirection: 'row', gap: 4 },
  sectionTabsCompact: { justifyContent: 'space-between' },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
    gap: 7,
    borderRadius: 20,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  overviewContent: { width: '100%', maxWidth: 932, alignSelf: 'flex-start', padding: 16, gap: 16 },
  overviewTitle: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  overviewSection: { padding: 20, borderWidth: 1, borderRadius: 20, gap: 18 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { fontSize: 14, lineHeight: 22, overflowWrap: 'anywhere' },
  sheetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 54,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingRight: 12,
    borderRadius: 20,
    cursor: 'pointer',
  } as any,
  backLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0,
  },
  brandSeparator: {
    fontSize: 15,
    color: '#ccc',
    marginHorizontal: 2,
  },
  pageTitle: {
    fontSize: 15,
    opacity: 0.6,
  },

  // Columns
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  columnContent: {
    width: '100%',
    maxWidth: 932,
    alignSelf: 'flex-start',
    padding: 16,
  },

  // Section
  section: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
  addButton: {
    backgroundColor: ACCENT,
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty
  empty: {
    alignItems: 'flex-start',
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.4,
    marginTop: 6,
  },

  // Account chips
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    cursor: 'pointer',
  } as any,
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chipLabel: {
    fontSize: 15,
    flex: 1,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  chipValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Category chips
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: '100%',
    cursor: 'pointer',
  } as any,
  catIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
    overflowWrap: 'anywhere',
  },

  // Drawer
  drawerInner: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    minHeight: 0,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  drawerTitle: { fontSize: 20, lineHeight: 28, fontWeight: '600', flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    flex: 1,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
