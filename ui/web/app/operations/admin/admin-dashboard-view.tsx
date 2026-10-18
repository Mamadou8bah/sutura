"use client";
import {usePathname,useRouter} from "next/navigation";
import {OperationsWorkspace,type OperationsKind} from "./operations-workspace";

import { useCallback, useEffect, useState } from "react";
import {
  DashboardShell,
  formatTimestamp,
  inputClass,
  PanelCard,
  PrimaryButton,
  SecondaryButton,
} from "../../dashboard/dashboard-shell";
import { BarChart, DashboardHeroCard, DonutChart, LineAreaChart, Sparkline } from "../../dashboard/dashboard-charts";
import { DashboardToolbar, KpiCard } from "../../dashboard/dashboard-toolbar";
import { DataTable } from "../../dashboard/data-table";
import { downloadCsv, type DateRangeKey } from "../../dashboard/dashboard-utils";
import { adminTabs } from "../../dashboard/dashboard-tabs";
import {
  initialAdminDashboard,createDemoAdminDashboard,
  type AdminDashboardData,
  type AdminRiskFlag,
  type AdminTransaction,
  type AdminWallet,
  type AdminWebhook,
  type AuditLogEntry,
  type ReconciliationMismatch,
  type ReconciliationReport,
} from "../../../lib/mock/admin-dashboard";
import { riskApi } from "../../../lib/risk-api";
import { adminApi } from "../../../lib/admin-api";
import {getDemoSession} from "../../../lib/demo-auth";
import { getAuthSession } from "../../../lib/auth-session";
import { SupportDesk } from "./support-desk";

type Tab = OperationsKind | "overview" | "wallets" | "transactions" | "webhooks" | "reconciliation" | "risk" | "audit" | "support";
type ActionMessage = { type: "success" | "error"; text: string } | null;

function nowIso() {
  return new Date().toISOString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function AdminDashboardView() {
  const [data, setData] = useState<AdminDashboardData>(()=>getDemoSession()&&!getAuthSession()?createDemoAdminDashboard():initialAdminDashboard);
  const router=useRouter();
  const pathname=usePathname();
  const action=pathname.split("/")[3];
  const tasks:Partial<Record<Tab,Record<string,string>>>={wallets:{freeze:"Freeze wallet",unfreeze:"Unfreeze wallet"},transactions:{reverse:"Reverse transaction",search:"Search transactions",lookup:"Lookup by ID",reference:"Lookup by reference"},webhooks:{reprocess:"Reprocess webhook",replay:"Replay webhook"}};
  const tab=(pathname.split("/")[2]||"overview") as Tab;
  const setTab=(next:Tab)=>router.push(next==="overview"?"/dashboard":`/dashboard/${next}`);
  const [message, setMessage] = useState<ActionMessage>(null);

  const [freezeForm, setFreezeForm] = useState({ walletId: "", reason: "", permanent: false });
  const [unfreezeWalletId, setUnfreezeWalletId] = useState("");
  const [reverseForm, setReverseForm] = useState({ transactionId: "", reason: "", refundToWallet: true });
  const [webhookForm, setWebhookForm] = useState({ webhookId: "", reason: "" });
  const [resolveForm, setResolveForm] = useState({ flagId: "", resolutionAction: "" });
  const [criticalWalletId, setCriticalWalletId] = useState("");
  const [mismatchResolveForm, setMismatchResolveForm] = useState({ mismatchId: "", resolutionAction: "" });
  const [manualReconType, setManualReconType] = useState<"WALLET_LEDGER" | "WEBHOOK_DEPOSIT">("WALLET_LEDGER");
  const [riskEvalForm, setRiskEvalForm] = useState({ walletId: "", amount: "", transactionId: "" });
  const [riskSummaryWalletId, setRiskSummaryWalletId] = useState("");
  const [txnSearchQuery, setTxnSearchQuery] = useState("");
  const [txnLookupId, setTxnLookupId] = useState("");
  const [txnLookupRef, setTxnLookupRef] = useState("");
  const [webhookReplayId, setWebhookReplayId] = useState("");
  const [webhookReplayReason,setWebhookReplayReason]=useState("");
  const [chartRange, setChartRange] = useState<DateRangeKey>("7d");
  const [globalSearch, setGlobalSearch] = useState("");
  const [fraudHealth, setFraudHealth] = useState<{ enabled: boolean; healthy: boolean; baseUrl: string } | null>(null);
  const [liveEngineConfig, setLiveEngineConfig] = useState<Record<string, unknown> | null>(null);
  const [liveRuleStats, setLiveRuleStats] = useState<Record<string, number> | null>(null);

  const hasApiSession = () => Boolean(getAuthSession()?.accessToken);

  const loadAdminLiveData = useCallback(async () => {
    if (!hasApiSession()) return;
    try {
      const [dashboard, wallets, audit,payments] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.listWallets(),
        adminApi.getAuditTrail(),adminApi.listPayments(),
      ]);
      setData((prev) => ({
        ...prev,
        totalWallets: dashboard.totalWallets,
        activeWallets: dashboard.activeWallets,
        frozenWallets: dashboard.frozenWallets,
        totalTransactions: dashboard.totalTransactions,
        failedTransactions: dashboard.failedTransactions,
        pendingTransactions: dashboard.pendingTransactions,
        totalRiskFlags: dashboard.totalRiskFlags,
        criticalRiskFlags: dashboard.criticalRiskFlags,
        unresolvedReconciliationMismatches: dashboard.unresolvedReconciliationMismatches,
        operationCounts: {
          reconciliations: dashboard.operationCounts.reconciliations ?? 0,
          freezes: dashboard.operationCounts.freezes ?? 0,
          reversals: dashboard.operationCounts.reversals ?? 0,
          reprocesses: dashboard.operationCounts.reprocesses ?? 0,
        },
        wallets: wallets.map((w) => ({
          id: w.id,
          owner: w.ownerEmail,
          email: w.ownerEmail,
          currency: w.currency,
          balance: String(w.balance),
          status: w.status as AdminWallet["status"],
          kycLevel: "BASIC" as const,
          dailyLimit: 0,
          dailyUsed: 0,
        })),
        transactions:payments.content.map(t=>({...t,amount:`${t.currency} ${t.amount}`,status:t.status as AdminTransaction["status"],sourceWalletId:t.sourceWalletId??0,destinationWalletId:t.destinationWalletId??0})),
        auditLogs: audit.content.map((entry) => ({
          id: String(entry.id),
          timestamp: entry.timestamp,
          actionType: entry.actionType,
          entityType: entry.entityType,
          entityId: entry.entityId,
          actor: entry.actorEmail,
          changeDescription: entry.changeDescription ?? "",
          success: entry.success,
        })),
      }));
    } catch(err) {
      setMessage({type:"error",text:err instanceof Error?err.message:"Could not load live admin data."});
    }
  }, []);

  useEffect(() => {
    void loadAdminLiveData();
  }, [loadAdminLiveData]);

  const loadRiskLiveData = useCallback(async () => {
    try {
      const [health, config, stats] = await Promise.all([
        riskApi.fraudHealth(),
        riskApi.getEngineConfig(),
        riskApi.getRuleStats(),
      ]);
      setFraudHealth(health);
      setLiveEngineConfig(config);
      setLiveRuleStats(stats);
    } catch {
      // Demo mode or unauthenticated — keep mock panels
    }
  }, []);

  useEffect(() => {
    if (tab === "risk") {
      void loadRiskLiveData();
    }
  }, [tab, loadRiskLiveData]);

  function notify(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  function addAudit(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
    const log: AuditLogEntry = { ...entry, id: `aud_${Date.now()}`, timestamp: nowIso() };
    setData((prev) => ({ ...prev, auditLogs: [log, ...prev.auditLogs] }));
  }

  async function handleFreezeWallet(e: React.FormEvent) {
    e.preventDefault();
    const walletId = Number(freezeForm.walletId);
    if (hasApiSession()) {
      try {
        await adminApi.freezeWallet(walletId, freezeForm.reason);
        await loadAdminLiveData();
        notify("success", `Wallet ${walletId} has been frozen`);
        setFreezeForm({ walletId: "", reason: "", permanent: false });
        return;
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Freeze failed");
        return;
      }
    }
    const wallet = data.wallets.find((w) => w.id === walletId);
    if (!wallet) return notify("error", `Wallet ${walletId} not found`);
    if (wallet.status === "SUSPENDED") return notify("error", `Wallet ${walletId} is already frozen`);

    setData((prev) => ({
      ...prev,
      wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, status: "SUSPENDED" as const } : w)),
      frozenWallets: prev.frozenWallets + 1,
      activeWallets: Math.max(0, prev.activeWallets - 1),
      operationCounts: { ...prev.operationCounts, freezes: prev.operationCounts.freezes + 1 },
    }));
    addAudit({ actionType: "FREEZE_WALLET", entityType: "WALLET", entityId: walletId, actor: "admin@sutura.local", changeDescription: freezeForm.reason, success: true });
    notify("success", `Wallet ${walletId} has been frozen`);
    setFreezeForm({ walletId: "", reason: "", permanent: false });
  }

  async function handleUnfreezeWallet(e: React.FormEvent) {
    e.preventDefault();
    const walletId = Number(unfreezeWalletId);
    if (hasApiSession()) {
      try {
        await adminApi.unfreezeWallet(walletId);
        await loadAdminLiveData();
        notify("success", `Wallet ${walletId} has been unfrozen`);
        setUnfreezeWalletId("");
        return;
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Unfreeze failed");
        return;
      }
    }
    const wallet = data.wallets.find((w) => w.id === walletId);
    if (!wallet) return notify("error", `Wallet ${walletId} not found`);
    if (wallet.status !== "SUSPENDED") return notify("error", `Wallet ${walletId} is not frozen`);

    setData((prev) => ({
      ...prev,
      wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, status: "ACTIVE" as const } : w)),
      frozenWallets: Math.max(0, prev.frozenWallets - 1),
      activeWallets: prev.activeWallets + 1,
    }));
    addAudit({ actionType: "UNFREEZE_WALLET", entityType: "WALLET", entityId: walletId, actor: "admin@sutura.local", changeDescription: "Admin unfreeze", success: true });
    notify("success", `Wallet ${walletId} has been unfrozen`);
    setUnfreezeWalletId("");
  }

  async function handleReverseTransaction(e: React.FormEvent) {
    e.preventDefault();
    const transactionId = Number(reverseForm.transactionId);
    if (hasApiSession()) {
      try {
        await adminApi.reverseTransaction(transactionId, reverseForm.reason, reverseForm.refundToWallet);
        await loadAdminLiveData();
        notify("success", `Transaction ${transactionId} has been reversed`);
        setReverseForm({ transactionId: "", reason: "", refundToWallet: true });
        return;
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Reverse failed");
        return;
      }
    }
    const txn = data.transactions.find((t) => t.id === transactionId);
    if (!txn) return notify("error", `Transaction ${transactionId} not found`);
    if (txn.status === "REVERSED") return notify("error", `Transaction ${transactionId} is already reversed`);

    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === transactionId ? { ...t, status: "REVERSED" as const } : t)),
      operationCounts: { ...prev.operationCounts, reversals: prev.operationCounts.reversals + 1 },
    }));
    addAudit({
      actionType: "REVERSE_TRANSACTION",
      entityType: "TRANSACTION",
      entityId: transactionId,
      actor: "admin@sutura.local",
      changeDescription: `${reverseForm.reason}${reverseForm.refundToWallet ? " (with refund)" : ""}`,
      success: true,
    });
    notify("success", `Transaction ${transactionId} has been reversed`);
    setReverseForm({ transactionId: "", reason: "", refundToWallet: true });
  }

  async function handleReprocessWebhook(e: React.FormEvent) {
    e.preventDefault();
    const webhookId = Number(webhookForm.webhookId);
    if(hasApiSession()){try{await adminApi.reprocessWebhook(webhookId,webhookForm.reason);await loadAdminLiveData();notify("success",`Webhook ${webhookId} marked for reprocessing`);return;}catch(err){notify("error",err instanceof Error?err.message:"Could not reprocess webhook");return;}}
    const webhook = data.webhooks.find((w) => w.id === webhookId);
    if (!webhook) return notify("error", `Webhook ${webhookId} not found`);

    setData((prev) => ({
      ...prev,
      webhooks: prev.webhooks.map((w) => (w.id === webhookId ? { ...w, status: "PENDING_REPROCESS" } : w)),
      operationCounts: { ...prev.operationCounts, reprocesses: prev.operationCounts.reprocesses + 1 },
    }));
    addAudit({ actionType: "REPROCESS_WEBHOOK", entityType: "WEBHOOK_EVENT", entityId: webhookId, actor: "admin@sutura.local", changeDescription: webhookForm.reason, success: true });
    notify("success", `Webhook ${webhookId} marked for reprocessing`);
    setWebhookForm({ webhookId: "", reason: "" });
  }

  async function triggerReconciliation(type: "WALLET_LEDGER" | "WEBHOOK_DEPOSIT") {
    if(hasApiSession()){try{const result=await(type==="WALLET_LEDGER"?adminApi.triggerWalletReconciliation():adminApi.triggerWebhookReconciliation()) as ReconciliationReport;setData(current=>({...current,reconciliationReports:[result,...current.reconciliationReports]}));await loadAdminLiveData();notify("success",`Reconciliation ${result.status.toLowerCase()}`);return;}catch(err){notify("error",err instanceof Error?err.message:"Reconciliation failed");return;}}
    const report: ReconciliationReport = {
      id: Date.now(),
      reconciliationType: type,
      status: "COMPLETED",
      startedAt: nowIso(),
      completedAt: nowIso(),
      totalRecordsChecked: type === "WALLET_LEDGER" ? data.totalTransactions : 1204,
      mismatchesFound: type === "WALLET_LEDGER" ? 1 : 0,
      mismatchesResolved: 0,
      summary: type === "WALLET_LEDGER" ? "Manual wallet-ledger reconciliation completed" : "Webhook-deposit reconciliation completed",
      triggeredBy: "admin@sutura.local",
      automated: false,
    };
    setData((prev) => ({
      ...prev,
      reconciliationReports: [report, ...prev.reconciliationReports],
      operationCounts: { ...prev.operationCounts, reconciliations: prev.operationCounts.reconciliations + 1 },
      unresolvedReconciliationMismatches: type === "WALLET_LEDGER" ? prev.unresolvedReconciliationMismatches + 1 : prev.unresolvedReconciliationMismatches,
    }));
    addAudit({ actionType: "TRIGGER_RECONCILIATION", entityType: "RECONCILIATION_REPORT", entityId: report.id, actor: "admin@sutura.local", changeDescription: `Triggered ${type}`, success: true });
    notify("success", "Reconciliation run completed");
  }

  async function handleResolveFlag(e: React.FormEvent) {
    e.preventDefault();
    const flagId = Number(resolveForm.flagId);
    const flag = data.riskFlags.find((f) => f.id === flagId);
    if (!flag) return notify("error", `Risk flag ${flagId} not found`);
    if (flag.resolved) return notify("error", `Risk flag ${flagId} is already resolved`);

    try {
      await riskApi.resolveFlag(flagId, resolveForm.resolutionAction);
    } catch(err) {
      if(hasApiSession()){notify("error",err instanceof Error?err.message:"Could not resolve risk flag");return;}
    }

    setData((prev) => ({
      ...prev,
      riskFlags: prev.riskFlags.map((f) => (f.id === flagId ? { ...f, resolved: true } : f)),
      totalRiskFlags: Math.max(0, prev.totalRiskFlags - 1),
      criticalRiskFlags: flag.level === "CRITICAL" ? Math.max(0, prev.criticalRiskFlags - 1) : prev.criticalRiskFlags,
    }));
    addAudit({ actionType: "RESOLVE_RISK_FLAG", entityType: "RISK_FLAG", entityId: flagId, actor: "admin@sutura.local", changeDescription: resolveForm.resolutionAction, success: true });
    notify("success", `Risk flag ${flagId} resolved`);
    setResolveForm({ flagId: "", resolutionAction: "" });
  }

  async function checkCriticalFlags() {
    const walletId = Number(criticalWalletId);
    try {
      const result = await riskApi.checkCritical(walletId);
      notify(
        "success",
        `Wallet ${walletId}: critical=${String(result.hasCriticalFlags)}, investigate=${String(result.shouldInvestigate)}`
      );
      return;
    } catch(err) {
      if(hasApiSession()){notify("error",err instanceof Error?err.message:"Could not load risk data");return;}
    }
    const flags = data.riskFlags.filter((f) => f.walletId === walletId && !f.resolved);
    const hasCritical = flags.some((f) => f.level === "CRITICAL");
    const hasHigh = flags.some((f) => f.level === "HIGH" || f.level === "CRITICAL");
    notify("success", `Wallet ${walletId}: critical=${hasCritical}, investigate=${hasCritical || hasHigh}`);
  }

  async function handleResolveMismatch(e: React.FormEvent) {
    e.preventDefault();
    const mismatchId = Number(mismatchResolveForm.mismatchId);
    if(hasApiSession()){try{await adminApi.resolveMismatch(mismatchId,mismatchResolveForm.resolutionAction);}catch(err){notify("error",err instanceof Error?err.message:"Could not resolve mismatch");return;}}
    const mismatch = data.reconciliationMismatches.find((m) => m.id === mismatchId);
    if (!mismatch) return notify("error", `Mismatch ${mismatchId} not found`);
    if (mismatch.resolved) return notify("error", `Mismatch ${mismatchId} is already resolved`);

    setData((prev) => ({
      ...prev,
      reconciliationMismatches: prev.reconciliationMismatches.map((m) =>
        m.id === mismatchId ? { ...m, resolved: true, resolutionAction: mismatchResolveForm.resolutionAction } : m
      ),
      unresolvedReconciliationMismatches: Math.max(0, prev.unresolvedReconciliationMismatches - 1),
      reconciliationStatus: {
        ...prev.reconciliationStatus,
        unresolvedMismatchCount: Math.max(0, prev.reconciliationStatus.unresolvedMismatchCount - 1),
      },
    }));
    addAudit({ actionType: "RESOLVE_MISMATCH", entityType: "RECONCILIATION_MISMATCH", entityId: mismatchId, actor: "admin@sutura.local", changeDescription: mismatchResolveForm.resolutionAction, success: true });
    notify("success", `Mismatch ${mismatchId} resolved`);
    setMismatchResolveForm({ mismatchId: "", resolutionAction: "" });
  }

  function handleManualReconciliation(e: React.FormEvent) {
    e.preventDefault();
    triggerReconciliation(manualReconType);
  }

  async function handleRiskEvaluate(e: React.FormEvent) {
    e.preventDefault();
    const walletId = Number(riskEvalForm.walletId);
    const amount = Number(riskEvalForm.amount);
    const transactionId = Number(riskEvalForm.transactionId);

    if(!hasApiSession()){const flags=data.riskFlags.filter(f=>f.walletId===walletId&&!f.resolved);notify("success",`Sample risk check: ${flags.length} open flags for wallet ${walletId}. No ML model was run.`);addAudit({actionType:"DEMO_RISK_CHECK",entityType:"TRANSACTION",entityId:transactionId,actor:"admin@sutura.local",changeDescription:`Sample amount ${amount}`,success:true});return;}
    try {
      const [rules, fraud] = await Promise.all([
        riskApi.evaluate(walletId, amount, transactionId),
        riskApi.scoreFraud(walletId, amount, String(transactionId)),
      ]);
      notify(
        "success",
        `Rules: ${rules.riskLevel} (${rules.riskScore}) · ML fraud: ${fraud.decision} (${fraud.score.toFixed(4)})`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Risk evaluation failed");
      return;
    }

    addAudit({ actionType: "RISK_EVALUATE", entityType: "TRANSACTION", entityId: transactionId, actor: "admin@sutura.local", changeDescription: `Amount ${amount}`, success: true });
    setRiskEvalForm({ walletId: "", amount: "", transactionId: "" });
  }

  async function handleRiskSummary(e: React.FormEvent) {
    e.preventDefault();
    const walletId = Number(riskSummaryWalletId);
    try {
      const summary = await riskApi.getSummary(walletId);
      notify(
        "success",
        `Wallet ${walletId}: ${summary.unresolvedFlags} open flags, high risk=${String(summary.hasHighRisk)}`
      );
      return;
    } catch(err) {
      if(hasApiSession()){notify("error",err instanceof Error?err.message:"Could not load risk data");return;}
    }
    const flags = data.riskFlags.filter((f) => f.walletId === walletId);
    notify("success", `Wallet ${walletId} risk summary: ${flags.length} flags, ${flags.filter((f) => !f.resolved).length} open`);
  }

  function handleTxnSearch(e: React.FormEvent) {
    e.preventDefault();
    const results = data.transactions.filter(
      (t) => t.reference.includes(txnSearchQuery) || String(t.id).includes(txnSearchQuery) || t.amount.includes(txnSearchQuery)
    );
    notify("success", `Search found ${results.length} transaction(s)`);
  }

  function handleTxnLookupById(e: React.FormEvent) {
    e.preventDefault();
    const txn = data.transactions.find((t) => t.id === Number(txnLookupId));
    notify(txn ? "success" : "error", txn ? `Transaction #${txn.id}: ${txn.status}, ${txn.amount}` : `Transaction ${txnLookupId} not found`);
  }

  function handleTxnLookupByRef(e: React.FormEvent) {
    e.preventDefault();
    const txn = data.transactions.find((t) => t.reference === txnLookupRef);
    notify(txn ? "success" : "error", txn ? `Reference ${txn.reference}: ${txn.status}, ${txn.amount}` : `Reference ${txnLookupRef} not found`);
  }

  async function handleWebhookReplay(e: React.FormEvent) {
    e.preventDefault();
    const webhookId = Number(webhookReplayId);
    if(!Number.isSafeInteger(webhookId)||webhookId<=0||!webhookReplayReason.trim())return notify("error","Enter a valid event ID and a replay reason");
    if(hasApiSession()){try{const result=await adminApi.replayWebhook(webhookId,webhookReplayReason.trim());await loadAdminLiveData();notify("success",result.message);return;}catch(err){notify("error",err instanceof Error?err.message:"Could not replay webhook");return;}}
    const webhook = data.webhooks.find((w) => w.id === webhookId);
    if (!webhook) return notify("error", `Webhook ${webhookId} not found`);
    addAudit({ actionType: "REPLAY_WEBHOOK", entityType: "WEBHOOK_EVENT", entityId: webhookId, actor: "admin@sutura.local", changeDescription: webhookReplayReason.trim(), success: true });
    notify("success", `Webhook ${webhookId} replay queued`);
    setWebhookReplayId("");setWebhookReplayReason("");
  }

  const attentionItems = [
    ...data.wallets.filter((w) => w.status === "SUSPENDED").map((w) => ({ label: `Frozen wallet #${w.id}`, sub: w.owner, action: () => setTab("wallets") })),
    ...data.transactions.filter((t) => t.status === "FAILED" || t.status === "PENDING").map((t) => ({ label: `${t.status} txn #${t.id}`, sub: t.amount, action: () => setTab("transactions") })),
    ...data.webhooks.filter((w) => w.status === "FAILED").map((w) => ({ label: `Webhook #${w.id}`, sub: w.eventType, action: () => setTab("webhooks") })),
    ...data.riskFlags.filter((f) => !f.resolved && f.level === "CRITICAL").map((f) => ({ label: `Critical flag #${f.id}`, sub: f.rule, action: () => setTab("risk") })),
  ].slice(0, 5);

  return (
    <DashboardShell tabs={adminTabs} activeTab={tab} onTabChange={(id) => setTab(id as Tab)} message={message}>
      {tasks[tab]&&<div className="mb-5 flex flex-wrap items-center gap-3">{action?<SecondaryButton onClick={()=>setTab(tab)}>Back to {adminTabs.find(t=>t.id===tab)?.label.toLowerCase()}</SecondaryButton>:Object.entries(tasks[tab]!).map(([key,label])=><SecondaryButton key={key} onClick={()=>router.push(`/dashboard/${tab}/${key}`)}>{label}</SecondaryButton>)}</div>}
      {(["customers","merchants","agents","deposits","withdrawals","collections","identity"] as string[]).includes(tab)&&<OperationsWorkspace key={tab} kind={tab as OperationsKind}/>}
      {tab === "support" && <SupportDesk />}
      {tab === "overview" && (
        <div className="space-y-5">
          <DashboardToolbar
            search={globalSearch}
            onSearchChange={setGlobalSearch}
            searchPlaceholder="Search platform metrics, wallets, transactions…"
            dateRange={chartRange}
            onDateRangeChange={setChartRange}
            onDownload={() =>
              downloadCsv("sutura-admin-overview", ["Metric", "Value"], [
                ["Gross volume", data.volumeToday[0]?.amount ?? ""],
                ["Active wallets", String(data.activeWallets)],
                ["Total transactions", String(data.totalTransactions)],
                ["Risk flags", String(data.totalRiskFlags)],
                ["Unresolved mismatches", String(data.unresolvedReconciliationMismatches)],
              ])
            }
            onRefresh={() => notify("success", "Dashboard refreshed")}
          />

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <DashboardHeroCard
                label="Gross volume today"
                value={data.volumeToday[0]?.amount ?? "—"}
                hint={`${data.volumeToday[0]?.change ?? ""} vs yesterday`}
                footerLeft={`System ${data.systemHealth.status}`}
                footerRight={`Uptime ${data.systemHealth.uptime}`}
                progress={94}
                progressLabel={`Operational capacity · ${data.activeWallets.toLocaleString()} active wallets`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard label="Frozen wallets" value={String(data.frozenWallets)} change="Requires review" changePositive={false} />
                <KpiCard label="Pending txns" value={String(data.pendingTransactions)} change={`${data.failedTransactions} failed`} changePositive={false} />
                <KpiCard label="Risk flags" value={String(data.totalRiskFlags)} change={`${data.criticalRiskFlags} critical`} changePositive={false} sparkline={<Sparkline values={data.charts.kpiSparklines.risk} color="#ef4444" />} />
                <KpiCard label="Recon gaps" value={String(data.unresolvedReconciliationMismatches)} change="Unresolved" changePositive={false} />
              </div>
            </div>

            <div className="space-y-5 min-w-0">
              <PanelCard title="Wallet status" subtitle="Distribution across platform">
                <DonutChart data={data.charts.walletStatus} />
              </PanelCard>
              <PanelCard title="Transaction status" subtitle="All-time breakdown">
                <DonutChart data={data.charts.transactionStatus} />
              </PanelCard>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 min-w-0">
            <PanelCard title="Transaction volume" subtitle={`GMD thousands · ${chartRange}`} className="min-w-0 overflow-hidden">
              <LineAreaChart data={data.charts.volumeByRange[chartRange]} valuePrefix="GMD " valueSuffix="K" height={220} />
            </PanelCard>
            <PanelCard title="Admin operations (7d)" subtitle="Actions performed this week" className="min-w-0 overflow-hidden">
              <BarChart data={data.charts.operationsWeekly} height={220} />
            </PanelCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <PanelCard title="Wallet controls" subtitle="Manage access from the wallet workspace."><SecondaryButton onClick={()=>router.push("/dashboard/wallets")}>Manage wallets</SecondaryButton></PanelCard>

            <PanelCard title="Requires attention" subtitle={`${attentionItems.length} open items`}>
              <ul className="space-y-2">
                {attentionItems.length === 0 ? (
                  <li className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">All clear — no urgent items.</li>
                ) : (
                  attentionItems.map((item) => (
                    <li key={item.label}>
                      <button type="button" onClick={item.action} className="flex w-full items-center justify-between rounded-2xl bg-slate-200 px-4 py-3 text-left transition-colors hover:bg-blue-200">
                        <span>
                          <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                          <span className="text-xs text-slate-500">{item.sub}</span>
                        </span>
                        <span className="text-xs font-bold text-[#123c91]">Review</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </PanelCard>

            <PanelCard title="Recent activity" subtitle="Admin audit trail">
              <ul className="space-y-3">
                {data.auditLogs.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 bg-slate-100 px-3 py-3 rounded-2xl mb-2 last:mb-0">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${entry.success ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{entry.actionType}</p>
                      <p className="truncate text-xs text-slate-500">{entry.entityType} #{entry.entityId} · {entry.actor}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatTimestamp(entry.timestamp).split(",")[1]}</span>
                  </li>
                ))}
              </ul>
            </PanelCard>
          </div>
        </div>
      )}

      {tab === "wallets" && (
        <OpsLayout
          main={action?null:<WalletTable wallets={data.wallets} onFreeze={(id) => {setFreezeForm({ walletId: String(id), reason: "", permanent: false });router.push("/dashboard/wallets/freeze");}} onUnfreeze={(id) => {setUnfreezeWalletId(String(id));router.push("/dashboard/wallets/unfreeze");}} />}
          side={
            <>
              {action==="freeze"&&<PanelCard title="Freeze wallet">
                <form className="space-y-3" onSubmit={handleFreezeWallet}>
                  <Field label="Wallet ID"><input type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={freezeForm.walletId} onChange={(e) => setFreezeForm({ ...freezeForm, walletId: e.target.value })} required /></Field>
                  <Field label="Reason"><input className={inputClass} value={freezeForm.reason} onChange={(e) => setFreezeForm({ ...freezeForm, reason: e.target.value })} required /></Field>
                  <PrimaryButton type="submit">Freeze wallet</PrimaryButton>
                </form>
              </PanelCard>}
              {action==="unfreeze"&&<PanelCard title="Unfreeze wallet">
                <form className="space-y-3" onSubmit={handleUnfreezeWallet}>
                  <Field label="Wallet ID"><input type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={unfreezeWalletId} onChange={(e) => setUnfreezeWalletId(e.target.value)} required /></Field>
                  <SecondaryButton type="submit" className="w-full">Unfreeze wallet</SecondaryButton>
                </form>
              </PanelCard>}
            </>
          }
        />
      )}

      {tab === "transactions" && (
        <OpsLayout
          main={action?null:<TransactionTable transactions={data.transactions} onReverse={(id) => {setReverseForm({ ...reverseForm, transactionId: String(id) });router.push("/dashboard/transactions/reverse");}} />}
          side={
            <>
              {action==="reverse"&&<PanelCard title="Reverse transaction">
                <form className="space-y-3" onSubmit={handleReverseTransaction}>
                  <Field label="Transaction ID"><input type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={reverseForm.transactionId} onChange={(e) => setReverseForm({ ...reverseForm, transactionId: e.target.value })} required /></Field>
                  <Field label="Reason"><input className={inputClass} value={reverseForm.reason} onChange={(e) => setReverseForm({ ...reverseForm, reason: e.target.value })} required /></Field>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={reverseForm.refundToWallet} onChange={(e) => setReverseForm({ ...reverseForm, refundToWallet: e.target.checked })} className="accent-[#123c91]" />
                    Refund to destination wallet
                  </label>
                  <PrimaryButton type="submit">Reverse transaction</PrimaryButton>
                </form>
              </PanelCard>}
              {action==="search"&&<PanelCard title="Search transactions">
                <form className="space-y-3" onSubmit={handleTxnSearch}>
                  <Field label="Query"><input className={inputClass} value={txnSearchQuery} onChange={(e) => setTxnSearchQuery(e.target.value)} placeholder="ID, reference, amount" required /></Field>
                  <SecondaryButton type="submit" className="w-full">Search</SecondaryButton>
                </form>
              </PanelCard>}
              {action==="lookup"&&<PanelCard title="Lookup by ID">
                <form className="space-y-3" onSubmit={handleTxnLookupById}>
                  <Field label="Transaction ID"><input type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={txnLookupId} onChange={(e) => setTxnLookupId(e.target.value)} required /></Field>
                  <SecondaryButton type="submit" className="w-full">Get transaction</SecondaryButton>
                </form>
              </PanelCard>}
              {action==="reference"&&<PanelCard title="Lookup by reference">
                <form className="space-y-3" onSubmit={handleTxnLookupByRef}>
                  <Field label="Reference"><input className={inputClass} value={txnLookupRef} onChange={(e) => setTxnLookupRef(e.target.value)} required /></Field>
                  <SecondaryButton type="submit" className="w-full">Get by reference</SecondaryButton>
                </form>
              </PanelCard>}
            </>
          }
        />
      )}

      {tab === "webhooks" && (
        <OpsLayout
          main={action?null:<WebhookTable webhooks={data.webhooks} onReprocess={(id) => {setWebhookForm({ webhookId: String(id), reason: "" });router.push("/dashboard/webhooks/reprocess");}} />}
          side={
            <>
              {action==="reprocess"&&<PanelCard title="Reprocess webhook">
                <form className="space-y-3" onSubmit={handleReprocessWebhook}>
                  <Field label="Webhook ID"><input type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={webhookForm.webhookId} onChange={(e) => setWebhookForm({ ...webhookForm, webhookId: e.target.value })} required /></Field>
                  <Field label="Reason"><input className={inputClass} value={webhookForm.reason} onChange={(e) => setWebhookForm({ ...webhookForm, reason: e.target.value })} required /></Field>
                  <PrimaryButton type="submit">Reprocess webhook</PrimaryButton>
                </form>
              </PanelCard>}
              {action==="replay"&&<PanelCard title="Replay webhook">
                <form className="space-y-3" onSubmit={handleWebhookReplay}>
                  <Field label="Webhook event ID"><input type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={webhookReplayId} onChange={(e) => setWebhookReplayId(e.target.value)} required /></Field>
                  <Field label="Replay reason"><textarea required maxLength={1000} className={inputClass} value={webhookReplayReason} onChange={e=>setWebhookReplayReason(e.target.value)} /></Field>
                  <SecondaryButton type="submit" className="w-full">Replay delivery</SecondaryButton>
                </form>
              </PanelCard>}

            </>
          }
        />
      )}

      {tab === "reconciliation" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Unresolved mismatches</p>
              <p className="mt-2 text-2xl font-black text-rose-700">{data.reconciliationStatus.unresolvedMismatchCount}</p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Reports with gaps</p>
              <p className="mt-2 text-2xl font-black text-[#123c91]">{data.reconciliationStatus.reportsWithMismatches}</p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Status</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">Live</p>
            </article>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <ReconciliationTable reports={data.reconciliationReports} unresolved={data.unresolvedReconciliationMismatches} />
              <MismatchTable mismatches={data.reconciliationMismatches} onResolve={(id) => setMismatchResolveForm({ mismatchId: String(id), resolutionAction: "" })} />
            </div>
            <div className="space-y-5">
              <PanelCard title="Wallet-ledger run">
                <p className="mb-4 text-sm text-slate-600">Compare wallet balances against ledger postings and surface mismatches.</p>
                <PrimaryButton type="button" onClick={() => triggerReconciliation("WALLET_LEDGER")}>Run reconciliation</PrimaryButton>
              </PanelCard>
              <PanelCard title="Webhook-deposit run">
                <p className="mb-4 text-sm text-slate-600">Match inbound webhook deposits to credited wallet entries.</p>
                <PrimaryButton type="button" onClick={() => triggerReconciliation("WEBHOOK_DEPOSIT")}>Run reconciliation</PrimaryButton>
              </PanelCard>
              <PanelCard title="Manual reconciliation">
                <form className="space-y-3" onSubmit={handleManualReconciliation}>
                  <Field label="Type">
                    <select className={inputClass} value={manualReconType} onChange={(e) => setManualReconType(e.target.value as "WALLET_LEDGER" | "WEBHOOK_DEPOSIT")}>
                      <option value="WALLET_LEDGER">Wallet ledger</option>
                      <option value="WEBHOOK_DEPOSIT">Webhook deposit</option>
                    </select>
                  </Field>
                  <SecondaryButton type="submit" className="w-full">Trigger manual run</SecondaryButton>
                </form>
              </PanelCard>
              <PanelCard title="Resolve mismatch">
                <form className="space-y-3" onSubmit={handleResolveMismatch}>
                  <Field label="Mismatch ID"><input className={inputClass} value={mismatchResolveForm.mismatchId} onChange={(e) => setMismatchResolveForm({ ...mismatchResolveForm, mismatchId: e.target.value })} required /></Field>
                  <Field label="Resolution action"><input className={inputClass} value={mismatchResolveForm.resolutionAction} onChange={(e) => setMismatchResolveForm({ ...mismatchResolveForm, resolutionAction: e.target.value })} required /></Field>
                  <PrimaryButton type="submit">Resolve mismatch</PrimaryButton>
                </form>
              </PanelCard>
            </div>
          </div>
        </div>
      )}

      {tab === "risk" && (
        <div className="space-y-5">
          <OpsLayout
            main={<RiskFlagTable flags={data.riskFlags} onResolve={(id) => setResolveForm({ ...resolveForm, flagId: String(id) })} />}
            side={
              <>
                <PanelCard title="Resolve flag">
                  <form className="space-y-3" onSubmit={handleResolveFlag}>
                    <Field label="Flag ID"><input className={inputClass} value={resolveForm.flagId} onChange={(e) => setResolveForm({ ...resolveForm, flagId: e.target.value })} required /></Field>
                    <Field label="Resolution"><input className={inputClass} value={resolveForm.resolutionAction} onChange={(e) => setResolveForm({ ...resolveForm, resolutionAction: e.target.value })} required /></Field>
                    <PrimaryButton type="submit">Resolve flag</PrimaryButton>
                  </form>
                </PanelCard>
                <PanelCard title="Critical check">
                  <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); checkCriticalFlags(); }}>
                    <Field label="Wallet ID"><input className={inputClass} value={criticalWalletId} onChange={(e) => setCriticalWalletId(e.target.value)} required /></Field>
                    <SecondaryButton type="submit" className="w-full">Check wallet</SecondaryButton>
                  </form>
                </PanelCard>
                <PanelCard title="Evaluate risk">
                  <form className="space-y-3" onSubmit={handleRiskEvaluate}>
                    <Field label="Wallet ID"><input className={inputClass} value={riskEvalForm.walletId} onChange={(e) => setRiskEvalForm({ ...riskEvalForm, walletId: e.target.value })} required /></Field>
                    <Field label="Amount"><input className={inputClass} value={riskEvalForm.amount} onChange={(e) => setRiskEvalForm({ ...riskEvalForm, amount: e.target.value })} required /></Field>
                    <Field label="Transaction ID"><input className={inputClass} value={riskEvalForm.transactionId} onChange={(e) => setRiskEvalForm({ ...riskEvalForm, transactionId: e.target.value })} required /></Field>
                    <PrimaryButton type="submit">Evaluate</PrimaryButton>
                  </form>
                </PanelCard>
                <PanelCard title="Wallet risk summary">
                  <form className="space-y-3" onSubmit={handleRiskSummary}>
                    <Field label="Wallet ID"><input className={inputClass} value={riskSummaryWalletId} onChange={(e) => setRiskSummaryWalletId(e.target.value)} required /></Field>
                    <SecondaryButton type="submit" className="w-full">Get summary</SecondaryButton>
                  </form>
                </PanelCard>
                <PanelCard title="ML fraud engine">
                  <dl className="space-y-2">
                    {fraudHealth ? (
                      <>
                        <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
                          <dt className="font-semibold text-slate-700">Status</dt>
                          <dd className="font-black text-slate-950">{fraudHealth.healthy ? "Healthy" : "Unavailable"}</dd>
                        </div>
                        <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
                          <dt className="font-semibold text-slate-700">Enabled</dt>
                          <dd className="font-black text-slate-950">{String(fraudHealth.enabled)}</dd>
                        </div>
                        <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
                          <dt className="font-semibold text-slate-700">Service URL</dt>
                          <dd className="font-black text-slate-950">{fraudHealth.baseUrl}</dd>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Sign in as admin to load live fraud API status.</p>
                    )}
                    <SecondaryButton type="button" className="w-full" onClick={() => void loadRiskLiveData()}>
                      Refresh status
                    </SecondaryButton>
                  </dl>
                </PanelCard>
              </>
            }
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <PanelCard title="Rule statistics">
              <dl className="space-y-2">
                {Object.entries(liveRuleStats ?? data.riskRuleStats).map(([rule, count]) => (
                  <div key={rule} className="flex justify-between rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
                    <dt className="font-semibold text-slate-700">{rule}</dt>
                    <dd className="font-black text-[#123c91]">{count}</dd>
                  </div>
                ))}
              </dl>
            </PanelCard>
            <PanelCard title="Engine config">
              <dl className="space-y-2">
                {Object.entries(liveEngineConfig ?? data.riskEngineConfig).map(([key, value]) => (
                  <div key={key} className="flex justify-between rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
                    <dt className="font-semibold text-slate-700">{key}</dt>
                    <dd className="font-black text-slate-950">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </PanelCard>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <DataTable
          title="Audit trail"
          subtitle={`GET /api/v1/admin/audit-trail · ${data.auditLogs.length} records`}
          exportFilename="sutura-audit-trail"
          searchPlaceholder="Search by action, actor, entity…"
          dateKey="timestamp"
          rows={data.auditLogs as unknown as Record<string, unknown>[]}
          columns={[
            { key: "actionType", label: "Action" },
            { key: "entityType", label: "Entity", render: (r) => `${String(r.entityType)} #${String(r.entityId)}`, exportValue: (r) => `${String(r.entityType)} #${String(r.entityId)}` },
            { key: "actor", label: "Actor" },
            { key: "changeDescription", label: "Description" },
            { key: "success", label: "Status", render: (r) => <StatusPill status={r.success ? "COMPLETED" : "FAILED"} />, exportValue: (r) => (r.success ? "COMPLETED" : "FAILED") },
            { key: "timestamp", label: "Time", render: (r) => formatTimestamp(String(r.timestamp)), exportValue: (r) => formatTimestamp(String(r.timestamp)) },
          ]}
        />
      )}
    </DashboardShell>
  );
}

function OpsLayout({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className={main?"space-y-5":"max-w-3xl"}>
      {main&&<div>{main}</div>}
      <div className="space-y-5">{side}</div>
    </div>
  );
}

function WalletTable({ wallets, onFreeze, onUnfreeze }: { wallets: AdminWallet[]; onFreeze: (id: number) => void; onUnfreeze: (id: number) => void }) {
  return (
    <DataTable
      title="Wallets"
      subtitle={`${wallets.length} managed accounts`}
      exportFilename="sutura-admin-wallets"
      searchPlaceholder="Search by owner, ID, status…"
      rows={wallets as unknown as Record<string, unknown>[]}
      columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-bold text-[#123c91]">#{String(r.id)}</span> },
        { key: "owner", label: "Owner", render: (r) => <><div className="font-semibold text-slate-900">{String(r.owner)}</div><div className="text-xs text-slate-500">{String(r.kycLevel)}</div></>, exportValue: (r) => String(r.owner) },
        { key: "balance", label: "Balance", render: (r) => <span className="font-semibold">{String(r.currency)} {String(r.balance)}</span>, exportValue: (r) => `${String(r.currency)} ${String(r.balance)}` },
        { key: "status", label: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
        {
          key: "_actions",
          label: "",
          searchValue: () => "",
          exportValue: () => "",
          render: (r) => (
            <div className="text-right">
              {r.status === "SUSPENDED" ? (
                <button type="button" onClick={() => onUnfreeze(Number(r.id))} className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-[#123c91]">Unfreeze</button>
              ) : (
                <button type="button" onClick={() => onFreeze(Number(r.id))} className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700">Freeze</button>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

function TransactionTable({ transactions, onReverse }: { transactions: AdminTransaction[]; onReverse: (id: number) => void }) {
  return (
    <DataTable
      title="Transactions"
      subtitle="Pending, failed, and completed transfers"
      exportFilename="sutura-admin-transactions"
      dateKey="createdAt"
      searchPlaceholder="Search by ID, reference, amount, status…"
      rows={transactions as unknown as Record<string, unknown>[]}
      columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-bold">#{String(r.id)}</span> },
        { key: "amount", label: "Amount", render: (r) => <span className="font-semibold">{String(r.amount)}</span> },
        { key: "sourceWalletId", label: "Route", render: (r) => `${String(r.sourceWalletId)} → ${String(r.destinationWalletId)}`, exportValue: (r) => `${String(r.sourceWalletId)} → ${String(r.destinationWalletId)}` },
        { key: "status", label: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
        { key: "createdAt", label: "Created", render: (r) => formatTimestamp(String(r.createdAt)), exportValue: (r) => formatTimestamp(String(r.createdAt)) },
        {
          key: "_actions",
          label: "",
          searchValue: () => "",
          exportValue: () => "",
          render: (r) => (
            <div className="text-right">
              {r.status !== "REVERSED" ? (
                <button type="button" onClick={() => onReverse(Number(r.id))} className="rounded-full bg-[#123c91] px-3 py-1.5 text-xs font-bold text-white">Reverse</button>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}

function WebhookTable({ webhooks, onReprocess }: { webhooks: AdminWebhook[]; onReprocess: (id: number) => void }) {
  return (
    <DataTable
      title="Webhook events"
      subtitle="Provider callbacks and delivery status"
      exportFilename="sutura-admin-webhooks"
      dateKey="receivedAt"
      searchPlaceholder="Search by event, ID, status…"
      rows={webhooks as unknown as Record<string, unknown>[]}
      columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-bold">#{String(r.id)}</span> },
        { key: "eventType", label: "Event" },
        { key: "status", label: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
        { key: "receivedAt", label: "Received", render: (r) => formatTimestamp(String(r.receivedAt)), exportValue: (r) => formatTimestamp(String(r.receivedAt)) },
        {
          key: "_actions",
          label: "",
          searchValue: () => "",
          exportValue: () => "",
          render: (r) => (
            <div className="text-right">
              <button type="button" onClick={() => onReprocess(Number(r.id))} className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700">Reprocess</button>
            </div>
          ),
        },
      ]}
    />
  );
}

function ReconciliationTable({ reports, unresolved }: { reports: ReconciliationReport[]; unresolved: number }) {
  return (
    <DataTable
      title="Reconciliation reports"
      subtitle={`${unresolved} unresolved mismatches`}
      exportFilename="sutura-admin-reconciliation-reports"
      dateKey="startedAt"
      searchPlaceholder="Search reports by type, status, summary…"
      rows={reports as unknown as Record<string, unknown>[]}
      action={<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Live</span>}
      columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-bold">#{String(r.id)}</span> },
        { key: "reconciliationType", label: "Type", render: (r) => String(r.reconciliationType).replace("_", " ") },
        { key: "status", label: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
        { key: "mismatchesFound", label: "Mismatches", render: (r) => `${String(r.mismatchesFound)} / ${String(r.mismatchesResolved)} resolved`, exportValue: (r) => `${String(r.mismatchesFound)} / ${String(r.mismatchesResolved)} resolved` },
        { key: "summary", label: "Summary" },
      ]}
    />
  );
}

function MismatchTable({ mismatches, onResolve }: { mismatches: ReconciliationMismatch[]; onResolve: (id: number) => void }) {
  return (
    <DataTable
      title="Reconciliation mismatches"

      exportFilename="sutura-admin-reconciliation-mismatches"
      dateKey="createdAt"
      searchPlaceholder="Search by type, entity, variance…"
      rows={mismatches as unknown as Record<string, unknown>[]}
      columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-bold">#{String(r.id)}</span> },
        { key: "mismatchType", label: "Type" },
        { key: "entityId", label: "Entity", render: (r) => `${String(r.entityType)} #${String(r.entityId)}`, exportValue: (r) => `${String(r.entityType)} #${String(r.entityId)}` },
        { key: "variance", label: "Variance", render: (r) => <span className="font-semibold text-rose-700">{String(r.variance)}</span> },
        { key: "resolved", label: "Status", render: (r) => (r.resolved ? <span className="text-xs text-slate-500">Resolved</span> : <StatusPill status="PENDING" />), exportValue: (r) => (r.resolved ? "Resolved" : "PENDING") },
        {
          key: "_actions",
          label: "",
          searchValue: () => "",
          exportValue: () => "",
          render: (r) => (
            <div className="text-right">
              {!r.resolved ? (
                <button type="button" onClick={() => onResolve(Number(r.id))} className="rounded-full bg-[#123c91] px-3 py-1.5 text-xs font-bold text-white">Resolve</button>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}

function RiskFlagTable({ flags, onResolve }: { flags: AdminRiskFlag[]; onResolve: (id: number) => void }) {
  return (
    <DataTable
      title="Risk flags"
      subtitle="Open and resolved monitoring alerts"
      exportFilename="sutura-admin-risk-flags"
      dateKey="createdAt"
      searchPlaceholder="Search by wallet, rule, level…"
      rows={flags as unknown as Record<string, unknown>[]}
      columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-bold">#{String(r.id)}</span> },
        { key: "walletId", label: "Wallet" },
        { key: "level", label: "Level", render: (r) => <LevelPill level={r.level as AdminRiskFlag["level"]} /> },
        { key: "rule", label: "Rule" },
        {
          key: "_actions",
          label: "",
          searchValue: () => "",
          exportValue: () => "",
          render: (r) => (
            <div className="text-right">
              {!r.resolved ? (
                <button type="button" onClick={() => onResolve(Number(r.id))} className="rounded-full bg-[#123c91] px-3 py-1.5 text-xs font-bold text-white">Resolve</button>
              ) : (
                <span className="text-xs text-slate-400">Resolved</span>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE" || status === "COMPLETED" || status === "PROCESSED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "SUSPENDED" || status === "PENDING" || status === "PENDING_REPROCESS" || status === "RUNNING"
        ? "bg-amber-100 text-amber-800"
        : status === "FAILED" || status === "REVERSED"
          ? "bg-rose-100 text-rose-800"
          : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${tone}`}>{status}</span>;
}

function LevelPill({ level }: { level: AdminRiskFlag["level"] }) {
  const tone =
    level === "CRITICAL" ? "bg-rose-100 text-rose-800" : level === "HIGH" ? "bg-orange-100 text-orange-800" : level === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{level}</span>;
}
