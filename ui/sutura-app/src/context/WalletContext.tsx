import { loadSnapshot, saveSnapshot, sameSnapshot } from "../storage/deviceVault";
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
import { randomUUID } from "expo-crypto";
import { pendingTransfers, reconcileTransfers, restoreTransferActivity, toActivity, type TransferIntent } from "../utils/transferActivity";

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
  /** Set when the last read failed; the data shown is from `lastUpdated`. */
  refreshError: string | null;
  lastUpdated: Date | null;
  /** True once the first read finished (success or failure). */
  loaded: boolean;
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
  const activeOwner = useRef(session?.username);
  activeOwner.current = session?.username;
  const submissions = useMemo(() => {
    const scope = `customer-transfers:${session?.username ?? "signed-out"}`;
    const state = { scope, items: [] as TransferIntent[], ready: Promise.resolve() };
    state.ready = session?.username ? loadSnapshot<TransferIntent[]>(scope).then(saved => {
      if (Array.isArray(saved?.data)) state.items = saved.data.map(t => t.submissionState === "sending"
        ? { ...t, submissionState: "uncertain" as const, status: "UNKNOWN" as const } : t);
    }).catch(() => undefined) : Promise.resolve();
    return state;
  }, [session?.username]);
  useEffect(() => {
    let cancelled = false;
    void submissions.ready.then(() => {
      if (cancelled) return;
      setData(current => {
        const transactions = restoreTransferActivity(current.transactions, submissions.items);
        return { ...current, transactions, pendingCount: pendingTransfers(transactions) };
      });
    });
    return () => { cancelled = true; };
  }, [submissions]);
  const [loading, setLoading] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
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
    setRefreshError(null); setLastUpdated(null); setLoaded(false);
  }, [session?.username]);

  const freshData = useRef(false);
  useEffect(() => {
    let cancelled = false; freshData.current = false;
    const scope = session?.username ? `customer:${session.username}` : null;
    if (scope) void loadSnapshot<CustomerDashboardData>(scope).then(saved => {
      if (cancelled || freshData.current || !saved || !Array.isArray(saved.data?.wallets) || !Array.isArray(saved.data?.transactions)) return;
      const transactions = restoreTransferActivity(saved.data.transactions, submissions.items);
      setData({ ...saved.data, transactions, pendingCount: pendingTransfers(transactions) });
      setLoaded(true); setLastUpdated(new Date(saved.savedAt));
      setRefreshError("Showing saved data. Reconnect to confirm current balances.");
      setSelectedWalletId(saved.data.wallets[0]?.id ?? 0);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [session?.username, submissions]);
  const refreshGeneration=useRef(0);
  useEffect(()=>()=>{refreshGeneration.current++;},[session?.username]);
  const refreshData = useCallback(async (silent = false) => {
    if (!session?.accessToken) {
      setData(EMPTY_DASHBOARD);
      return;
    }
    const request=++refreshGeneration.current;
    if (!silent) setLoading(true);
    try {
      await submissions.ready;
      const [{ wallets, balances }, transactions] = await Promise.all([
        api.listWallets().then(async wallets => ({
          wallets,
          balances: await Promise.all(wallets.map(w => api.getBalance(w.id))),
        })),
        api.listTransactions(),
      ]);
      if(request!==refreshGeneration.current)return;
      const activity = reconcileTransfers(transactions.map(t => toActivity(t, wallets.map(w => w.id))), submissions.items);
      submissions.items = activity.unresolved;
      void saveSnapshot(submissions.scope, submissions.items).catch(() => undefined);
      const next: CustomerDashboardData = {
        session: {
          name:
            session.firstName && session.lastName
              ? `${session.firstName} ${session.lastName}`
              : session.username,
          email: session.username.includes("@") ? session.username : "",
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
        transactions: activity.transactions,
        pendingCount: pendingTransfers(activity.transactions),
        contacts: [],
      };
      freshData.current = true;
      setData(current => sameSnapshot(current, next) ? current : next);
      void saveSnapshot(`customer:${session.username}`, { ...next, transactions: next.transactions.slice(0, 200) }).catch(() => undefined);
      if (wallets.length > 0) {
        setSelectedWalletId((prev) =>
          wallets.some((w) => w.id === prev) ? prev : wallets[0].id,
        );
      }
      setRefreshError(null);
      setLastUpdated(new Date());
    } catch (err) {
      // Keep the last good data but mark it stale; never show it as current.
      if (request === refreshGeneration.current) {
        const reason = err instanceof Error && /timed? ?out|timeout/i.test(err.message) ? "The connection timed out." : "Couldn't refresh.";
        setRefreshError(reason);
      }
    } finally {
      if(request===refreshGeneration.current){setLoading(false);setLoaded(true);}
    }
  }, [session?.username, session?.firstName, session?.lastName, submissions]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useAutoRefresh(() => refreshData(true),!!session?.accessToken,
    data.transactions.some(t => t.status === "PROCESSING") ? 5000 : 30000);

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
    () => (selectedTransactionId ? data.transactions.find((t) => t.id === selectedTransactionId || t.reference === selectedTransactionId) ?? null : null),
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
        await submissions.ready;
        if (activeOwner.current !== session?.username) return { ok: false, error: "Sign in again to send money." };
        if (submissions.items.some(t => t.status !== "FAILED" && t.counterparty === `Transfer to ${phone}` && t.amount === amount && t.currency === wallet.currency))
          return { ok: false, error: "This transfer is already being submitted. Check Activity before sending again." };
        const reference = `xfer_${randomUUID()}`;
        const intent: TransferIntent = {
          id: reference, reference, type: "TRANSFER_OUT", counterparty: `Transfer to ${phone}`,
          amount, currency: wallet.currency, time: new Date().toISOString(), method: "Sutura", category: "TRANSFER",
          status: "PROCESSING", submissionState: "sending",
        };
        submissions.items = [intent, ...submissions.items];
        // Persist the reference before dispatch. Recovery only reads; it never resends money.
        try { await saveSnapshot(submissions.scope, submissions.items); }
        catch {
          submissions.items = submissions.items.filter(t => t.reference !== reference);
          return { ok: false, error: "Could not save this request safely. Try again." };
        }
        if (activeOwner.current !== session?.username) {
          submissions.items = submissions.items.filter(t => t.reference !== reference);
          void saveSnapshot(submissions.scope, submissions.items).catch(() => undefined);
          return { ok: false, error: "Sign in again to send money." };
        }
        setData(current => {
          const transactions = [intent, ...current.transactions];
          return { ...current, transactions, pendingCount: pendingTransfers(transactions) };
        });
        setTab("home");
        void api.createTransfer({
          sourceWalletId: walletId,
          recipientPhone: phone,
          amount,
          description: `Transfer to ${phone}`,
          reference,
        }).then(transfer => {
          const transaction = toActivity(transfer.transaction, data.wallets.map(w => w.id));
          submissions.items = submissions.items.map(t => t.reference === reference
            ? { ...transaction, submissionState: "accepted" } : t);
          if (activeOwner.current === session?.username) {
            setData(current => {
              const existing = current.transactions.find(t => t.reference === reference);
              if (existing && ["COMPLETED", "FAILED", "REVERSED"].includes(existing.status)) return current;
              const transactions = [transaction, ...current.transactions.filter(t => t.reference !== reference)];
              return { ...current, transactions, pendingCount: pendingTransfers(transactions) };
            });
            void refreshData(true);
          }
        }).catch((error: unknown) => {
          const code = (error as { status?: number })?.status;
          const rejected = code !== undefined && [400, 403, 404, 409, 422].includes(code);
          const status = rejected ? "FAILED" as const : "UNKNOWN" as const;
          const failureReason = rejected ? formatFraudError(error instanceof Error ? error.message : "Transfer was not accepted. No money was sent.") : undefined;
          submissions.items = submissions.items.map(t => t.reference === reference
            ? { ...t, submissionState: "uncertain", status, failureReason } : t);
          if (activeOwner.current === session?.username) {
            setData(current => {
              const transactions = current.transactions.map(t => t.id === reference ? { ...t, status, failureReason } : t);
              return { ...current, transactions, pendingCount: pendingTransfers(transactions) };
            });
            void refreshData(true);
          }
        }).finally(() => { void saveSnapshot(submissions.scope, submissions.items).catch(() => undefined); });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: formatFraudError(err instanceof Error ? err.message : "Transfer failed") };
      }
    },
    [data.wallets, refreshData, requireAuth, selectedWallet, selectedWalletId, session, submissions],
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
      refreshError,
      lastUpdated,
      loaded,
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
      refreshError,
      lastUpdated,
      loaded,
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
