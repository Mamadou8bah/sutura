import type { CustomerTransaction, TransactionStatus } from "../types";

export function transactionTypeLabel(type: CustomerTransaction["type"]): string {
  switch (type) {
    case "TRANSFER_IN":
      return "Received";
    case "TRANSFER_OUT":
      return "Sent";
    case "DEPOSIT":
      return "Top up";
    case "WITHDRAWAL":
      return "Withdrawal";
  }
}

export function transactionStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "AWAITING_AGENT":
      return "Awaiting agent";
    case "PROCESSING": return "Processing";
    case "UNKNOWN": return "Check status";
    case "UNDER_REVIEW": return "Under review";
    case "REVERSED": return "Reversed";
  }
}

export function isCreditTransaction(txn: CustomerTransaction): boolean {
  return txn.type === "TRANSFER_IN" || txn.type === "DEPOSIT";
}
