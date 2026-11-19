import { getAuthSession } from "./auth-session";
import { getMerchantSession } from "./merchant-api";
import { walletApi } from "./wallet-api";

export type MerchantWallet = {
  id: number;
  name: string;
  currency: string;
  /** Ledger balance from /wallets/{id}/balance. */
  balance: number;
  status: string;
};

export type MerchantTransactionKind = "deposit" | "withdrawal" | "transfer" | "other";

export type MerchantTransaction = {
  id: number;
  reference: string;
  type: string;
  kind: MerchantTransactionKind;
  amount: number;
  currency: string;
  status: string;
  description: string;
  time: string;
  sourceWalletId: number | null;
  destinationWalletId: number | null;
  /** True when money arrived in one of this merchant's wallets. */
  incoming: boolean;
};

export type MerchantPaymentLink = {
  id: number;
  reference: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
  transactionReference: string | null;
};

export type MerchantDashboardData = {
  storeName: string;
  wallets: MerchantWallet[];
  transactions: MerchantTransaction[];
  paymentLinks: MerchantPaymentLink[];
};

export function hasLiveMerchantApi(): boolean {
  const auth = getAuthSession();
  if (auth?.accessToken && auth.role === "merchant") return true;
  return Boolean(getMerchantSession()?.accessToken);
}

export function resolveMerchantStoreName(): string {
  const merchant = getMerchantSession();
  if (merchant?.businessName) return merchant.businessName;
  const auth = getAuthSession();
  if (auth?.name) return auth.name;
  return "Your business";
}

function kindOf(type: string): MerchantTransactionKind {
  const t = type.toUpperCase();
  if (t.includes("DEPOSIT")) return "deposit";
  if (t.includes("WITHDRAW")) return "withdrawal";
  if (t.includes("TRANSFER")) return "transfer";
  return "other";
}

/** Loads everything from the API. Throws on failure; there is no sample fallback. */
export async function loadMerchantDashboardFromApi(): Promise<MerchantDashboardData> {
  const storeName = resolveMerchantStoreName();
  const [wallets, transactions, links] = await Promise.all([
    walletApi.listWallets(),
    walletApi.listTransactions({ limit: 50 }),
    walletApi.listPaymentLinks(),
  ]);
  const balances = await Promise.all(wallets.map((w) => walletApi.getBalance(w.id)));
  const ownIds = new Set(wallets.map((w) => w.id));

  return {
    storeName,
    wallets: wallets.map((w, i) => ({
      id: w.id,
      name: w.name,
      currency: w.currency,
      balance: Number(balances[i]?.balance ?? 0),
      status: w.status,
    })),
    transactions: transactions.map((t) => {
      const kind = kindOf(t.type);
      const dest = t.destinationWalletId ?? null;
      const src = t.sourceWalletId ?? null;
      return {
        id: t.id,
        reference: t.reference,
        type: t.type,
        kind,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        description: t.description || "",
        time: t.createdAt,
        sourceWalletId: src,
        destinationWalletId: dest,
        incoming: kind === "deposit" || (dest !== null && ownIds.has(dest) && (src === null || !ownIds.has(src))),
      };
    }),
    paymentLinks: links.map((l) => ({
      id: l.id,
      reference: l.reference,
      title: l.description || l.reference,
      amount: Number(l.amount),
      currency: l.currency,
      status: l.status,
      expiresAt: l.expiresAt,
      transactionReference: l.transactionReference ?? null,
    })),
  };
}
