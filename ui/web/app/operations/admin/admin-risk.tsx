"use client";

import { useId, useState } from "react";
import { riskApi, type RiskFlagResponse } from "../../../lib/risk-api";
import {
  Button,
  DetailList,
  ErrorState,
  Field,
  InlineAlert,
  PageHeading,
  Panel,
  Skeleton,
  StatusBadge,
  fieldClass,
  formatDateTime,
  useApiResource,
} from "../../components/ui";
import { DataTable } from "../../dashboard/data-table";
import { ConfirmActionDrawer, IdEntry, RiskBadge, humanize, useAdminNav } from "./admin-shared";

type FlagRow = RiskFlagResponse & Record<string, unknown>;

export function AdminRisk() {
  const nav = useAdminNav();
  const [walletInput, setWalletInput] = useState("");
  const [walletId, setWalletId] = useState<number | null>(null);
  const [resolving, setResolving] = useState<RiskFlagResponse | null>(null);

  const flags = useApiResource(walletId ? () => riskApi.getUnresolvedFlags(walletId) : null, [walletId]);
  const summary = useApiResource(walletId ? () => riskApi.getSummary(walletId) : null, [walletId]);
  const critical = useApiResource(walletId ? () => riskApi.checkCritical(walletId) : null, [walletId]);
  const health = useApiResource(() => riskApi.fraudHealth(), []);
  const stats = useApiResource(() => riskApi.getRuleStats(), []);
  const config = useApiResource(() => riskApi.getEngineConfig(), []);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Risk"
        action={<Button variant="secondary" onClick={() => nav("transactions")}>Transaction risk scores</Button>}
        description="Look up a wallet's open risk flags, resolve them with a reason, and check the fraud engine."
      />

      <Panel title="Wallet risk" description="Risk flags are listed per wallet.">
        <IdEntry
          label="Wallet ID"
          value={walletInput}
          onChange={setWalletInput}
          submitLabel="Load flags"
          onSubmit={() => {
            const id = Number(walletInput);
            if (Number.isSafeInteger(id) && id > 0) setWalletId(id);
          }}
        />
        {walletId ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ResultList title="Summary" resource={summary} />
            <ResultList title="Critical check" resource={critical} />
          </div>
        ) : null}
      </Panel>

      {walletId ? (
        <DataTable<FlagRow>
          title={`Open flags for wallet #${walletId}`}
          exportFilename={`sutura-risk-flags-wallet-${walletId}`}
          dateKey="flaggedAt"
          searchPlaceholder="Search rule or reason"
          rows={(flags.data ?? []) as FlagRow[]}
          rowKey={(r) => String(r.id)}
          loading={flags.loading}
          error={flags.error}
          onRefresh={() => void flags.reload()}
          refreshing={flags.refreshing}
          onRowClick={(r) => setResolving(r)}
          rowLabel={(r) => `Review flag ${r.id}`}
          emptyTitle="No open flags"
          emptyDescription="This wallet has no unresolved risk flags."
          columns={[
            { key: "id", label: "Flag", sortValue: (r) => r.id, render: (r) => <span className="font-mono text-xs text-ink-2">#{r.id}</span> },
            {
              key: "riskLevel",
              label: "Level",
              sortValue: (r) => ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(r.riskLevel?.toUpperCase()),
              render: (r) => <RiskBadge level={r.riskLevel} />,
            },
            { key: "triggeringRule", label: "Rule", render: (r) => humanize(r.triggeringRule), exportValue: (r) => r.triggeringRule },
            { key: "riskScore", label: "Score", align: "right", sortValue: (r) => Number(r.riskScore), render: (r) => <span className="tabular-nums">{r.riskScore}</span> },
            { key: "reason", label: "Reason", hideOnMobile: true },
            {
              key: "flaggedAt",
              label: "Flagged",
              hideOnMobile: true,
              sortValue: (r) => r.flaggedAt ?? "",
              render: (r) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(r.flaggedAt)}</span>,
            },
          ]}
        />
      ) : null}

      <RiskEvaluate />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Fraud engine">
          {health.error && !health.data ? (
            <ErrorState title="Status unavailable" error={health.error} onRetry={() => void health.reload()} retrying={health.refreshing} />
          ) : !health.data ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-3">
              <StatusBadge
                tone={health.data.healthy ? "posted" : "failed"}
                label={health.data.healthy ? "Responding" : "Not responding"}
              />
              <DetailList
                items={[
                  { label: "Scoring enabled", value: health.data.enabled ? "Yes" : "No" },
                  { label: "Service", value: <span className="break-all font-mono text-xs">{health.data.baseUrl}</span> },
                ]}
              />
            </div>
          )}
        </Panel>
        <KeyValuePanel title="Rule statistics" resource={stats} />
        <KeyValuePanel title="Engine settings" resource={config} />
      </div>

      <ConfirmActionDrawer
        open={resolving !== null}
        onClose={() => setResolving(null)}
        title={`Resolve flag #${resolving?.id ?? ""}`}
        subtitle={resolving ? `Wallet #${resolving.walletId} · payment #${resolving.transactionId}` : undefined}
        context={
          resolving ? (
            <DetailList
              items={[
                { label: "Level", value: <RiskBadge level={resolving.riskLevel} /> },
                { label: "Rule", value: humanize(resolving.triggeringRule) },
                { label: "Score", value: resolving.riskScore },
                { label: "Reason", value: resolving.reason || "—" },
                { label: "Flagged", value: formatDateTime(resolving.flaggedAt) },
              ]}
            />
          ) : null
        }
        impact="Resolving closes the flag. It doesn't unfreeze the wallet or release any held payment; do that separately if needed."
        reasonLabel="Resolution"
        confirmLabel="Resolve flag"
        busyLabel="Resolving"
        successMessage={`Risk flag #${resolving?.id ?? ""} resolved.`}
        onConfirm={async (reason) => {
          if (!resolving) return;
          await riskApi.resolveFlag(resolving.id, reason);
          await flags.reload();
        }}
      />
    </div>
  );
}

function ResultList({
  title,
  resource,
}: {
  title: string;
  resource: { data: Record<string, unknown> | null; error: string | null; loading: boolean; reload: () => Promise<void>; refreshing: boolean };
}) {
  return (
    <div className="rounded-row border border-line p-3">
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      {resource.error ? (
        <p role="alert" className="text-sm text-status-failed-fg">
          {resource.error}
        </p>
      ) : !resource.data ? (
        <Skeleton className="h-12" />
      ) : (
        <dl className="space-y-1 text-sm">
          {Object.entries(resource.data)
            .filter(([, v]) => v === null || typeof v !== "object")
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-2">{humanize(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</dt>
                <dd className="text-right tabular-nums text-ink">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "—")}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}

function KeyValuePanel({
  title,
  resource,
}: {
  title: string;
  resource: { data: Record<string, unknown> | null; error: string | null; reload: () => Promise<void>; refreshing: boolean };
}) {
  const entries = resource.data ? Object.entries(resource.data) : [];
  return (
    <Panel title={title}>
      {resource.error && !resource.data ? (
        <ErrorState title={`${title} unavailable`} error={resource.error} onRetry={() => void resource.reload()} retrying={resource.refreshing} />
      ) : !resource.data ? (
        <Skeleton className="h-24" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink-2">Nothing reported.</p>
      ) : (
        <dl className="divide-y divide-line text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-ink-2">{humanize(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</dt>
              <dd className="break-all text-right tabular-nums text-ink">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/** Runs the rules engine and the ML fraud model for a hypothetical payment. Read-only; nothing is posted. */
function RiskEvaluate() {
  const ids = { wallet: useId(), amount: useId(), txn: useId() };
  const [form, setForm] = useState({ walletId: "", amount: "", transactionId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const walletId = Number(form.walletId);
    const amount = Number(form.amount);
    const transactionId = Number(form.transactionId);
    if (!Number.isSafeInteger(walletId) || walletId <= 0 || !(amount > 0) || !Number.isSafeInteger(transactionId)) {
      setError("Enter a wallet ID, an amount above zero and a payment ID.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const [rules, fraud] = await Promise.all([
        riskApi.evaluate(walletId, amount, transactionId),
        riskApi.scoreFraud(walletId, amount, String(transactionId)),
      ]);
      setResult(`Rules: ${humanize(rules.riskLevel)} risk, score ${rules.riskScore}. Fraud model: ${humanize(fraud.decision)}, score ${fraud.score.toFixed(4)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Risk evaluation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Evaluate a payment" description="Runs the rules engine and the fraud model. Read-only: nothing is posted or flagged by this check.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
        <Field label="Wallet ID" htmlFor={ids.wallet}>
          <input id={ids.wallet} className={fieldClass} inputMode="numeric" value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} required />
        </Field>
        <Field label="Amount" htmlFor={ids.amount}>
          <input id={ids.amount} className={`${fieldClass} tabular-nums`} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </Field>
        <Field label="Payment ID" htmlFor={ids.txn}>
          <input id={ids.txn} className={fieldClass} inputMode="numeric" value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} required />
        </Field>
        <Button type="submit" variant="secondary" busy={busy} busyLabel="Evaluating">
          Evaluate
        </Button>
      </form>
      {error ? (
        <div className="mt-3">
          <InlineAlert tone="error">{error}</InlineAlert>
        </div>
      ) : null}
      {result ? (
        <div className="mt-3">
          <InlineAlert tone="info">{result}</InlineAlert>
        </div>
      ) : null}
    </Panel>
  );
}
