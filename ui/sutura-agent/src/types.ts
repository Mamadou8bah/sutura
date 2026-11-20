export type OperationType = "DEPOSIT" | "WITHDRAWAL";

export type OperationStatus = "AWAITING_AGENT" | "PENDING" | "PENDING_REVIEW" | "APPROVED" | "COMPLETED" | "FAILED";

export type AgentOperation = {
  operation: OperationType;
  reference: string;
  walletId: number;
  walletName: string;
  amount: number;
  currency: string;
  status: OperationStatus;
  userId: number;
  merchantName: string;
  createdAt: string;
  completedAt?: string;
  location?: string;
};

export type AgentSession = {
  name: string;
  agentCode: string;
  location: string;
  phone: string;
  email: string;
};

export type AgentStats = {
  todayDeposits: number;
  todayWithdrawals: number;
  todayVolume: number;
  pendingCount: number;
  completedToday: number;
};

export type TabId =
  | "home"
  | "scan"
  | "queue"
  | "activity"
  | "more"
  | "confirm"
  | "new-deposit"
  | "new-withdrawal"
  | "settings"
  | "profile"
  | "support";

export type AgentQrPayload = {
  token?: string;
  expiresAt?: string;
  operation: OperationType;
  reference: string;
  walletId: number;
  walletName: string;
  amount: string;
  currency: string;
  merchant: string;
  createdAt?: string;
};

export type OpResult = { ok: true } | { ok: false; error: string };
