import { loadSnapshot, saveSnapshot, sameSnapshot } from "../storage/deviceVault";
import type { WalletDepositQr } from "../utils/walletDepositQr";
import { useBackNavigation } from "../hooks/useBackNavigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {useAutoRefresh} from "../hooks/useAutoRefresh";
import {normalizePhone} from "../utils/inputValidation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { agentApi, type DepositWalletTarget } from "../api/client";
import { useAuth } from "./AuthContext";
import type {
  AgentOperation,
  AgentSession,
  AgentStats,
  AgentQrPayload,
  OpResult,
  TabId,
} from "../types";

const EMPTY_STATS: AgentStats = {
  todayDeposits: 0,
  todayWithdrawals: 0,
  todayVolume: 0,
  pendingCount: 0,
  completedToday: 0,
};

type AgentContextValue = {
  session: AgentSession;
  stats: AgentStats;
  tab: TabId;
  setTab: (tab: TabId) => void;
  pending: AgentOperation[];
  completed: AgentOperation[];
  activeOperation: AgentOperation | null;
  lookupReference: (reference: string) => Promise<OpResult>;
  lookupQr: (payload: AgentQrPayload) => Promise<OpResult>;
  depositTarget: DepositWalletTarget | null;
  prepareDepositQr: (payload: WalletDepositQr) => Promise<OpResult>;
  completeActive: () => Promise<OpResult>;
  clearActive: () => void;
  openOperation: (operation: AgentOperation) => void;
  createOnBehalf: (
    type: "DEPOSIT" | "WITHDRAWAL",
    customerPhone: string,
    amount: string,
    currency: string,
    idempotencyKey: string,
    walletId?: number,
  ) => Promise<OpResult>;
  recentCompleted: AgentOperation[];
  refreshHistory: () => Promise<void>;
  historyError: string;
  historyLoading: boolean;
  /** Time of the last successful history refresh; null until the first one. */
  lastUpdated: Date | null;
  /** Read-only lookup for the review step; never creates anything. */
  findCustomer: (phone: string) => Promise<{ ok: true; name: string; phone: string } | { ok: false; error: string }>;
};

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { session: authSession } = useAuth();
  const [tab, setTab] = useBackNavigation<TabId>("home");
  const [depositTarget, setDepositTarget] = useState<DepositWalletTarget | null>(null);
  useEffect(() => { if (tab !== "new-deposit") setDepositTarget(null); }, [tab]);
  const [pending, setPending] = useState<AgentOperation[]>([]);
  const pendingRef=useRef<AgentOperation[]>([]);pendingRef.current=pending;
  const [completed, setCompleted] = useState<AgentOperation[]>([]);
  const [historyError,setHistoryError]=useState("");
  const [historyLoading,setHistoryLoading]=useState(false);
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);
  const generation=useRef(0);
  const freshData=useRef(false);
  useEffect(() => {
    let cancelled=false; freshData.current=false;
    if (authSession?.username) void loadSnapshot<{pending:AgentOperation[];completed:AgentOperation[]}>(`agent:${authSession.username}`).then(saved=>{
      if(cancelled||freshData.current||!saved||!Array.isArray(saved.data?.pending)||!Array.isArray(saved.data?.completed))return;
      setPending(saved.data.pending);setCompleted(saved.data.completed);setLastUpdated(new Date(saved.savedAt));
      setHistoryError("Showing saved operations. Reconnect before completing a cash operation.");
    }).catch(()=>undefined);
    return()=>{cancelled=true;};
  },[authSession?.username]);
  const refreshHistory=useCallback(async(silent=false)=>{
    if(!authSession?.accessToken)return;const request=++generation.current;if(!silent)setHistoryLoading(true);
    try{const assigned=await agentApi.history();
      const known=new Set(assigned.map(op=>op.reference));
      const lookups=await Promise.allSettled(pendingRef.current.filter(op=>!known.has(op.reference)).map(op=>agentApi.lookup(op.reference)));
      const extra=lookups.flatMap(result=>result.status==="fulfilled"?[result.value]:[]);
      const rows=[...assigned,...extra].map(op=>({...op,amount:Number(op.amount)}) as AgentOperation);if(request!==generation.current)return;
      setActiveOperation(current=>{if(!current)return current;const next=rows.find(op=>op.reference===current.reference)??current;return sameSnapshot(current,next)?current:next;});
      freshData.current=true;setHistoryError("");
      setCompleted(current=>{const next=rows.filter(op=>op.status==="COMPLETED");return sameSnapshot(current,next)?current:next;});
      setLastUpdated(new Date());setPending(prev=>{const merged=new Map(prev.map(op=>[op.reference,op]));rows.forEach(op=>{if(["AWAITING_AGENT","PENDING","PENDING_REVIEW","APPROVED"].includes(op.status))merged.set(op.reference,op);else merged.delete(op.reference);});const next=[...merged.values()];return sameSnapshot(prev,next)?prev:next;});
    }catch(err){if(request===generation.current)setHistoryError(err instanceof Error?err.message:"Could not load activity.");}finally{if(request===generation.current)setHistoryLoading(false);}
  },[authSession?.username]);
  const stats=useMemo(()=>{const today=new Date().toDateString();const rows=completed.filter(op=>new Date(op.completedAt??op.createdAt).toDateString()===today);return {...EMPTY_STATS,completedToday:rows.length,todayDeposits:rows.filter(op=>op.operation==="DEPOSIT").length,todayWithdrawals:rows.filter(op=>op.operation==="WITHDRAWAL").length};},[completed]);
  const [activeOperation, setActiveOperation] = useState<AgentOperation | null>(null);
  const cashClaims = useRef(new Map<string, {token:string; expiresAt:string}>());
  useEffect(() => { cashClaims.current.clear(); }, [authSession?.username]);
  const completionInFlight = useRef(false);
  const queueScope=authSession?.accessToken&&!authSession.accessToken.startsWith("demo.")?`sutura-agent_pending:${authSession.username}`:null;
  const [hydratedQueue,setHydratedQueue]=useState<string|null>(null);
  const queueWrites=useRef(Promise.resolve());
  useEffect(()=>{let cancelled=false;setHydratedQueue(null);if(!queueScope)return;
    void (async()=>{try{
      await queueWrites.current;
      const raw=await AsyncStorage.getItem(queueScope);
      const parsed:unknown=raw?JSON.parse(raw):[];
      const refs=Array.isArray(parsed)?[...new Set(parsed.filter((v):v is string=>typeof v==="string"&&v.length>0&&v.length<=120))].slice(0,100):[];
      const responses=await Promise.all(refs.map(reference=>agentApi.lookup(reference)));
      if(cancelled)return;
      const restored=responses.filter(op=>["AWAITING_AGENT","PENDING","PENDING_REVIEW","APPROVED"].includes(op.status)).map(op=>({...op,amount:Number(op.amount)}) as AgentOperation);
      setPending(current=>[...new Map([...restored,...current].map(op=>[op.reference,op])).values()]);setHydratedQueue(queueScope);
    }catch{if(!cancelled)setHistoryError("Could not restore saved queue. Scan the reference again or reopen the app when connected.");}})();
    return()=>{cancelled=true;};
  },[queueScope]);
  useEffect(()=>{if(!queueScope||hydratedQueue!==queueScope)return;
    const references=JSON.stringify(pending.map(op=>op.reference).slice(0,100));
    queueWrites.current=queueWrites.current.then(()=>AsyncStorage.setItem(queueScope,references)).catch(()=>setHistoryError("Could not save the pending queue on this device."));
  },[queueScope,hydratedQueue,pending]);

  useEffect(() => {
    setPending([]);
    setCompleted([]);
    generation.current++;
    void refreshHistory();
    setActiveOperation(null);
    setTab("home");
    return ()=>{generation.current++;};
  }, [authSession?.username,refreshHistory]);

  useEffect(()=>{
    if(freshData.current&&authSession?.username&&lastUpdated)void saveSnapshot(`agent:${authSession.username}`,{pending:pending.slice(0,100),completed:completed.slice(0,200)},lastUpdated.getTime()).catch(()=>undefined);
  },[pending,completed,lastUpdated,authSession?.username]);
  useAutoRefresh(()=>refreshHistory(true),!!authSession?.accessToken);

  const agentSession = useMemo<AgentSession>(
    () => ({
      name:
        authSession?.firstName && authSession?.lastName
          ? `${authSession.firstName} ${authSession.lastName}`
          : authSession?.username ?? "Agent",
      agentCode: authSession?.username ?? "",
      location: "",
      phone: /^\+?[0-9]{7,15}$/.test(authSession?.username ?? "") ? authSession!.username : "",
      email: authSession?.username.includes("@") ? authSession.username : "",
    }),
    [authSession],
  );

  const requireAuth = useCallback((): OpResult | null => {
    if (!authSession?.accessToken) {
      return { ok: false, error: "Please sign in to continue" };
    }
    return null;
  }, [authSession]);

  const prepareDepositQr = useCallback(async (payload: WalletDepositQr): Promise<OpResult> => {
    const authError = requireAuth();
    if (authError) return authError;
    try {
      const target = await agentApi.depositWallet(payload.walletId);
      if (target.walletId !== payload.walletId || !Number.isSafeInteger(target.userId) || target.userId <= 0
          || !normalizePhone(target.phone) || !/^[A-Z]{3}$/.test(target.currency)
          || typeof target.name !== "string" || typeof target.walletName !== "string") {
        return { ok: false, error: "The deposit wallet response was invalid. Scan again." };
      }
      setDepositTarget(target);
      setTab("new-deposit");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not load the deposit wallet." };
    }
  }, [requireAuth, setTab]);

  const lookupReference = useCallback(
    async (reference: string): Promise<OpResult> => {
      const authError = requireAuth();
      if (authError) return authError;

      try {
        const op = await agentApi.lookup(reference);
        const mapped: AgentOperation = {
          operation: op.operation as AgentOperation["operation"],
          reference: op.reference,
          walletId: op.walletId,
          walletName: op.walletName,
          amount: Number(op.amount),
          currency: op.currency,
          status: op.status as AgentOperation["status"],
          userId: op.userId,
          merchantName: op.merchantName,
          createdAt: op.createdAt,
          completedAt: op.completedAt,
        };
        if (mapped.status === "COMPLETED") {
          return { ok: false, error: "This operation was already completed." };
        }
        setActiveOperation(mapped);
        setPending((prev) => [mapped, ...prev.filter((item) => item.reference !== mapped.reference)]);
        setTab("confirm");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Operation not found." };
      }
    },
    [authSession, requireAuth],
  );

  const lookupQr = useCallback(
    async (payload: AgentQrPayload): Promise<OpResult> => {
      if (payload.operation !== "WITHDRAWAL") return lookupReference(payload.reference);
      if (!payload.token) return { ok:false, error:"Scan the customer's current cash-out QR." };
      try {
        const grant = await agentApi.scanCashOut(payload.reference, payload.token);
        cashClaims.current.set(payload.reference, {token:grant.authorizationToken, expiresAt:grant.expiresAt});
        const op = {...grant.operation, amount:Number(grant.operation.amount)} as AgentOperation;
        setActiveOperation(op); setPending(prev => [op, ...prev.filter(p => p.reference !== op.reference)]); setTab("confirm");
        return {ok:true};
      } catch (err) { return {ok:false, error:err instanceof Error ? err.message : "Scan failed. Ask for a fresh QR."}; }
    },
    [lookupReference],
  );

  const completeActive = useCallback(async (): Promise<OpResult> => {
    if (completionInFlight.current) return { ok: false, error: "Completion is already in progress." };
    if (!activeOperation) return { ok: false, error: "No operation selected." };
    if (activeOperation.status === "COMPLETED") {
      return { ok: false, error: "Already completed." };
    }

    const authError = requireAuth();
    if (authError) return authError;

    completionInFlight.current = true;
    try {
      const claim = cashClaims.current.get(activeOperation.reference);
      if (activeOperation.operation === "WITHDRAWAL" && (!claim || Date.parse(claim.expiresAt) <= Date.now()))
        return {ok:false, error:"Cash-out approval expired. Scan the customer's current QR again."};
      const op = await agentApi.complete(activeOperation.reference, claim?.token);
      const completedOp: AgentOperation = {
        ...activeOperation,
        status: op.status as AgentOperation["status"],
        createdAt: op.createdAt,
          completedAt: op.completedAt,
      };
      if (op.status !== "COMPLETED") {
        setActiveOperation(completedOp);
        setPending((prev) => prev.map((item) =>
          item.reference === completedOp.reference ? completedOp : item));
        return {
          ok: false,
          error: op.status === "PENDING_REVIEW"
            ? "Awaiting Sentinel review. Do not exchange cash. After approval, scan a fresh customer QR for cash-out."
            : "Operation has not completed. Do not exchange cash; check its status before trying again.",
        };
      }
      setPending((prev) => prev.filter((item) => item.reference !== activeOperation.reference));
      setCompleted((prev) => [completedOp, ...prev.filter(item=>item.reference!==completedOp.reference)]);
      setActiveOperation(completedOp);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Completion failed." };
    } finally {
      completionInFlight.current = false;
    }
  }, [activeOperation, authSession, requireAuth]);

  const clearActive = useCallback(() => {
    setActiveOperation(null);
  }, []);

  const openOperation = useCallback((operation: AgentOperation) => {
    setActiveOperation(operation);
    setTab("confirm");
  }, []);

  const createOnBehalf = useCallback(
    async (type: "DEPOSIT" | "WITHDRAWAL", phone: string, amount: string, currency: string, idempotencyKey: string, walletId?: number): Promise<OpResult> => {
      const authError = requireAuth();
      if (authError) return authError;
      if (type === "WITHDRAWAL") return {ok:false, error:"Scan the customer's QR to cash out. Phone cash-out is not permitted."};
      const normalizedPhone=normalizePhone(phone);
      if (!normalizedPhone) return { ok: false, error: "Enter the customer's registered phone number." };
      if (!/^\d{1,13}(\.\d{1,4})?$/.test(amount) || Number(amount) < 0.01 || Number(amount) > 1e12) {
        return { ok: false, error: "Enter a valid amount with at most four decimal places." };
      }
      try {
        const customer = await agentApi.customer(normalizedPhone);
        const operation = await agentApi.createCash(type, customer.id, amount, currency, idempotencyKey, walletId);
        return await lookupReference(operation.reference);
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Could not create the operation." };
      }
    },
    [requireAuth, lookupReference],
  );

  const findCustomer = useCallback(async (phone: string) => {
    const authError = requireAuth();
    if (authError && !authError.ok) return { ok: false as const, error: authError.error };
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return { ok: false as const, error: "Enter the customer's registered phone number." };
    try {
      const customer = await agentApi.customer(normalizedPhone);
      return { ok: true as const, name: customer.name, phone: normalizedPhone };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Could not find this customer." };
    }
  }, [requireAuth]);

  const recentCompleted = useMemo(() => completed.slice(0, 5), [completed]);

  const value = useMemo(
    () => ({
      session: agentSession,
      stats: { ...stats, pendingCount: pending.length },
      tab,
      setTab,
      pending,
      completed,
      activeOperation,
      lookupReference,
      lookupQr,
      depositTarget, prepareDepositQr,
      completeActive,
      clearActive,
      openOperation,
      createOnBehalf,
      recentCompleted,
      refreshHistory,historyError,historyLoading,lastUpdated,findCustomer,
    }),
    [
      agentSession,
      stats,
      tab,
      pending,
      completed,
      activeOperation,
      lookupReference,
      lookupQr,
      depositTarget, prepareDepositQr,
      completeActive,
      clearActive,
      openOperation,
      createOnBehalf,
      recentCompleted,
      refreshHistory,historyError,historyLoading,lastUpdated,findCustomer,
    ],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used within AgentProvider");
  return ctx;
}

export function navTabFor(tab: TabId): TabId {
  if (tab === "confirm" || tab === "new-deposit" || tab === "new-withdrawal") return "scan";
  if (tab === "profile" || tab === "support") return "more";
  return tab;
}
