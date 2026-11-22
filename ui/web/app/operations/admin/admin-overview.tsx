"use client";

import { useRouter } from "next/navigation";
import { adminApi } from "../../../lib/admin-api";
import { Button, EmptyState, ErrorState, PageHeading, Panel, Skeleton, StatusBadge, UpdatedAgo, formatDateTime, useApiResource } from "../../components/ui";
import { KpiCard } from "../../dashboard/dashboard-toolbar";
import { humanize, useAdminNav } from "./admin-shared";

/**
 * "Today": the attention queue first. Every tile is a real count from
 * GET /api/v1/admin/dashboard and opens the filtered section.
 */
export function AdminOverview() {
  const nav = useAdminNav();
  const router = useRouter();
  const dashboard = useApiResource(() => adminApi.getDashboard(), []);
  const audit = useApiResource(() => adminApi.getAuditTrail(0, 6), []);
  const d = dashboard.data;

  const refresh = () => {
    void dashboard.reload();
    void audit.reload();
  };

  const attention = d
    ? [
        { label: "Failed payments", value: d.failedTransactions, href: "/dashboard/transactions?status=FAILED" },
        { label: "Critical risk flags", value: d.criticalRiskFlags, href: "/dashboard/risk" },
        { label: "Unresolved mismatches", value: d.unresolvedReconciliationMismatches, href: "/dashboard/reconciliation" },
        { label: "Frozen wallets", value: d.frozenWallets, href: "/dashboard/wallets?status=SUSPENDED" },
        { label: "Pending payments", value: d.pendingTransactions, href: "/dashboard/transactions?status=PENDING" },
        { label: "Failed operations", value: d.failedOperations, href: "/dashboard/audit?status=FAILED" },
      ]
    : [];
  const openItems = attention.filter((a) => a.value > 0).length;

  const health = d?.systemHealth ? Object.entries(d.systemHealth).filter(([, v]) => v !== null && typeof v !== "object") : [];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Today"
        description={
          d
            ? openItems === 0
              ? "Nothing needs attention right now."
              : `${openItems} ${openItems === 1 ? "queue needs" : "queues need"} attention.`
            : "What needs attention across wallets, payments, risk and reconciliation."
        }
        action={
          <>
            <UpdatedAgo at={dashboard.loadedAt} />
            <Button variant="secondary" onClick={() => nav("transactions")}>Payment risk</Button>
            <Button variant="secondary" icon="refresh" onClick={refresh} busy={dashboard.refreshing} busyLabel="Refreshing">
              Refresh
            </Button>
          </>
        }
      />

      {dashboard.error && !d ? (
        <Panel>
          <ErrorState title="Couldn't load the operations overview" error={dashboard.error} onRetry={refresh} retrying={dashboard.refreshing} />
        </Panel>
      ) : (
        <section aria-labelledby="attention-heading">
          <h2 id="attention-heading" className="mb-3 text-base font-semibold text-ink">
            Needs attention
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {d
              ? attention.map((a) => (
                  <KpiCard
                    key={a.label}
                    label={a.label}
                    value={a.value.toLocaleString("en-GB")}
                    change={a.value === 0 ? "None open" : undefined}
                    onClick={() => router.push(a.href)}
                  />
                ))
              : Array.from({ length: 6 }, (_, i) => <KpiCard key={i} label="Loading" value="" loading />)}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Recent admin actions"
          description="Latest entries from the audit trail."
          action={
            <Button variant="ghost" size="sm" onClick={() => nav("audit")}>
              Open audit trail
            </Button>
          }
        >
          {audit.error && !audit.data ? (
            <ErrorState title="Couldn't load the audit trail" error={audit.error} onRetry={() => void audit.reload()} retrying={audit.refreshing} />
          ) : !audit.data ? (
            <div className="space-y-3" role="status" aria-label="Loading audit trail">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : audit.data.content.length === 0 ? (
            <EmptyState title="No admin actions yet" icon="list">
              Freezes, reversals and reconciliations will be listed here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {audit.data.content.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{humanize(entry.actionType)}</p>
                    <p className="truncate text-xs text-ink-2">
                      {humanize(entry.entityType)} #{entry.entityId} · {entry.actorEmail}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge tone={entry.success ? "posted" : "failed"} label={entry.success ? "Done" : "Failed"} />
                    <span className="text-xs text-ink-3 tabular-nums">{formatDateTime(entry.timestamp)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Platform totals">
            {d ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Wallets", d.totalWallets],
                  ["Active wallets", d.activeWallets],
                  ["Payments", d.totalTransactions],
                  ["Risk flags", d.totalRiskFlags],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-ink-2">{label}</dt>
                    <dd className="mt-0.5 text-xl font-medium text-ink tabular-nums">{Number(value).toLocaleString("en-GB")}</dd>
                  </div>
                ))}
              </dl>
            ) : dashboard.error ? (
              <p className="text-sm text-ink-2">Unavailable until the overview loads.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3" aria-hidden="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            )}
          </Panel>

          {d && Object.keys(d.operationCounts ?? {}).length > 0 ? (
            <Panel title="Admin operations" description="Counts reported by the server.">
              <dl className="divide-y divide-line text-sm">
                {Object.entries(d.operationCounts).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2">
                    <dt className="text-ink-2">{humanize(k)}</dt>
                    <dd className="tabular-nums text-ink">{Number(v).toLocaleString("en-GB")}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}

          {health.length > 0 ? (
            <Panel title="System health" description="As reported by the server when the overview loaded.">
              <dl className="divide-y divide-line text-sm">
                {health.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2">
                    <dt className="text-ink-2">{humanize(k)}</dt>
                    <dd className="break-all text-right text-ink">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
