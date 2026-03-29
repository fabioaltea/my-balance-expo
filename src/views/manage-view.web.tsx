import { View, StyleSheet, ScrollView, Pressable, Text, Image } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { ThemedText } from '@/src/components/core/themed-text';
import IconSymbol from '@/src/components/ui/icon-symbol';
import AccountPanel from '@/src/components/ui/account-panel';
import CategoryPanel from '@/src/components/ui/category-panel';
import SideDrawer from '@/src/components/ui/side-drawer';
import Toast from '@/src/components/ui/toast';
import { COLOR_PALETTE, DEFAULT_TEXT_COLOR } from '@/src/constants/colors';
import { DEFAULT_ICON } from '@/src/constants/icons';
import { useDataContext } from '@/src/state';
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

interface ManageViewProps {
  onBack: () => void;
}

const ManageView: React.FC<ManageViewProps> = ({ onBack }) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'tabIconDefault');

  const { accounts, categories } = useDataContext();

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
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <IconSymbol name="chevron-left" size={22} color="#888" />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.topBarRight}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>MyBalance</Text>
          <Text style={styles.brandSeparator}>|</Text>
          <ThemedText type="defaultSemiBold" style={styles.pageTitle}>
            Manage
          </ThemedText>
        </View>
      </View>

      {/* Two-column content */}
      <View style={styles.columns}>
        {/* Left: Accounts */}
        <ScrollView
          style={styles.column}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.columnContent}
        >
          <View style={[styles.section, { borderColor }]}>
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
              <Pressable onPress={openAddAccount} style={styles.addButton}>
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

        {/* Right: Categories */}
        <ScrollView
          style={styles.column}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.columnContent}
        >
          <View style={[styles.section, { borderColor }]}>
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
              <Pressable onPress={openAddCategory} style={styles.addButton}>
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
      </View>

      {/* Account drawer — opens from RIGHT (account panel is on the left) */}
      <SideDrawer
        isOpen={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        width="35%"
      >
        <View style={styles.drawerInner}>
          <View style={styles.drawerHeader}>
            <ThemedText type="title" style={{ fontSize: 22 }}>
              {accountDrawerMode === 'add' ? 'New Account' : 'Edit Account'}
            </ThemedText>
            <Pressable onPress={() => setAccountDrawerOpen(false)} style={styles.closeBtn}>
              <IconSymbol name="close" size={20} color="#888" />
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
          <View style={styles.drawerActions}>
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
        width="38%"
        side="left"
      >
        <View style={styles.drawerInner}>
          <View style={styles.drawerHeader}>
            <ThemedText type="title" style={{ fontSize: 22 }}>
              {categoryDrawerMode === 'add' ? 'New Category' : 'Edit Category'}
            </ThemedText>
            <Pressable onPress={() => setCategoryDrawerOpen(false)} style={styles.closeBtn}>
              <IconSymbol name="close" size={20} color="#888" />
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
          <View style={styles.drawerActions}>
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
    letterSpacing: -0.3,
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
    padding: 20,
    paddingTop: 10,
  },

  // Section
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 30,
    padding: 28,
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
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
  addButton: {
    backgroundColor: ACCENT,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: 20,
    borderWidth: 1.5,
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
  },
  chipValue: {
    fontSize: 15,
    fontWeight: '600',
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
    borderRadius: 20,
    borderWidth: 1.5,
    cursor: 'pointer',
  } as any,
  catIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Drawer
  drawerInner: {
    flex: 1,
    padding: 28,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeBtn: {
    padding: 4,
  },
  drawerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 20,
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
