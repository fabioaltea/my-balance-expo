import { useAppState } from "./AppStateProvider";
import { IDateRange, DATE_RANGES, IMovement } from "./AppState.types";
import { MOCK_ACCOUNTS, IAccount } from "@/models/Account";

export const useAccountSelection = () => {
  const { selectedAccount, setSelectedAccount } = useAppState();

  const selectedAccountData = MOCK_ACCOUNTS.find(
    (account) => account.name === selectedAccount
  );

  const switchToAccount = (accountName: string) => {
    const account = MOCK_ACCOUNTS.find((acc) => acc.name === accountName);
    if (account || accountName === "All") {
      setSelectedAccount(accountName);
    }
  };

  return {
    selectedAccount,
    selectedAccountData,
    switchToAccount,
    allAccounts: MOCK_ACCOUNTS,
  };
};

export const useDateRange = () => {
  const { dateRange, setDateRange } = useAppState();

  const setPresetRange = (preset: keyof typeof DATE_RANGES) => {
    setDateRange(DATE_RANGES[preset]);
  };

  const setCustomRange = (startDate: Date, endDate: Date, label?: string) => {
    setDateRange({
      startDate,
      endDate,
      label:
        label ||
        `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    });
  };

  return {
    dateRange,
    setDateRange,
    setPresetRange,
    setCustomRange,
    availablePresets: DATE_RANGES,
  };
};

export const useMovements = () => {
  const { movements, setMovements, filteredMovements } = useAppState();

  const addMovement = (movement: Omit<IMovement, "id">) => {
    const newMovement: IMovement = {
      ...movement,
      id: Date.now().toString(),
    };
    setMovements([...movements, newMovement]);
  };

  const updateMovement = (id: string, updates: Partial<IMovement>) => {
    setMovements(
      movements.map((movement) =>
        movement.id === id ? { ...movement, ...updates } : movement
      )
    );
  };

  const deleteMovement = (id: string) => {
    setMovements(movements.filter((movement) => movement.id !== id));
  };

  const getTotalIncome = () => {
    return filteredMovements
      .filter((m) => m.type === "income")
      .reduce((sum, m) => sum + m.amount, 0);
  };

  const getTotalExpense = () => {
    return filteredMovements
      .filter((m) => m.type === "expense")
      .reduce((sum, m) => sum + m.amount, 0);
  };

  const getBalance = () => getTotalIncome() - getTotalExpense();

  return {
    movements,
    filteredMovements,
    addMovement,
    updateMovement,
    deleteMovement,
    getTotalIncome,
    getTotalExpense,
    getBalance,
  };
};

export const usePrivacy = () => {
  const { blurSensitiveInfo, setBlurSensitiveInfo } = useAppState();

  const toggleBlur = () => {
    setBlurSensitiveInfo(!blurSensitiveInfo);
  };

  const formatSensitiveAmount = (amount: number) => {
    const formatted = `€${amount.toFixed(2).replace(".", ",")}`;
    return blurSensitiveInfo ? "••••••" : formatted;
  };

  const formatSensitiveText = (text: string) => {
    return blurSensitiveInfo ? "•".repeat(Math.min(text.length, 8)) : text;
  };

  return {
    blurSensitiveInfo,
    setBlurSensitiveInfo,
    toggleBlur,
    formatSensitiveAmount,
    formatSensitiveText,
  };
};
