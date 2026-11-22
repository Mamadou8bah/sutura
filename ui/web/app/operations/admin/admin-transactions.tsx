"use client";

import { useMemo, useState } from "react";
import { adminApi, type AdminPayment } from "../../../lib/admin-api";
import {
  Button,
  CopyButton,
  DetailList,
  Drawer,
  InlineAlert,
  Money,
  PageHeading,
  Panel,
  StatusBadge,
  formatAmount,
  formatDateTime,
  statusLabel,
  useApiResource,
} from "../../components/ui";
import { DataTable } from "../../dashboard/data-table";
import { ConfirmActionDrawer, FilterChip, IdEntry, humanize, useAdminNav, useStatusFilter } from "./admin-shared";
import { PaymentRiskDetails, RiskDecision, RiskScore } from "./payment-risk-details";

type Row = AdminPayment & Record<string, unknown>;

const lookupTitles: Record<string, { title: string; label: string; type: "number" | "text" }> = {
  lookup: { title: "Find a payment by ID", label: "Payment ID", type: "number" },
  reference: { title: "Find a payment by reference", label: "Reference", type: "text" },
  search: { title: "Search payments", label: "ID, reference or amount", type: "text" },
};

export function AdminTransactions({ action }: { action?: string }) {
  const nav = useAdminNav();
  const [page, setPage] = useState(0);
  const payments = useApiResource(() => adminApi.listPayments(page), [page]);
  const [statusFilter, clearStatus] = useStatusFilter();
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [reverseId, setReverseId] = useState<number | null>(null);
  const [refund, setRefund] = useState(true);
  const [typed, setTyped] = useState("");
  const [lookupMiss, setLookupMiss] = useState<string | null>(null);

  const all = useMemo(() => payments.data?.content ?? [], [payments.data]);
  const rows = useMemo(
    () => (statusFilter ? all.filter((p) => p.status?.toUpperCase() === statusFilter.toUpperCase()) : all) as Row[],
    [all, statusFilter],
  );
  const totalPages = payments.data?.totalPages ?? 1;
  const target = reverseId !== null ? all.find((p) => p.id === reverseId) ?? null : null;
  const isTransfer = target ? (target.type ?? "").toUpperCase().includes("TRANSFER") : false;

  const lookup = action ? lookupTitles[action] : undefined;
  const reverseRoute = action === "reverse";

  function runLookup() {
    const q = typed.trim();
    setLookupMiss(null);
    if (!q) return;
    let found: AdminPayment | undefined;
    if (action === "lookup") found = all.find((p) => p.id === Number(q));
    else if (action === "reference") found = all.find((p) => p.reference === q);
    else found = all.find((p) => String(p.id) === q || p.reference?.includes(q) || String(p.amount).includes(q));
    if (found) setSelected(found);
    else setLookupMiss(q);
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="Payments"
        description="Payments and their latest risk decisions. Open a payment for failure reasons and model explanations."
        action={
          action ? (
            <Button variant="secondary" icon="chevron-left" onClick={() => nav("transactions")}>
              All payments
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => nav("transactions", "lookup")}>
                Find by ID
              </Button>
              <Button variant="secondary" onClick={() => nav("transactions", "reference")}>
                Find by reference
              </Button>
              <Button variant="secondary" onClick={() => nav("transactions", "reverse")}>
                Reverse by ID
              </Button>
            </>
          )
        }
      />

      {lookup ? (
        <Panel title={lookup.title} description={`Searches the ${all.length} payments loaded on this page.`}>
          <IdEntry label={lookup.label} type={lookup.type} value={typed} onChange={setTyped} submitLabel="Find" onSubmit={runLookup} />
          {lookupMiss ? (
            <div className="mt-3">
              <InlineAlert tone="info">
                No loaded payment matches “{lookupMiss}”. Older payments are on later pages of the list.
              </InlineAlert>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {reverseRoute ? (
        <Panel title="Reverse a payment by ID" description="You'll see the payment and its impact before anything is posted.">
          <IdEntry
            label="Payment ID"
            value={typed}
            onChange={setTyped}
            submitLabel="Review reversal"
            onSubmit={() => {
              const id = Number(typed);
              if (Number.isSafeInteger(id) && id > 0) setReverseId(id);
            }}
          />
        </Panel>
      ) : null}

      {statusFilter ? <FilterChip label={`Status: ${statusLabel(statusFilter)}`} onClear={clearStatus} /> : null}

      <DataTable<Row>
        title="Payments"
        subtitle={payments.data ? `Page ${page + 1} of ${Math.max(1, totalPages)} · 50 per page` : undefined}
        exportFilename="sutura-admin-payments"
        dateKey="createdAt"
        searchPlaceholder="Search ID, reference or amount"
        rows={rows}
        rowKey={(r) => String(r.id)}
        loading={payments.loading}
        error={payments.error}
        onRefresh={() => void payments.reload()}
        refreshing={payments.refreshing}
        onRowClick={(r) => setSelected(r)}
        rowLabel={(r) => `Open payment ${r.reference}`}
        selectedKey={selected ? String(selected.id) : null}
        emptyTitle={statusFilter ? "No payments with this status" : "No payments yet"}
        emptyDescription={statusFilter ? "Clear the filter to see every payment on this page." : undefined}
        columns={[
          {
            key: "reference",
            label: "Reference",
            sortValue: (r) => r.id,
            render: (r) => (
              <div className="min-w-0">
                <div className="font-mono text-xs text-ink">{r.reference}</div>
                <div className="text-xs text-ink-3">#{r.id}</div>
              </div>
            ),
          },
          { key: "type", label: "Type", hideOnMobile: true, render: (r) => humanize(r.type), exportValue: (r) => humanize(r.type) },
          {
            key: "route",
            label: "From → to",
            hideOnMobile: true,
            searchValue: (r) => `${r.sourceWalletId ?? ""} ${r.destinationWalletId ?? ""}`,
            render: (r) => (
              <span className="tabular-nums text-ink-2">
                {r.sourceWalletId ? `#${r.sourceWalletId}` : "External"} → {r.destinationWalletId ? `#${r.destinationWalletId}` : "External"}
              </span>
            ),
            exportValue: (r) => `${r.sourceWalletId ?? "external"} -> ${r.destinationWalletId ?? "external"}`,
          },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            sortValue: (r) => Number(r.amount),
            render: (r) => <Money amount={r.amount} currency={r.currency} />,
            exportValue: (r) => formatAmount(r.amount, r.currency),
          },
          { key: "status", label: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
          { key: "riskScore", label: "Risk score", align: "right", sortValue: r => r.fraud?.score ?? -1, searchValue: r => r.fraud?.score == null ? "Not scored" : String(r.fraud.score * 100),
            render: r => <RiskScore score={r.fraud?.score} />, exportValue: r => r.fraud?.score == null ? "Not scored" : String(r.fraud.score * 100) },
          { key: "riskDecision", label: "Risk decision", searchValue: r => r.fraud?.decision ?? "Not assessed", render: r => <RiskDecision decision={r.fraud?.decision} />, exportValue: r => r.fraud?.decision ?? "Not assessed" },
          {
            key: "createdAt",
            label: "Created",
            sortValue: (r) => r.createdAt ?? "",
            hideOnMobile: true,
            render: (r) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(r.createdAt)}</span>,
            exportValue: (r) => formatDateTime(r.createdAt),
          },
        ]}
      />

      {payments.data && totalPages > 1 ? (
        <nav aria-label="Payment pages" className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" icon="chevron-left" disabled={page === 0 || payments.refreshing} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-sm text-ink-2 tabular-nums">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages || payments.refreshing} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </nav>
      ) : null}

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Payment #${selected.id}` : ""}
        subtitle={selected ? humanize(selected.type) : undefined}
        footer={
          selected && selected.status?.toUpperCase() === "COMPLETED" ? (
            <Button
              variant="danger"
              icon="undo"
              onClick={() => {
                setReverseId(selected.id);
                setSelected(null);
              }}
            >
              Reverse payment
            </Button>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <code className="font-mono text-xs text-ink-2">{selected.reference}</code>
              <CopyButton value={selected.reference} />
            </div>
            <DetailList
              items={[
                { label: "Amount", value: <Money amount={selected.amount} currency={selected.currency} />, emphasis: true },
                { label: "From wallet", value: selected.sourceWalletId ? `#${selected.sourceWalletId}` : "External (provider or cash)" },
                { label: "To wallet", value: selected.destinationWalletId ? `#${selected.destinationWalletId}` : "External (provider or cash)" },
                { label: "Description", value: selected.description || "—" },
                { label: "Created", value: formatDateTime(selected.createdAt) },
              ]}
            />
            <PaymentRiskDetails key={selected.id} payment={selected} />
          </div>
        ) : null}
      </Drawer>

      <ConfirmActionDrawer
        open={reverseId !== null}
        onClose={() => {
          setReverseId(null);
          setRefund(true);
        }}
        title={`Reverse payment #${reverseId ?? ""}`}
        subtitle={target ? target.reference : "This payment isn't on the loaded page. Check the ID before confirming."}
        context={
          target ? (
            <DetailList
              items={[
                { label: "Amount", value: <Money amount={target.amount} currency={target.currency} />, emphasis: true },
                { label: "Type", value: humanize(target.type) },
                { label: "Status", value: <StatusBadge status={target.status} /> },
                {
                  label: "Route",
                  value: `${target.sourceWalletId ? `#${target.sourceWalletId}` : "External"} → ${target.destinationWalletId ? `#${target.destinationWalletId}` : "External"}`,
                },
              ]}
            />
          ) : null
        }
        extra={
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" />
            <span>
              Return the money to the sender
              <span className="block text-xs text-ink-2">Applies to wallet-to-wallet transfers. Other payment types are only marked reversed.</span>
            </span>
          </label>
        }
        impact={
          target && isTransfer && refund ? (
            <>
              This posts a reversing ledger entry: {formatAmount(target.amount, target.currency)} moves back from wallet #
              {target.destinationWalletId} to wallet #{target.sourceWalletId}. It can't be undone from here.
            </>
          ) : (
            <>This marks the payment as reversed without moving money on the ledger. It can&apos;t be undone from here.</>
          )
        }
        destructive
        confirmLabel="Reverse payment"
        busyLabel="Reversing"
        successMessage={`Payment #${reverseId ?? ""} reversed.`}
        onConfirm={async (reason) => {
          if (reverseId === null) return;
          await adminApi.reverseTransaction(reverseId, reason, refund);
          setTyped("");
          await payments.reload();
        }}
      />
    </div>
  );
}
