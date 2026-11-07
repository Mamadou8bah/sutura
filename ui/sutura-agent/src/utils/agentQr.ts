import type { AgentQrPayload } from "../types";

export function parseAgentQr(raw: string): AgentQrPayload | null {
  try {
    const data = JSON.parse(raw.trim());

    if (data?.app === "sutura" && data?.reference) {
      return {
        operation: data.operation,
        reference: data.reference,
        walletId: data.walletId,
        walletName: data.walletName,
        amount: String(data.amount),
        currency: data.currency,
        merchant: data.merchant,
        createdAt: data.createdAt,
      };
    }

    if (data?.type === "sutura/agent" && data?.reference) {
      return {
        operation: data.operation,
        reference: data.reference,
        walletId: data.walletId,
        walletName: data.walletName,
        amount: String(data.amount),
        currency: data.currency,
        merchant: data.merchant,
        createdAt: data.createdAt,
      };
    }

    if (data?.reference && data?.operation) {
      return data as AgentQrPayload;
    }

    return null;
  } catch {
    return null;
  }
}
