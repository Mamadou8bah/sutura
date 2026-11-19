"use client";

import { useMemo, useState } from "react";
import { adminApi, type AuditLogEntry } from "../../../lib/admin-api";
import { Button, DetailList, Drawer, PageHeading, StatusBadge, formatDateTime, useApiResource } from "../../components/ui";
import { DataTable } from "../../dashboard/data-table";
import { FilterChip, humanize, useStatusFilter } from "./admin-shared";

type Row = AuditLogEntry & Record<string, unknown>;

export function AdminAudit() {
  const [page, setPage] = useState(0);
  const audit = useApiResource(() => adminApi.getAuditTrail(page, 50), [page]);
  const [statusFilter, clearStatus] = useStatusFilter();
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const totalPages = audit.data?.totalPages ?? 1;

  const rows = useMemo(() => {
    const all = audit.data?.content ?? [];
    return (statusFilter?.toUpperCase() === "FAILED" ? all.filter((e) => !e.success) : all) as Row[];
  }, [audit.data, statusFilter]);

  return (
    <div className="space-y-5">
      <PageHeading title="Audit trail" description="Every admin action with who did it, to what, and why." />
      {statusFilter?.toUpperCase() === "FAILED" ? <FilterChip label="Failed actions" onClear={clearStatus} /> : null}
      <DataTable<Row>
        title="Admin actions"
        subtitle={audit.data ? `${audit.data.totalElements.toLocaleString("en-GB")} entries · page ${page + 1} of ${Math.max(1, totalPages)}` : undefined}
        exportFilename="sutura-audit-trail"
        searchPlaceholder="Search action, actor or record"
        dateKey="timestamp"
        rows={rows}
        rowKey={(r) => String(r.id)}
        loading={audit.loading}
        error={audit.error}
        onRefresh={() => void audit.reload()}
        refreshing={audit.refreshing}
        onRowClick={(r) => setSelected(r)}
        rowLabel={(r) => `Open audit entry ${r.id}`}
        selectedKey={selected ? String(selected.id) : null}
        emptyTitle={statusFilter ? "No failed actions on this page" : "No admin actions yet"}
        pageSize={12}
        columns={[
          {
            key: "actionType",
            label: "Action",
            sortValue: (r) => r.actionType,
            render: (r) => <span className="font-medium text-ink">{humanize(r.actionType)}</span>,
            exportValue: (r) => r.actionType,
          },
          {
            key: "entity",
            label: "Record",
            searchValue: (r) => `${r.entityType} ${r.entityId}`,
            render: (r) => `${humanize(r.entityType)} #${r.entityId}`,
            exportValue: (r) => `${r.entityType} #${r.entityId}`,
          },
          { key: "actorEmail", label: "By", hideOnMobile: true },
          {
            key: "changeDescription",
            label: "Reason",
            hideOnMobile: true,
            render: (r) => <span className="line-clamp-1 max-w-xs text-ink-2">{r.changeDescription || "—"}</span>,
          },
          {
            key: "success",
            label: "Result",
            render: (r) => <StatusBadge tone={r.success ? "posted" : "failed"} label={r.success ? "Done" : "Failed"} />,
            exportValue: (r) => (r.success ? "Done" : "Failed"),
          },
          {
            key: "timestamp",
            label: "When",
            sortValue: (r) => r.timestamp,
            render: (r) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(r.timestamp)}</span>,
            exportValue: (r) => formatDateTime(r.timestamp),
          },
        ]}
      />
      {audit.data && totalPages > 1 ? (
        <nav aria-label="Audit pages" className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" icon="chevron-left" disabled={page === 0 || audit.refreshing} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-sm text-ink-2 tabular-nums">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages || audit.refreshing} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </nav>
      ) : null}

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected ? humanize(selected.actionType) : ""} subtitle={selected ? formatDateTime(selected.timestamp) : undefined}>
        {selected ? (
          <DetailList
            items={[
              { label: "Result", value: <StatusBadge tone={selected.success ? "posted" : "failed"} label={selected.success ? "Done" : "Failed"} /> },
              { label: "Record", value: `${humanize(selected.entityType)} #${selected.entityId}` },
              { label: "By", value: `${selected.actorEmail} (#${selected.actorId})` },
              { label: "Reason / change", value: <span className="whitespace-pre-wrap text-left">{selected.changeDescription || "—"}</span> },
              { label: "Action code", value: <code className="font-mono text-xs">{selected.actionType}</code> },
            ]}
          />
        ) : null}
      </Drawer>
    </div>
  );
}
