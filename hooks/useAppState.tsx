import { useAppState } from "../state/AppStateProvider";
import { IDateRange, DATE_RANGES, IMovement } from "../state/AppState.types";

export const useAccountSelection = () => {
  const { selectedAccount, setSelectedAccount, accounts } = useAppState();

  const selectedAccountData = accounts.find(
    (account) => account.name === selectedAccount
  );

  const switchToAccount = (accountName: string) => {
    const account = accounts.find((acc) => acc.name === accountName);
    if (account || accountName === "All") {
      setSelectedAccount(accountName);
    }
  };

  return {
    selectedAccount,
    selectedAccountData,
    switchToAccount,
    allAccounts: accounts, // Use real accounts instead of mock
  };
};

export const useDateRange = () => {
  const { dateRange, setDateRange } = useAppState();

  const setPresetRange = (preset: keyof typeof DATE_RANGES) => {
    setDateRange(DATE_RANGES[preset]);
  };

  const setCustomRange = (
    startDate: string,
    endDate: string,
    label?: string
  ) => {
    setDateRange({
      startDate, // Now expects dd-MM-yyyy string
      endDate, // Now expects dd-MM-yyyy string
      label: label || `${startDate} - ${endDate}`,
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

  const getFilteredMovements = (
    filter: "all" | "income" | "expense" = "all"
  ) => {
    if (filter === "all") return filteredMovements;
    return filteredMovements.filter((m) => m.type === filter);
  };

  return {
    movements,
    filteredMovements,
    getFilteredMovements,
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

// export const useMovements = () => {
//   const { filteredMovements } = useAppState();

//   const getTotalIncome = () => {
//     return filteredMovements
//       .filter((m) => m.type === "income")
//       .reduce((total, movement) => total + movement.amount, 0);
//   };

//   const getTotalExpense = () => {
//     return filteredMovements
//       .filter((m) => m.type === "expense")
//       .reduce((total, movement) => total + movement.amount, 0);
//   };

//   const getTotalBalance = () => {
//     return getTotalIncome() - getTotalExpense();
//   };

//   return {
//     filteredMovements,
//     getTotalIncome,
//     getTotalExpense,
//     getTotalBalance,
//   };
// };
