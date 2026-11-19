"use client";

import { useMemo, useState } from "react";
import { adminApi, type ReconciliationMismatchDto, type ReconciliationReportDto } from "../../../lib/admin-api";
import {
  Button,
  DetailList,
  Drawer,
  ErrorState,
  PageHeading,
  Panel,
  Skeleton,
  StatusBadge,
  UpdatedAgo,
  formatAmount,
  formatDateTime,
  useApiResource,
} from "../../components/ui";
import { KpiCard } from "../../dashboard/dashboard-toolbar";
import { DataTable } from "../../dashboard/data-table";
import { ConfirmActionDrawer, humanize } from "./admin-shared";

type RunType = "WALLET_LEDGER" | "WEBHOOK_DEPOSIT";
type MismatchRow = ReconciliationMismatchDto & Record<string, unknown>;
type ReportRow = ReconciliationReportDto & Record<string, unknown>;

const runCopy: Record<RunType, { title: string; impact: string }> = {
  WALLET_LEDGER: {
    title: "Wallet-ledger reconciliation",
    impact: "Compares every wallet balance with the sum of its ledger postings. It only reads balances; new mismatches are listed for review.",
  },
  WEBHOOK_DEPOSIT: {
    title: "Webhook-deposit reconciliation",
    impact: "Matches provider deposit callbacks to credited wallet entries. It only reads records; new mismatches are listed for review.",
  },
};

export function AdminReconciliation() {
  const status = useApiResource(() => adminApi.getReconciliationStatus(), []);
  const mismatches = useApiResource(() => adminApi.listMismatches(), []);
  const [runs, setRuns] = useState<ReconciliationReportDto[]>([]);
  const [pendingRun, setPendingRun] = useState<RunType | null>(null);
  const [selected, setSelected] = useState<ReconciliationMismatchDto | null>(null);
  const [resolving, setResolving] = useState<ReconciliationMismatchDto | null>(null);

  const reports = useMemo(() => {
    const seen = new Set<number>();
    return [...runs, ...(status.data?.recentReports ?? [])].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }, [runs, status.data]);

  const reloadAll = async () => {
    await Promise.all([status.reload(), mismatches.reload()]);
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Reconciliation"
        description="Check that wallet balances and provider deposits agree with the ledger, and resolve what doesn't."
        action={
          <>
            <UpdatedAgo at={status.loadedAt} />
            <Button variant="secondary" onClick={() => setPendingRun("WEBHOOK_DEPOSIT")}>
              Run webhook-deposit check
            </Button>
            <Button onClick={() => setPendingRun("WALLET_LEDGER")} icon="scale">
              Run wallet-ledger check
            </Button>
          </>
        }
      />

      {status.error && !status.data ? (
        <Panel>
          <ErrorState title="Couldn't load reconciliation status" error={status.error} onRetry={() => void status.reload()} retrying={status.refreshing} />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard
            label="Unresolved mismatches"
            value={status.data ? status.data.unresolvedMismatchCount.toLocaleString("en-GB") : ""}
            loading={!status.data}
          />
          <KpiCard
            label="Reports with mismatches"
            value={status.data ? status.data.reportsWithMismatches.toLocaleString("en-GB") : ""}
            loading={!status.data}
          />
        </div>
      )}

      <DataTable<MismatchRow>
        title="Unresolved mismatches"
        subtitle="Open a mismatch to see expected and actual values, then resolve it with a reason."
        exportFilename="sutura-reconciliation-mismatches"
        dateKey="createdAt"
        searchPlaceholder="Search type, entity or description"
        rows={(mismatches.data ?? []) as MismatchRow[]}
        rowKey={(r) => String(r.id)}
        loading={mismatches.loading}
        error={mismatches.error}
        onRefresh={() => void mismatches.reload()}
        refreshing={mismatches.refreshing}
        onRowClick={(r) => setSelected(r)}
        rowLabel={(r) => `Open mismatch ${r.id}`}
        selectedKey={selected ? String(selected.id) : null}
        emptyTitle="No unresolved mismatches"
        emptyDescription="The ledger agrees with wallets and deposits as of the last run."
        columns={[
          { key: "id", label: "Mismatch", sortValue: (r) => r.id, render: (r) => <span className="font-mono text-xs text-ink-2">#{r.id}</span> },
          { key: "mismatchType", label: "Type", render: (r) => humanize(r.mismatchType), exportValue: (r) => humanize(r.mismatchType) },
          {
            key: "entity",
            label: "Record",
            searchValue: (r) => `${r.entityType} ${r.entityId}`,
            render: (r) => `${humanize(r.entityType)} #${r.entityId}`,
            exportValue: (r) => `${r.entityType} #${r.entityId}`,
          },
          {
            key: "variance",
            label: "Variance",
            align: "right",
            sortValue: (r) => Math.abs(Number(r.variance ?? 0)),
            render: (r) => <span className="tabular-nums text-ink">{r.variance === null ? "—" : formatAmount(r.variance)}</span>,
          },
          {
            key: "createdAt",
            label: "Found",
            hideOnMobile: true,
            sortValue: (r) => r.createdAt ?? "",
            render: (r) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(r.createdAt)}</span>,
            exportValue: (r) => formatDateTime(r.createdAt),
          },
        ]}
      />

      <Panel title="Recent runs" description="The latest reconciliation reports that found mismatches, plus runs started here.">
        {!status.data && !status.error ? (
          <div className="space-y-2" role="status" aria-label="Loading reports">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-ink-2">No reports with mismatches. Start a run above to check now.</p>
        ) : (
          <ReportList reports={reports as ReportRow[]} />
        )}
      </Panel>

      <ConfirmActionDrawer
        open={pendingRun !== null}
        onClose={() => setPendingRun(null)}
        title={pendingRun ? `Run ${runCopy[pendingRun].title.toLowerCase()}` : ""}
        impact={pendingRun ? runCopy[pendingRun].impact : undefined}
        requireReason={false}
        confirmLabel="Start run"
        busyLabel="Running reconciliation"
        successMessage="Reconciliation run finished."
        onConfirm={async () => {
          if (!pendingRun) return;
          const report = await (pendingRun === "WALLET_LEDGER" ? adminApi.triggerWalletReconciliation() : adminApi.triggerWebhookReconciliation());
          if (report && typeof report === "object" && "id" in report) setRuns((r) => [report, ...r]);
          await reloadAll();
        }}
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Mismatch #${selected.id}` : ""}
        subtitle={selected ? `${humanize(selected.mismatchType)} · ${humanize(selected.entityType)} #${selected.entityId}` : undefined}
        footer={
          selected && !selected.resolved ? (
            <Button
              onClick={() => {
                setResolving(selected);
                setSelected(null);
              }}
            >
              Resolve mismatch
            </Button>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <StatusBadge tone={selected.resolved ? "posted" : "pending"} label={selected.resolved ? "Resolved" : "Unresolved"} />
            <section aria-label="Expected and actual values">
              <h3 className="mb-2 text-sm font-semibold text-ink">Values compared</h3>
              <DetailList
                items={[
                  { label: "Expected", value: <span className="tabular-nums">{selected.expectedValue ?? "—"}</span> },
                  { label: "Actual", value: <span className="tabular-nums">{selected.actualValue ?? "—"}</span> },
                  {
                    label: "Variance",
                    value: <span className="tabular-nums">{selected.variance === null ? "—" : formatAmount(selected.variance)}</span>,
                    emphasis: true,
                  },
                ]}
              />
              <p className="mt-2 text-xs text-ink-3">
                Individual debit and credit postings aren&apos;t returned by the reconciliation API, so only the compared totals are shown.
              </p>
            </section>
            <DetailList
              items={[
                { label: "Description", value: selected.description || "—" },
                { label: "Report", value: `#${selected.reportId}` },
                { label: "Found", value: formatDateTime(selected.createdAt) },
                ...(selected.resolved
                  ? [
                      { label: "Resolution", value: selected.resolutionAction || "—" },
                      { label: "Resolved by", value: selected.resolvedBy || "—" },
                    ]
                  : []),
              ]}
            />
          </div>
        ) : null}
      </Drawer>

      <ConfirmActionDrawer
        open={resolving !== null}
        onClose={() => setResolving(null)}
        title={`Resolve mismatch #${resolving?.id ?? ""}`}
        subtitle={resolving ? `${humanize(resolving.entityType)} #${resolving.entityId}` : undefined}
        context={
          resolving ? (
            <DetailList
              items={[
                { label: "Expected", value: resolving.expectedValue ?? "—" },
                { label: "Actual", value: resolving.actualValue ?? "—" },
                { label: "Variance", value: resolving.variance === null ? "—" : formatAmount(resolving.variance), emphasis: true },
              ]}
            />
          ) : null
        }
        impact="Resolving closes the mismatch and records your explanation. It doesn't post a correcting entry; make any ledger correction first."
        reasonLabel="How was it resolved?"
        confirmLabel="Resolve mismatch"
        busyLabel="Resolving"
        successMessage={`Mismatch #${resolving?.id ?? ""} resolved.`}
        onConfirm={async (reason) => {
          if (!resolving) return;
          await adminApi.resolveMismatch(resolving.id, reason);
          await reloadAll();
        }}
      />
    </div>
  );
}

function ReportList({ reports }: { reports: ReportRow[] }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="min-w-full text-left text-[13px] tabular-nums">
        <caption className="sr-only">Recent reconciliation runs</caption>
        <thead>
          <tr className="border-y border-line bg-surface-2/60 text-xs text-ink-2">
            <th scope="col" className="h-9 px-3 pl-4 font-medium sm:pl-5">Run</th>
            <th scope="col" className="px-3 font-medium">Status</th>
            <th scope="col" className="px-3 text-right font-medium">Checked</th>
            <th scope="col" className="px-3 text-right font-medium">Mismatches</th>
            <th scope="col" className="px-3 pr-4 font-medium sm:pr-5">Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {reports.map((r) => (
            <tr key={r.id} className="h-10">
              <td className="px-3 py-2 pl-4 sm:pl-5">
                <div className="text-ink">{humanize(r.reconciliationType)}</div>
                <div className="text-xs text-ink-3">
                  #{r.id} · {r.automated ? "Scheduled" : `By ${r.triggeredBy ?? "admin"}`}
                </div>
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-2 text-right">{Number(r.totalRecordsChecked).toLocaleString("en-GB")}</td>
              <td className="px-3 py-2 text-right">
                {Number(r.mismatchesFound).toLocaleString("en-GB")}
                <span className="text-ink-3"> · {Number(r.mismatchesResolved).toLocaleString("en-GB")} resolved</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 pr-4 text-ink-2 sm:pr-5">{formatDateTime(r.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
