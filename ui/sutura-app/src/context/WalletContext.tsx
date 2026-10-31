import { useBackNavigation } from "../hooks/useBackNavigation";
import {useAutoRefresh} from "../hooks/useAutoRefresh";
import { normalizePhone } from "../utils/inputValidation";
import { Linking } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import type {
  AgentQrPayload,
  CustomerDashboardData,
  CustomerTransaction,
  CustomerWallet,
  ProfileSection,
  TabId,
} from "../types";
import type { OpResult } from "../types/operation";
import { buildAgentQrPayload } from "../utils/agentQr";
import { formatFraudError } from "../utils/fraudErrors";

const EMPTY_DASHBOARD: CustomerDashboardData = {
  session: { name: "", phone: "", email: "", address: "" },
  wallets: [],
  transactions: [],
  pendingCount: 0,
  contacts: [],
};

const EMPTY_WALLET: CustomerWallet = {
  id: 0,
  name: "No wallet",
  currency: "GMD",
  balance: 0,
  status: "ACTIVE",
  dailyLimit: 0,
  dailyUsed: 0,
  kind: "primary",
};

type WalletContextValue = {
  data: CustomerDashboardData;
  loading: boolean;
  tab: TabId;
  setTab: (tab: TabId) => void;
  profileSection: ProfileSection;
  setProfileSection: (section: ProfileSection) => void;
  selectedWalletId: number;
  setSelectedWalletId: (id: number) => void;
  selectedWallet: CustomerWallet;
  depositQr: AgentQrPayload | null;
  withdrawalQr: AgentQrPayload | null;
  sendMoney: (destination: string, amount: number, walletId?: number) => Promise<OpResult>;
  topUp: (amount: number, method: "mobile_money" | "agent", phone: string, walletId?: number) => Promise<OpResult>;
  withdraw: (amount: number, walletId?: number) => Promise<OpResult>;
  refreshData: () => Promise<void>;
  recentTransactions: CustomerTransaction[];
  balanceHidden: boolean;
  toggleBalanceHidden: () => void;
  walletActionsTarget: number | null;
  openWalletActions: (walletId: number) => void;
  closeWalletActions: () => void;
  selectedTransaction: CustomerTransaction | null;
  openTransaction: (transactionId: string) => void;
  closeTransaction: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session, newlyRegistered } = useAuth();
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useBackNavigation<TabId>("home");
  useEffect(() => { if (newlyRegistered) setTab("verification"); }, [newlyRegistered]);
  const [profileSection, setProfileSection] = useState<ProfileSection>("profile");
  const [selectedWalletId, setSelectedWalletId] = useState(0);
  const [depositQr, setDepositQr] = useState<AgentQrPayload | null>(null);
  const [withdrawalQr, setWithdrawalQr] = useState<AgentQrPayload | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [walletActionsTarget, setWalletActionsTarget] = useState<number | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    setData(EMPTY_DASHBOARD);
    setDepositQr(null); setWithdrawalQr(null); setSelectedTransactionId(null);
    setSelectedWalletId(0); setTab("home");
  }, [session?.username]);

  const refreshGeneration=useRef(0);
  useEffect(()=>()=>{refreshGeneration.current++;},[session]);
  const refreshData = useCallback(async () => {
    if (!session?.accessToken) {
      setData(EMPTY_DASHBOARD);
      return;
    }
    const request=++refreshGeneration.current;
    setLoading(true);
    try {
      const wallets = await api.listWallets();
      const [balances, transactions] = await Promise.all([
        Promise.all(wallets.map((w) => api.getBalance(w.id))),
        api.listTransactions(),
      ]);
      if(request!==refreshGeneration.current)return;
      setData({
        session: {
          name:
            session.firstName && session.lastName
              ? `${session.firstName} ${session.lastName}`
              : session.username,
          email: session.accessToken.startsWith("demo.") ? "demo@example.invalid" : session.username.includes("@") ? session.username : "",
          phone: /^\+?[0-9]{7,15}$/.test(session.username) ? session.username : "",
          address: "",
        },
        wallets: wallets.map((w, i) => ({
          id: w.id,
          name: w.name,
          currency: w.currency,
          balance: Number(balances[i]?.balance ?? 0),
          status: w.status as CustomerWallet["status"],
          dailyLimit: 50000,
          dailyUsed: 0,
          kind: i === 0 ? "primary" : "secondary",
        })),
        transactions: transactions.map((t) => ({
          id: String(t.id),
          type: (t.type.includes("TRANSFER") && t.sourceWalletId
            ? "TRANSFER_OUT"
            : t.type.includes("TRANSFER")
              ? "TRANSFER_IN"
              : t.type.includes("DEPOSIT")
                ? "DEPOSIT"
                : "WITHDRAWAL") as CustomerTransaction["type"],
          counterparty: t.description || t.reference,
          amount: Number(t.amount),
          currency: t.currency,
          status: t.status as CustomerTransaction["status"],
          method: "Sutura",
          category: t.type,
          time: t.createdAt,
        })),
        pendingCount: transactions.filter((t) => t.status === "PENDING").length,
        contacts: [],
      });
      if (wallets.length > 0) {
        setSelectedWalletId((prev) =>
          wallets.some((w) => w.id === prev) ? prev : wallets[0].id,
        );
      }
    } catch {
      // Keep existing data on failure; screens can pull-to-refresh.
    } finally {
      if(request===refreshGeneration.current)setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useAutoRefresh(refreshData,!!session?.accessToken);

  const toggleBalanceHidden = useCallback(() => {
    setBalanceHidden((prev) => !prev);
  }, []);

  const openWalletActions = useCallback((walletId: number) => {
    setSelectedWalletId(walletId);
    setWalletActionsTarget(walletId);
  }, []);

  const closeWalletActions = useCallback(() => {
    setWalletActionsTarget(null);
  }, []);

  const openTransaction = useCallback((transactionId: string) => {
    setSelectedTransactionId(transactionId);
  }, []);

  const closeTransaction = useCallback(() => {
    setSelectedTransactionId(null);
  }, []);

  const selectedTransaction = useMemo(
    () => (selectedTransactionId ? data.transactions.find((t) => t.id === selectedTransactionId) ?? null : null),
    [data.transactions, selectedTransactionId],
  );

  const selectedWallet = useMemo(
    () => data.wallets.find((w) => w.id === selectedWalletId) ?? data.wallets[0] ?? EMPTY_WALLET,
    [data.wallets, selectedWalletId],
  );

  const requireAuth = useCallback((): OpResult | null => {
    if (!session?.accessToken) {
      return { ok: false, error: "Please sign in to continue" };
    }
    return null;
  }, [session]);

  const sendMoney = useCallback(
    async (destination: string, amount: number, walletId = selectedWalletId): Promise<OpResult> => {
      const authError = requireAuth();
      if (authError) return authError;

      const wallet = data.wallets.find((w) => w.id === walletId) ?? selectedWallet;
      if (!wallet.id) return { ok: false, error: "No wallet available" };
      if (!amount || amount <= 0) return { ok: false, error: "Enter a valid amount" };
      if (amount > wallet.balance) return { ok: false, error: "Insufficient balance" };

      try {
        const phone = normalizePhone(destination);
        if (!phone) {
          return { ok: false, error: "Enter a valid recipient phone number, including its country code" };
        }
        const transfer = await api.createTransfer({
          sourceWalletId: walletId,
          recipientPhone: phone,
          amount,
          description: `Transfer to ${phone}`,
          reference: `xfer_${Date.now()}`,
        });
        await refreshData();
        if (transfer.transaction.status === "FAILED") return { ok: false, error: "Transfer was declined. No money was sent." };
        if (transfer.transaction.status === "PENDING") return { ok: false, error: "Transfer is pending compliance review. No money has been sent. Check activity for the result." };
        setTab("home");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: formatFraudError(err instanceof Error ? err.message : "Transfer failed") };
      }
    },
    [data.wallets, refreshData, requireAuth, selectedWallet, selectedWalletId, session],
  );

  const topUp = useCallback(
    async (amount: number, method: "mobile_money" | "agent", phone: string, walletId = selectedWalletId): Promise<OpResult> => {
      const authError = requireAuth();
      if (authError) return authError;

      const wallet = data.wallets.find((w) => w.id === walletId) ?? selectedWallet;
      if (!wallet.id) return { ok: false, error: "No wallet available" };
      if (!amount || amount <= 0) return { ok: false, error: "Enter a valid amount" };

      try {
        const deposit = await api.createDeposit({
          walletId,
          amount,
          currency: wallet.currency,
          paymentMethod: method === "agent" ? undefined : "mobile_money",
          phoneNumber: phone || undefined,
          description: method === "agent" ? "Agent cash-in" : "Mobile money top-up",
          idempotencyKey: `dep_${Date.now()}`,
        });
        if (method === "agent") {
          const qr = buildAgentQrPayload({
            operation: "DEPOSIT",
            reference: deposit.reference,
            walletId: wallet.id,
            walletName: wallet.name,
            amount: String(amount),
            currency: wallet.currency,
            merchant: data.session.name,
          });
          setDepositQr(qr);
        }
        if (method !== "agent") {
          if (!deposit.paymentUrl) throw new Error(`Checkout is unavailable. Deposit ${deposit.reference} remains pending.`);
          await Linking.openURL(deposit.paymentUrl);
        }
        await refreshData();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: formatFraudError(err instanceof Error ? err.message : "Deposit failed") };
      }
    },
    [data.session.name, data.wallets, refreshData, requireAuth, selectedWallet, selectedWalletId, session],
  );

  const withdraw = useCallback(
    async (amount: number, walletId = selectedWalletId): Promise<OpResult> => {
      const authError = requireAuth();
      if (authError) return authError;

      const wallet = data.wallets.find((w) => w.id === walletId) ?? selectedWallet;
      if (!wallet.id) return { ok: false, error: "No wallet available" };
      if (!amount || amount <= 0) return { ok: false, error: "Enter a valid amount" };
      if (amount > wallet.balance) return { ok: false, error: "Insufficient balance" };

      try {
        const withdrawal = await api.createWithdrawal({
          walletId,
          amount,
          currency: wallet.currency,
          withdrawalMethod: undefined,
          description: "Agent cash-out",
          idempotencyKey: `wd_${Date.now()}`,
        });
        const qr = buildAgentQrPayload({
          operation: "WITHDRAWAL",
          reference: withdrawal.reference,
          walletId: wallet.id,
          walletName: wallet.name,
          amount: String(amount),
          currency: wallet.currency,
          merchant: data.session.name,
        });
        setWithdrawalQr(qr);
        await refreshData();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: formatFraudError(err instanceof Error ? err.message : "Withdrawal failed") };
      }
    },
    [data.session.name, data.wallets, refreshData, requireAuth, selectedWallet, selectedWalletId, session],
  );

  const recentTransactions = useMemo(() => data.transactions.slice(0, 5), [data.transactions]);

  const value = useMemo(
    () => ({
      data,
      loading,
      tab,
      setTab,
      profileSection,
      setProfileSection,
      selectedWalletId,
      setSelectedWalletId,
      selectedWallet,
      depositQr,
      withdrawalQr,
      sendMoney,
      topUp,
      withdraw,
      refreshData,
      recentTransactions,
      balanceHidden,
      toggleBalanceHidden,
      walletActionsTarget,
      openWalletActions,
      closeWalletActions,
      selectedTransaction,
      openTransaction,
      closeTransaction,
    }),
    [
      data,
      loading,
      tab,
      profileSection,
      selectedWalletId,
      selectedWallet,
      depositQr,
      withdrawalQr,
      sendMoney,
      topUp,
      withdraw,
      refreshData,
      recentTransactions,
      balanceHidden,
      toggleBalanceHidden,
      walletActionsTarget,
      openWalletActions,
      closeWalletActions,
      selectedTransaction,
      openTransaction,
      closeTransaction,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function navTabFor(tab: TabId): TabId {
  if (tab === "topup" || tab === "withdraw") return "home";
  if (tab === "support" || tab === "profile" || tab === "verification") return "more";
  return tab;
}
