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

export const adminApi = {
  replayWebhook:(id:number,reason:string)=>rawRequest<{accepted:boolean;status:string;message:string}>("/api/v1/webhooks/replay",{method:"POST",body:JSON.stringify({webhookEventId:id,reason})}),
  listPayments:()=>rawRequest<{content:{id:number;reference:string;status:string;amount:number;currency:string;sourceWalletId:number|null;destinationWalletId:number|null;createdAt:string}[]}>("/api/v1/admin/operations/payments"),
  resolveMismatch:(id:number,reason:string)=>rawRequest(`/api/v1/reconciliation/mismatches/${id}/resolve?resolutionAction=${encodeURIComponent(reason)}`,{method:"PUT"}),
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
    rawRequest<unknown>("/api/v1/admin/reconciliation/wallet-ledger", { method: "POST" }),

  triggerWebhookReconciliation: () =>
    rawRequest<unknown>("/api/v1/admin/reconciliation/webhook-deposit", { method: "POST" }),

  getAuditTrail: (page = 0, size = 50) =>
    rawRequest<AuditPage>(`/api/v1/admin/audit-trail?page=${page}&size=${size}`),
};
