"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { authenticatedFetch, readAuthenticatedJson } from "../../../lib/authenticated-fetch";
import {
  Button,
  DetailList,
  ErrorState,
  Field,
  InlineAlert,
  Money,
  PageHeading,
  Panel,
  Skeleton,
  StatusBadge,
  UpdatedAgo,
  fieldClass,
  formatAmount,
  formatDateTime,
  statusLabel,
  useToast,
} from "../../components/ui";
import { DataTable } from "../../dashboard/data-table";
import { ConfirmActionDrawer, humanize } from "./admin-shared";

type Entry = {
  accountStatus?: string;
  id: number;
  reference: string | null;
  name: string;
  kind: string;
  status: string;
  amount: number | null;
  currency: string | null;
  accountId: number;
  agentId: number | null;
  detail: string | null;
  createdAt: string | null;
};
type Row = Entry & Record<string, unknown>;

export type OperationsKind = "customers" | "merchants" | "agents" | "deposits" | "withdrawals" | "collections" | "identity";

const titles: Record<OperationsKind, { title: string; description: string }> = {
  customers: { title: "Customers", description: "Customer accounts and their access status." },
  merchants: { title: "Merchants", description: "Business applications and approved merchants." },
  agents: { title: "Agents", description: "Cash agents and their accounts." },
  deposits: { title: "Cash-in", description: "Agent cash-ins and provider deposits." },
  withdrawals: { title: "Cash-out", description: "Agent cash-outs and provider payouts." },
  collections: { title: "Collections", description: "Merchant QR and payment-link collections." },
  identity: { title: "Identity", description: "Identity verification results from Sentinel." },
};

const POLL_MS = 30000;

export function OperationsWorkspace({ kind }: { kind: OperationsKind }) {
  const router = useRouter();
  const pathname = usePathname();
  const record = pathname.split("/")[3];
  const creating = record === "new";
  const detailScreen = Boolean(record) && !creating;
  const back = useCallback(() => router.push(`/dashboard/${kind}`), [router, kind]);

  if (creating && kind === "agents") return <CreateAgent onDone={back} />;
  if (detailScreen) return <OperationDetail kind={kind} id={record} onBack={back} />;
  return <OperationsList kind={kind} />;
}

function OperationsList({ kind }: { kind: OperationsKind }) {
  const router = useRouter();
  const [rows, setRows] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("All");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const generation = useRef(0);
  const statusId = useId();

  const load = useCallback(async () => {
    const request = ++generation.current;
    setBusy(true);
    setError(null);
    try {
      const result = await readAuthenticatedJson<{ content: Entry[]; totalPages: number }>(
        await authenticatedFetch(`/api/v1/admin/operations/${kind}?page=${page}`),
      );
      if (request !== generation.current) return;
      setRows(result.content);
      setPages(result.totalPages);
      setLoaded(true);
      setLoadedAt(Date.now());
    } catch (e) {
      if (request === generation.current) setError(e instanceof Error ? e.message : "Could not load operations.");
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }, [kind, page]);

  // Refresh every 30s while the tab is visible; "Updated Xs ago" shows freshness.
  useEffect(() => {
    let active = true;
    void load();
    const timer = window.setInterval(() => {
      if (active && document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      active = false;
      generation.current++;
      window.clearInterval(timer);
    };
  }, [load]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))], [rows]);
  const visible = useMemo(() => (status === "All" ? rows : rows.filter((r) => r.status === status)) as Row[], [rows, status]);
  const hasMoney = kind === "deposits" || kind === "withdrawals" || kind === "collections";
  const meta = titles[kind];

  return (
    <div className="space-y-5">
      <PageHeading
        title={meta.title}
        description={meta.description}
        action={
          <>
            <UpdatedAgo at={loadedAt} />
            {kind === "agents" ? (
              <Button icon="plus" onClick={() => router.push("/dashboard/agents/new")}>
                Create agent
              </Button>
            ) : null}
          </>
        }
      />

      {statuses.length > 1 ? (
        <div className="flex items-center gap-2">
          <label htmlFor={statusId} className="text-sm text-ink-2">
            Status
          </label>
          <select id={statusId} className={`${fieldClass} h-9 w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <DataTable<Row>
        title={meta.title}
        subtitle={loaded ? `Page ${page + 1} of ${Math.max(1, pages)} · search and filters apply to this page` : undefined}
        exportFilename={`sutura-admin-${kind}`}
        searchPlaceholder="Search name, reference or account"
        rows={visible}
        rowKey={(r) => String(r.id)}
        loading={busy && !loaded}
        error={error}
        onRefresh={() => void load()}
        refreshing={busy && loaded}
        onRowClick={(r) => router.push(`/dashboard/${kind}/${r.id}`)}
        rowLabel={(r) => `Open ${r.name}`}
        emptyTitle={status !== "All" ? "No records with this status" : `No ${meta.title.toLowerCase()} yet`}
        columns={[
          {
            key: "name",
            label: kind === "merchants" ? "Business" : "Account",
            sortValue: (r) => r.name,
            searchValue: (r) => `${r.name} ${r.accountId} ${r.agentId ?? ""}`,
            render: (r) => (
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{r.name}</div>
                <div className="text-xs text-ink-3">Account #{r.accountId}</div>
              </div>
            ),
          },
          {
            key: "reference",
            label: "Reference",
            render: (r) => (r.reference ? <span className="font-mono text-xs text-ink-2">{r.reference}</span> : "—"),
          },
          { key: "status", label: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
          ...(hasMoney
            ? [
                {
                  key: "amount",
                  label: "Amount",
                  align: "right" as const,
                  sortValue: (r: Row) => Number(r.amount ?? 0),
                  render: (r: Row) => (r.amount === null ? "—" : <Money amount={r.amount} currency={r.currency ?? undefined} />),
                  exportValue: (r: Row) => (r.amount === null ? "" : formatAmount(r.amount, r.currency ?? undefined)),
                },
                {
                  key: "agentId",
                  label: "Agent",
                  hideOnMobile: true,
                  render: (r: Row) => (r.agentId ? `#${r.agentId}` : "—"),
                },
              ]
            : [
                {
                  key: "detail",
                  label: "Details",
                  hideOnMobile: true,
                  render: (r: Row) => <span className="line-clamp-1 max-w-xs text-ink-2">{r.detail || "—"}</span>,
                },
              ]),
          {
            key: "createdAt",
            label: "Created",
            hideOnMobile: true,
            sortValue: (r) => r.createdAt ?? "",
            render: (r) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(r.createdAt)}</span>,
            exportValue: (r) => formatDateTime(r.createdAt),
          },
        ]}
      />

      {loaded && pages > 1 ? (
        <nav aria-label={`${meta.title} pages`} className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" icon="chevron-left" disabled={page === 0 || busy} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-ink-2 tabular-nums">
            Page {page + 1} of {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={busy || page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

function OperationDetail({ kind, id, onBack }: { kind: OperationsKind; id: string; onBack: () => void }) {
  const [selected, setSelected] = useState<Entry | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [decision, setDecision] = useState<"APPROVED" | "MORE_INFO_REQUIRED" | "REJECTED" | null>(null);
  const [accountChange, setAccountChange] = useState(false);
  const hasAccount = ["customers", "agents", "merchants"].includes(kind);

  useEffect(() => {
    let active = true;
    async function read() {
      setLoading(true);
      setError(null);
      try {
        const value = await readAuthenticatedJson<Entry>(await authenticatedFetch(`/api/v1/admin/operations/records/${kind}/${id}`));
        if (!active) return;
        setSelected(value);
        if (hasAccount) {
          const account = await readAuthenticatedJson<{ status: string }>(await authenticatedFetch(`/api/v1/admin/accounts/${value.accountId}`));
          if (active) setAccountStatus(account.status);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load record.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void read();
    return () => {
      active = false;
    };
  }, [kind, id, hasAccount, attempt]);

  const meta = titles[kind];
  const reviewable = kind === "merchants" && selected && ["PENDING_REVIEW", "MORE_INFO_REQUIRED"].includes(selected.status);
  const canChangeAccount = hasAccount && accountStatus !== null && ["ACTIVE", "SUSPENDED"].includes(accountStatus);
  const suspending = accountStatus === "ACTIVE";

  const decisionCopy = {
    APPROVED: { label: "Approve business", impact: "The merchant can collect payments once approved. Approval requires verified identity.", destructive: false },
    MORE_INFO_REQUIRED: { label: "Request more information", impact: "The applicant is asked for more information and the application stays open.", destructive: false },
    REJECTED: { label: "Reject application", impact: "The application is closed. The applicant can't collect payments.", destructive: true },
  } as const;

  return (
    <div className="space-y-5">
      <PageHeading
        title={selected ? selected.name : `${meta.title} record`}
        description={selected ? `${humanize(selected.kind)} · account #${selected.accountId}` : undefined}
        action={
          <Button variant="secondary" icon="chevron-left" onClick={onBack}>
            Back to {meta.title.toLowerCase()}
          </Button>
        }
      />

      {error && !selected ? (
        <Panel>
          <ErrorState title="Couldn't load this record" error={error} onRetry={() => setAttempt((a) => a + 1)} retrying={loading} />
        </Panel>
      ) : !selected ? (
        <Panel>
          <div role="status" aria-label="Loading record" className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel title="Details">
            <DetailList
              items={[
                { label: "Status", value: <StatusBadge status={selected.status} /> },
                ...(selected.amount !== null
                  ? [{ label: "Amount", value: <Money amount={selected.amount} currency={selected.currency ?? undefined} />, emphasis: true }]
                  : []),
                { label: "Reference", value: selected.reference ? <span className="font-mono text-xs">{selected.reference}</span> : "—" },
                { label: "Account", value: `#${selected.accountId}` },
                { label: "Agent", value: selected.agentId ? `#${selected.agentId}` : "—" },
                { label: "Type", value: humanize(selected.kind) },
                { label: "Details", value: <span className="break-words">{selected.detail || "—"}</span> },
                { label: "Created", value: formatDateTime(selected.createdAt) },
              ]}
            />
          </Panel>

          <div className="space-y-5">
            {reviewable ? (
              <Panel title="Application review" description="Decisions are recorded in the audit trail.">
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setDecision("APPROVED")}>Approve business</Button>
                  <Button variant="secondary" onClick={() => setDecision("MORE_INFO_REQUIRED")}>
                    Request more information
                  </Button>
                  <Button variant="secondary" className="text-status-failed-fg" onClick={() => setDecision("REJECTED")}>
                    Reject application
                  </Button>
                </div>
              </Panel>
            ) : null}

            {canChangeAccount ? (
              <Panel title="Account access">
                <div className="mb-3 flex items-center gap-2 text-sm text-ink-2">
                  Account status <StatusBadge status={accountStatus} />
                </div>
                <Button variant={suspending ? "danger" : "secondary"} icon={suspending ? "lock" : "unlock"} onClick={() => setAccountChange(true)}>
                  {suspending ? "Suspend account" : "Restore account"}
                </Button>
              </Panel>
            ) : null}
          </div>
        </div>
      )}

      {decision && selected ? (
        <ConfirmActionDrawer
          open
          onClose={() => setDecision(null)}
          title={decisionCopy[decision].label}
          subtitle={selected.name}
          impact={decisionCopy[decision].impact}
          destructive={decisionCopy[decision].destructive}
          reasonLabel="Explain your decision"
          reasonHint="The reason is stored with the decision in the audit trail."
          confirmLabel={decisionCopy[decision].label}
          busyLabel="Saving decision"
          successMessage={`Decision saved for ${selected.name}.`}
          onConfirm={async (reason) => {
            await readAuthenticatedJson(
              await authenticatedFetch(`/api/v1/admin/operations/merchants/${selected.id}/decision`, {
                method: "POST",
                body: JSON.stringify({ decision, reason }),
              }),
            );
            onBack();
          }}
        />
      ) : null}

      {selected ? (
        <ConfirmActionDrawer
          open={accountChange}
          onClose={() => setAccountChange(false)}
          title={suspending ? `Suspend ${selected.name}` : `Restore ${selected.name}`}
          subtitle={`Account #${selected.accountId}`}
          impact={
            suspending
              ? "Suspension blocks sign-in and API access and revokes refresh sessions. Balances are not touched."
              : "The account can sign in again. Refresh sessions revoked during the suspension stay revoked."
          }
          destructive={suspending}
          confirmLabel={suspending ? "Suspend account" : "Restore account"}
          busyLabel="Saving"
          successMessage={suspending ? "Account suspended." : "Account restored."}
          onConfirm={async (reason) => {
            const next = suspending ? "SUSPENDED" : "ACTIVE";
            await readAuthenticatedJson(
              await authenticatedFetch(`/api/v1/admin/accounts/${selected.accountId}/status`, {
                method: "POST",
                body: JSON.stringify({ status: next, reason }),
              }),
            );
            setAccountStatus(next);
          }}
        />
      ) : null}
    </div>
  );
}

const agentFields = [
  { key: "firstName", label: "First name", type: "text", autoComplete: "off", max: 100 },
  { key: "lastName", label: "Last name", type: "text", autoComplete: "off", max: 100 },
  { key: "phoneNumber", label: "Phone number", type: "tel", autoComplete: "off", max: 16, pattern: "\\+[1-9][0-9]{7,14}", placeholder: "+2207000000", hint: "International format, starting with +" },
  { key: "email", label: "Email", type: "email", autoComplete: "off", max: 254 },
  { key: "password", label: "Initial password", type: "password", autoComplete: "new-password", max: 72, min: 12, hint: "At least 12 characters. Give it to the agent directly." },
  { key: "reason", label: "Why are you creating this agent?", type: "text", autoComplete: "off", max: 1000 },
] as const;

type AgentForm = Record<(typeof agentFields)[number]["key"], string>;

function CreateAgent({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const baseId = useId();
  const [agent, setAgent] = useState<AgentForm>({ firstName: "", lastName: "", phoneNumber: "", email: "", password: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await readAuthenticatedJson(await authenticatedFetch("/api/v1/admin/accounts/agents", { method: "POST", body: JSON.stringify(agent) }));
      toast(`Agent account created for ${agent.firstName} ${agent.lastName}.`, "success");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agent.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="Create agent"
        description="Give the sign-in details to the agent yourself. Sutura doesn't send them automatically."
        action={
          <Button variant="secondary" icon="chevron-left" onClick={onDone} disabled={saving}>
            Back to agents
          </Button>
        }
      />
      <Panel className="max-w-2xl">
        <form onSubmit={createAgent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {agentFields.map((f) => {
              const id = `${baseId}-${f.key}`;
              return (
                <div key={f.key} className={f.key === "reason" || f.key === "email" ? "sm:col-span-2" : ""}>
                  <Field label={f.label} htmlFor={id} hint={"hint" in f ? f.hint : undefined}>
                    <input
                      id={id}
                      required
                      disabled={saving}
                      className={fieldClass}
                      type={f.type}
                      autoComplete={f.autoComplete}
                      maxLength={f.max}
                      minLength={"min" in f ? f.min : undefined}
                      pattern={"pattern" in f ? f.pattern : undefined}
                      placeholder={"placeholder" in f ? f.placeholder : undefined}
                      value={agent[f.key]}
                      onChange={(e) => setAgent((a) => ({ ...a, [f.key]: e.target.value }))}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
          {error ? <InlineAlert tone="error" title="The agent wasn't created">{error}</InlineAlert> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" busy={saving} busyLabel="Creating account">
              Create agent account
            </Button>
            <Button variant="secondary" onClick={onDone} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
