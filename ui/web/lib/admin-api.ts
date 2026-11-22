import { authenticatedFetch, readAuthenticatedJson } from "./authenticated-fetch";

async function rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (response.status === 204) {
    return undefined as T;
  }
  if(response.ok&&!response.headers.get("content-type")?.includes("json"))return await response.text() as T;
  return readAuthenticatedJson<T>(response);
}

export type AdminDashboard = {
  totalWallets: number;
  activeWallets: number;
  frozenWallets: number;
  totalTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalRiskFlags: number;
  criticalRiskFlags: number;
  unresolvedReconciliationMismatches: number;
  failedOperations: number;
  operationCounts: Record<string, number>;
  systemHealth: Record<string, unknown>;
};

export type AdminWallet = {
  id: number;
  name: string;
  currency: string;
  status: string;
  ownerId: number;
  ownerEmail: string;
  balance: number;
};

export type AuditLogEntry = {
  id: number;
  actorId: number;
  actorEmail: string;
  timestamp: string;
  actionType: string;
  entityType: string;
  entityId: number;
  changeDescription: string;
  success: boolean;
};

export type AuditPage = {
  content: AuditLogEntry[];
  totalElements: number;
  totalPages: number;
};

export type AdminPayment = {
  id: number;
  reference: string;
  type?: string;
  status: string;
  amount: number;
  currency: string;
  description?: string | null;
  sourceWalletId: number | null;
  destinationWalletId: number | null;
  createdAt: string;
  failureReason?: string | null;
  sentinelRecommendation?: string | null;
  fraud?: { evaluationId: number; decision: string; score: number | null; evaluatedAt: string } | null;
};

export type PaymentRiskEvaluation = {
  id: number; decision: string; score: number | null; reasons: string[];
  ruleTriggered: string | null; provider: string | null; providerTransactionId: string | null;
  caseId: string | null; evaluatedAt: string; detailsReadable: boolean;
  shapTopFeatures: { feature: string; value: number | null; contribution: number }[];
};
export type PaymentRiskHistory = {
  transactionId: number; reference: string; failureReason: string | null;
  sentinelRecommendation: string | null; evaluations: PaymentRiskEvaluation[];
  page: number; totalPages: number; totalElements: number;
};

export type ReconciliationReportDto = {
  id: number;
  reconciliationType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  totalRecordsChecked: number;
  mismatchesFound: number;
  mismatchesResolved: number;
  summary: string | null;
  errorDetails?: string | null;
  triggeredBy: string | null;
  automated: boolean;
};

export type ReconciliationMismatchDto = {
  id: number;
  reportId: number;
  mismatchType: string;
  entityId: number;
  entityType: string;
  expectedValue: string | null;
  actualValue: string | null;
  variance: number | string | null;
  description: string | null;
  resolved: boolean;
  resolutionAction: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string | null;
};

export type ReconciliationStatusDto = {
  unresolvedMismatchCount: number;
  reportsWithMismatches: number;
  recentReports: ReconciliationReportDto[];
};

export const adminApi = {
  getPaymentRisk: (id: number, page = 0) => rawRequest<PaymentRiskHistory>(`/api/v1/admin/operations/payments/${id}/risk?page=${page}`),
  replayWebhook: (id: number, reason: string) =>
    rawRequest<{ accepted: boolean; status: string; message: string }>("/api/v1/webhooks/replay", {
      method: "POST",
      body: JSON.stringify({ webhookEventId: id, reason }),
    }),

  listPayments: (page = 0) =>
    rawRequest<{ content: AdminPayment[]; totalPages?: number; totalElements?: number }>(
      `/api/v1/admin/operations/payments?page=${page}`,
    ),

  resolveMismatch: (id: number, reason: string) =>
    rawRequest<ReconciliationMismatchDto>(
      `/api/v1/reconciliation/mismatches/${id}/resolve?resolutionAction=${encodeURIComponent(reason)}`,
      { method: "PUT" },
    ),

  /** Unresolved mismatches across all reports. */
  listMismatches: () => rawRequest<ReconciliationMismatchDto[]>("/api/v1/reconciliation/mismatches"),

  getReconciliationStatus: () => rawRequest<ReconciliationStatusDto>("/api/v1/reconciliation/status"),

  getDashboard: () => rawRequest<AdminDashboard>("/api/v1/admin/dashboard"),

  listWallets: () => rawRequest<AdminWallet[]>("/api/v1/admin/wallets"),

  freezeWallet: (walletId: number, reason: string) =>
    rawRequest<string>("/api/v1/admin/wallets/freeze", {
      method: "POST",
      body: JSON.stringify({ walletId, reason }),
    }),

  unfreezeWallet: (walletId: number) =>
    rawRequest<string>(`/api/v1/admin/wallets/${walletId}/unfreeze`, { method: "POST" }),

  reverseTransaction: (transactionId: number, reason: string, refundToWallet = true) =>
    rawRequest<string>("/api/v1/admin/transactions/reverse", {
      method: "POST",
      body: JSON.stringify({ transactionId, reason, refundToWallet }),
    }),

  reprocessWebhook: (webhookId: number, reason: string) =>
    rawRequest<string>("/api/v1/admin/webhooks/reprocess", {
      method: "POST",
      body: JSON.stringify({ webhookId, reason }),
    }),

  triggerWalletReconciliation: () =>
    rawRequest<ReconciliationReportDto>("/api/v1/admin/reconciliation/wallet-ledger", { method: "POST" }),

  triggerWebhookReconciliation: () =>
    rawRequest<ReconciliationReportDto>("/api/v1/admin/reconciliation/webhook-deposit", { method: "POST" }),

  getAuditTrail: (page = 0, size = 50) =>
    rawRequest<AuditPage>(`/api/v1/admin/audit-trail?page=${page}&size=${size}`),
};
