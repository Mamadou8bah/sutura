export type WalletDepositQr = { app: "sutura"; v: 1; type: "wallet-deposit"; walletId: number };

/** Public destination identifier only: no balance, tokens, amount or withdrawal authority. */
export function encodeWalletDepositQr(walletId: number): string {
  if (!Number.isSafeInteger(walletId) || walletId <= 0) throw new Error("Invalid deposit wallet");
  return JSON.stringify({ app: "sutura", v: 1, type: "wallet-deposit", walletId });
}

export function parseWalletDepositQr(raw: string): WalletDepositQr | null {
  if (raw.length > 512) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.app !== "sutura" || data.v !== 1 || data.type !== "wallet-deposit"
        || !Number.isSafeInteger(data.walletId) || data.walletId <= 0) return null;
    // Ignore caller-supplied amount, currency, owner identity and operation fields.
    return { app: "sutura", v: 1, type: "wallet-deposit", walletId: data.walletId };
  } catch { return null; }
}
