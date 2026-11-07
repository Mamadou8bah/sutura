export type CustomerTransactionType = "TRANSFER_IN" | "TRANSFER_OUT" | "DEPOSIT" | "WITHDRAWAL";

export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "AWAITING_AGENT";

export type CustomerTransaction = {
  id: string;
  type: CustomerTransactionType;
  counterparty: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  method: string;
  time: string;
  category?: string;
};

export type CustomerWallet = {
  id: number;
  name: string;
  currency: string;
  balance: number;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  dailyLimit: number;
  dailyUsed: number;
  kind: "primary" | "savings" | "secondary";
};

export type CustomerSession = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type QuickContact = {
  id: string;
  name: string;
  phone: string;
  color: string;
};

export type StatCategory = {
  label: string;
  amount: number;
  color: string;
};

export type CustomerDashboardData = {
  session: CustomerSession;
  wallets: CustomerWallet[];
  transactions: CustomerTransaction[];
  pendingCount: number;
  contacts: QuickContact[];
};

export type TabId =
  | "home"
  | "wallets"
  | "create-wallet"
  | "scan"
  | "send"
  | "activity"
  | "more"
  | "topup"
  | "withdraw"
  | "support"
  | "profile"
  | "verification";

export type ProfileSection = "profile" | "settings" | "support" | "security";

export type AgentQrPayload = {
  operation: "DEPOSIT" | "WITHDRAWAL";
  reference: string;
  walletId: number;
  walletName: string;
  amount: string;
  currency: string;
  merchant: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  from: "agent" | "user";
  text: string;
  time: string;
};
