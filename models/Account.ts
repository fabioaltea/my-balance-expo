export interface IAccount {
  id: string;
  name: string;
  balance: number;
  color: string;
  textColor: string;
  transactions: number;
}

export const MOCK_ACCOUNTS: IAccount[] = [
  {
    id: "intesa-san-paolo",
    name: "Intesa San Paolo",
    balance: 8904.1,
    color: "#00850a",
    textColor: "#ffffff",
    transactions: 24,
  },
  {
    id: "buddybank",
    name: "Buddybank",
    balance: 323.23,
    color: "#595959",
    textColor: "#ffffff",
    transactions: 12,
  },
  {
    id: "trade-republic",
    name: "Trade Republic",
    balance: 10204.07,
    color: "#000000",
    textColor: "#ffffff",
    transactions: 8,
  },
  {
    id: "cash",
    name: "Cash",
    balance: 3666.06,
    color: "#aacfa9",
    textColor: "#5f855e",
    transactions: 45,
  },
  {
    id: "edenred",
    name: "Edenred",
    balance: 782,
    color: "#eb4034",
    textColor: "#ffffff",
    transactions: 6,
  },
  {
    id: "top-up",
    name: "Top-Up",
    balance: 224,
    color: "#ffffff",
    textColor: "#ae34eb",
    transactions: 3,
  },
  {
    id: "lidl-plus",
    name: "Lidl Plus",
    balance: 0,
    color: "#2b44ff",
    textColor: "#fff42b",
    transactions: 0,
  },
  {
    id: "n26",
    name: "N26",
    balance: 0,
    color: "#3b7781",
    textColor: "#ffffff",
    transactions: 0,
  },
  {
    id: "amazon-credit",
    name: "Amazon Credit",
    balance: 43.09,
    color: "#ffffff",
    textColor: "#232e3e",
    transactions: 2,
  },
  {
    id: "revolut",
    name: "Revolut",
    balance: 1054.5,
    color: "#bc7ed6",
    textColor: "#ffffff",
    transactions: 18,
  },
  {
    id: "together-price",
    name: "Together Price",
    balance: 0,
    color: "#ffffff",
    textColor: "#ca7ed6",
    transactions: 0,
  },
  {
    id: "other-accounts",
    name: "Other accounts",
    balance: 30.63,
    color: "#ffffff",
    textColor: "#000000",
    transactions: 5,
  },
];
