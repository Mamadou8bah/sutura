import type { TransactionResponse } from "../api/client";
import type { CustomerTransaction } from "../types";

export type TransferIntent = CustomerTransaction & { submissionState: "sending" | "accepted" | "uncertain" };

export function toActivity(t: TransactionResponse, ownedWalletIds: number[]): CustomerTransaction {
  const transfer = t.type.includes("TRANSFER");
  const outgoing = !!t.sourceWalletId && ownedWalletIds.includes(t.sourceWalletId);
  return {
    id: String(t.id), reference: t.reference,
    type: transfer ? outgoing ? "TRANSFER_OUT" : "TRANSFER_IN"
      : t.type.includes("DEPOSIT") || t.type === "WALLET_CREDIT" ? "DEPOSIT" : "WITHDRAWAL",
    counterparty: transfer
      ? (outgoing ? t.destinationName : t.sourceName) || (outgoing ? `Wallet ${t.destinationWalletId ?? "recipient"}` : `Wallet ${t.sourceWalletId ?? "sender"}`)
      : t.description || t.reference, amount: Number(t.amount), currency: t.currency,
    status: transfer && t.status === "PENDING"
      ? t.sentinelRecommendation?.toLowerCase() === "review" ? "UNDER_REVIEW" : "PROCESSING"
      : t.status as CustomerTransaction["status"],
    failureReason: t.failureReason, method: "Sutura", category: t.type, time: t.createdAt,
  };
}

/** A read can replace an intent only by its exact reference, never by amount or phone. */
export function reconcileTransfers(server: CustomerTransaction[], intents: TransferIntent[]) {
  const known = new Set(server.map(t => t.reference));
  const unresolved = intents.filter(t => !known.has(t.reference));
  return {
    unresolved,
    transactions: [...unresolved, ...server].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
  };
}

export function pendingTransfers(transactions: CustomerTransaction[]) {
  return transactions.filter(t => ["PENDING", "PROCESSING", "UNDER_REVIEW", "UNKNOWN"].includes(t.status)).length;
}

/** Cached Processing rows must not hide an uncertain submission recovered after restart. */
export function restoreTransferActivity(cached: CustomerTransaction[], intents: TransferIntent[]) {
  const references = new Set(intents.map(t => t.reference));
  return reconcileTransfers(cached.filter(t => !references.has(t.reference)
    || ["COMPLETED", "FAILED", "REVERSED"].includes(t.status)), intents).transactions;
}

export function transferStatusMessage(txn: CustomerTransaction) {
  if (txn.status === "UNKNOWN") return "We couldn't confirm submission. Check Activity before sending again.";
  if (txn.status === "PROCESSING") return "Your transfer is processing. You can leave this screen; its status will update here.";
  if (txn.status === "UNDER_REVIEW") return "Your transfer is under review. No money has been sent yet.";
  if (txn.status === "FAILED" && txn.type === "TRANSFER_OUT") return txn.failureReason || "Transfer failed. No money was sent.";
  return null;
}
