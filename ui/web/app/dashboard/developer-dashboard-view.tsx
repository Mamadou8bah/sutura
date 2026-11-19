"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell, formatTimestamp } from "./dashboard-shell";
import { KpiCard } from "./dashboard-toolbar";
import { DataTable, type DataColumn } from "./data-table";
import { developerTabs } from "./dashboard-tabs";
import { integrationSnippet } from "../../lib/mock/developer-dashboard";
import { developerApi, type ApiKeyInfo } from "../../lib/developer-api";
import { API_BASE } from "../../lib/api-base";
import {
  Button,
  CopyButton,
  DetailList,
  Drawer,
  Field,
  fieldClass,
  InlineAlert,
  Money,
  PageHeading,
  Panel,
  StatusBadge,
  statusTone,
  useApiResource,
  useToast,
  useViewParam,
} from "../components/ui";

const VIEWS = ["overview", "keys", "payments", "webhooks"] as const;
type View = (typeof VIEWS)[number];
type Row = Record<string, unknown>;
type Payment = { id: number; reference: string; amount: number; currency: string; status: string; createdAt: string };

function apiHost() {
  try {
    return new URL(API_BASE).host;
  } catch {
    return API_BASE;
  }
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative">
      <pre aria-label={label} className="overflow-x-auto rounded-row border border-line bg-surface-2 p-4 pr-24 font-mono text-xs leading-relaxed text-ink">
        {code}
      </pre>
      <CopyButton value={code} className="absolute right-2 top-2 bg-surface" />
    </div>
  );
}

function IntegrationSteps({ onCreateKey }: { onCreateKey: () => void }) {
  const steps = [
    { title: "Create an API key", body: "Send it in the X-Api-Key header from your server on every request." },
    { title: "Create a payment link", body: "Call the payment-links API from your backend and send your customer to the checkout URL." },
    { title: "Check the status", body: "Look up the reference from your server. Fulfil the order only when the status is Paid." },
  ];
  return (
    <Panel title="Accept payments in your app" description="Three steps from first key to first payment.">
      <ol className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="rounded-row border border-line p-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-sm font-semibold tabular-nums text-ink" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
            <p className="mt-1 text-sm text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button icon="key" onClick={onCreateKey}>
          Create API key
        </Button>
        <Link
          href="/docs"
          className="inline-flex h-10 items-center rounded-control border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-surface-2"
        >
          Read the docs
        </Link>
      </div>
    </Panel>
  );
}

export function DeveloperDashboardView() {
  const toast = useToast();
  const [view, setView] = useViewParam<View>(VIEWS, "overview");
  const keys = useApiResource(() => developerApi.listApiKeys());
  const payments = useApiResource<Payment[]>(() => developerApi.listPayments());

  const [createOpen, setCreateOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<{ name: string; key: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyInfo | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const keyRows = keys.data ?? [];
  const paymentRows = payments.data ?? [];
  const activeKeys = keyRows.filter((k) => !k.revoked).length;
  const postedPayments = paymentRows.filter((p) => statusTone(p.status) === "posted").length;

  function openCreate() {
    setView("keys");
    setCreateOpen(true);
  }

  const paymentColumns: DataColumn<Row>[] = useMemo(
    () => [
      { key: "reference", label: "Reference", render: (r) => <code className="font-mono text-xs">{String(r.reference)}</code> },
      { key: "id", label: "ID", hideOnMobile: true, render: (r) => <span className="text-ink-2">{String(r.id)}</span>, sortValue: (r) => Number(r.id) },
      { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} />, sortValue: (r) => String(r.status) },
      {
        key: "amount",
        label: "Amount",
        align: "right",
        sortValue: (r) => Number(r.amount),
        render: (r) => <Money amount={Number(r.amount)} currency={String(r.currency)} />,
        exportValue: (r) => `${String(r.currency)} ${Number(r.amount).toFixed(2)}`,
      },
      {
        key: "createdAt",
        label: "Created",
        align: "right",
        sortValue: (r) => new Date(String(r.createdAt)).getTime(),
        render: (r) => <span className="whitespace-nowrap text-ink-2">{formatTimestamp(String(r.createdAt))}</span>,
        exportValue: (r) => formatTimestamp(String(r.createdAt)),
      },
    ],
    [],
  );

  const paymentTableProps = {
    exportFilename: "sutura-developer-payments",
    dateKey: "createdAt" as const,
    rows: paymentRows as unknown as Row[],
    rowKey: (r: Row) => String(r.id),
    onRowClick: (r: Row) => setSelectedPayment(r as unknown as Payment),
    rowLabel: (r: Row) => `Open payment ${String(r.reference)}`,
    selectedKey: selectedPayment ? String(selectedPayment.id) : null,
    loading: payments.loading,
    error: payments.error,
    onRetry: () => void payments.reload(),
    onRefresh: () => void payments.reload(),
    refreshing: payments.refreshing,
    emptyTitle: "No payments yet",
    emptyDescription: "Payments created with your API keys appear here.",
    columns: paymentColumns,
  };

  return (
    <DashboardShell tabs={developerTabs} activeTab={view} onTabChange={(id) => setView(id as View)}>
      {view === "overview" && (
        <div className="space-y-5">
          <PageHeading
            title="Overview"
            description={
              <>
                API base <code className="font-mono text-xs text-ink">{apiHost()}</code>. Keys work only against this environment.
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Payments"
              value={payments.error ? "—" : String(paymentRows.length)}
              change={payments.error ? "Couldn't load" : "On your account"}
              loading={payments.loading}
              onClick={() => setView("payments")}
            />
            <KpiCard
              label="Posted"
              value={payments.error ? "—" : String(postedPayments)}
              change={payments.error ? "Couldn't load" : "Settled payments"}
              loading={payments.loading}
              onClick={() => setView("payments")}
            />
            <KpiCard
              label="Active API keys"
              value={keys.error ? "—" : String(activeKeys)}
              change={keys.error ? "Couldn't load" : `${keyRows.length} created`}
              loading={keys.loading}
              onClick={() => setView("keys")}
            />
          </div>
          <IntegrationSteps onCreateKey={openCreate} />
          <Panel title="Example request" description="Create a payment link from your server.">
            <CodeBlock code={integrationSnippet} label="Example request" />
          </Panel>
          <DataTable title="Recent payments" pageSize={5} {...paymentTableProps} />
        </div>
      )}

      {view === "keys" && (
        <div className="space-y-5">
          <PageHeading
            title="API keys"
            description={
              <>
                Server-side keys for <code className="font-mono text-xs text-ink">{apiHost()}</code>. A key&rsquo;s secret is shown once, when you create it.
              </>
            }
            action={
              <Button icon="plus" onClick={() => setCreateOpen(true)}>
                New API key
              </Button>
            }
          />

          {newSecret ? (
            <section aria-labelledby="new-key-heading" className="rounded-card border border-accent bg-accent-tint p-4 sm:p-5">
              <h2 id="new-key-heading" className="text-base font-semibold text-ink">
                Copy your new key now
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                &ldquo;{newSecret.name}&rdquo; won&rsquo;t be shown again. Store it in your server&rsquo;s secret manager and send it as the{" "}
                <code className="font-mono text-xs">X-Api-Key</code> header. Never put it in a mobile app or browser code.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-row border border-line bg-surface p-3">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{newSecret.key}</code>
                <CopyButton value={newSecret.key} label="Copy key" />
              </div>
              <Button variant="secondary" className="mt-3" onClick={() => setNewSecret(null)}>
                I&rsquo;ve stored it
              </Button>
            </section>
          ) : null}

          <DataTable
            title="API keys"
            exportFilename="sutura-api-keys"
            searchPlaceholder="Search keys"
            rows={keyRows as unknown as Row[]}
            rowKey={(r) => String(r.publicId)}
            loading={keys.loading}
            error={keys.error}
            onRetry={() => void keys.reload()}
            onRefresh={() => void keys.reload()}
            refreshing={keys.refreshing}
            emptyTitle="No API keys yet"
            emptyDescription="Create a key to call the Sutura API from your server."
            emptyAction={<Button icon="plus" onClick={() => setCreateOpen(true)}>New API key</Button>}
            columns={[
              { key: "name", label: "Name", sortValue: (r) => String(r.name), render: (r) => <span className="font-medium">{String(r.name)}</span> },
              {
                key: "publicId",
                label: "Public ID",
                render: (r) => <code className="font-mono text-xs">{String(r.publicId)}</code>,
              },
              {
                key: "revoked",
                label: "Status",
                render: (r) => <StatusBadge status={r.revoked ? "REVOKED" : "ACTIVE"} label={r.revoked ? "Revoked" : "Active"} />,
                exportValue: (r) => (r.revoked ? "Revoked" : "Active"),
                searchValue: (r) => (r.revoked ? "revoked" : "active"),
              },
              {
                key: "expiresAt",
                label: "Expires",
                align: "right",
                sortValue: (r) => new Date(String(r.expiresAt)).getTime(),
                render: (r) => <span className="whitespace-nowrap text-ink-2">{r.expiresAt ? formatTimestamp(String(r.expiresAt)) : "—"}</span>,
                exportValue: (r) => (r.expiresAt ? formatTimestamp(String(r.expiresAt)) : ""),
              },
              {
                key: "_actions",
                label: "Actions",
                align: "right",
                searchValue: () => "",
                exportValue: () => "",
                render: (r) =>
                  r.revoked ? null : (
                    <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(r as unknown as ApiKeyInfo)} aria-label={`Revoke ${String(r.name)}`}>
                      Revoke
                    </Button>
                  ),
              },
            ]}
          />

          <Panel title="How to authenticate" description="Server-side only.">
            <CodeBlock code={`X-Api-Key: <your server key>\nContent-Type: application/json`} label="Authentication headers" />
          </Panel>
        </div>
      )}

      {view === "payments" && (
        <div className="space-y-5">
          <PageHeading title="Payments" description="Transactions on the account that owns your API keys." />
          <DataTable title="Payments" searchPlaceholder="Search reference or status" pageSize={12} {...paymentTableProps} />
        </div>
      )}

      {view === "webhooks" && (
        <div className="space-y-5">
          <PageHeading title="Integration" description="Confirm payments from your own server." />
          <Panel title="Confirm a payment before fulfilling an order">
            <p className="max-w-2xl text-sm text-ink-2">
              Create a payment link for a wallet your integration account owns, then look up its reference after checkout. Fulfil the order only when the status is{" "}
              <StatusBadge status="PAID" />. <StatusBadge status="REVIEW" /> is still waiting for a compliance check, <StatusBadge status="FAILED" /> means no money moved, and{" "}
              <StatusBadge status="REFUNDED" /> records a reversal.
            </p>
            <div className="mt-4">
              <CodeBlock code={`GET /api/v1/payment-links/ref/<reference>\nX-Api-Key: <your server key>`} label="Status lookup request" />
            </div>
            <p className="mt-4 text-sm text-ink-2">
              Outbound webhooks to your server aren&rsquo;t available yet, so poll the status endpoint after checkout.
            </p>
            <Link href="/app/verification" className="mt-4 inline-flex text-sm font-medium text-accent-ink underline underline-offset-2">
              Verify the integration account owner
            </Link>
          </Panel>
        </div>
      )}

      <CreateKeyDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(name, key) => {
          setCreateOpen(false);
          if (key) setNewSecret({ name, key });
          toast(`API key "${name}" created`);
          void keys.reload();
        }}
      />
      <RevokeKeyDrawer
        target={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onRevoked={(name) => {
          setRevokeTarget(null);
          toast(`API key "${name}" revoked`);
          void keys.reload();
        }}
      />
      <Drawer
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title="Payment"
        subtitle={selectedPayment ? formatTimestamp(selectedPayment.createdAt) : undefined}
      >
        {selectedPayment ? (
          <div className="space-y-4">
            <p className="text-[40px] font-medium leading-[44px] tracking-[-0.02em]">
              <Money amount={selectedPayment.amount} currency={selectedPayment.currency} />
            </p>
            <StatusBadge status={selectedPayment.status} />
            <DetailList
              items={[
                {
                  label: "Reference",
                  value: (
                    <span className="inline-flex items-center gap-1">
                      <code className="break-all font-mono text-xs">{selectedPayment.reference}</code>
                      <CopyButton value={selectedPayment.reference} />
                    </span>
                  ),
                },
                { label: "Transaction ID", value: <code className="font-mono text-xs">{selectedPayment.id}</code> },
                { label: "Created", value: formatTimestamp(selectedPayment.createdAt) },
              ]}
            />
          </div>
        ) : null}
      </Drawer>
    </DashboardShell>
  );
}

function CreateKeyDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string, key: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Name the key after where it runs, for example Production backend.");
    setNameError(null);
    setBusy(true);
    setError(null);
    try {
      const created = await developerApi.createApiKey(trimmed, 365);
      setName("");
      onCreated(trimmed, created.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The key wasn't created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="New API key"
      subtitle="Valid for 365 days. The secret is shown once."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="create-key-form" busy={busy} busyLabel="Creating">
            Create key
          </Button>
        </>
      }
    >
      <form id="create-key-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Key name" htmlFor="key-name" error={nameError}>
          <input
            id="key-name"
            className={fieldClass}
            value={name}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
            placeholder="Production backend"
            aria-invalid={Boolean(nameError) || undefined}
          />
        </Field>
        {error ? <InlineAlert title="Key not created">{error}</InlineAlert> : null}
      </form>
    </Drawer>
  );
}

function RevokeKeyDrawer({
  target,
  onClose,
  onRevoked,
}: {
  target: ApiKeyInfo | null;
  onClose: () => void;
  onRevoked: (name: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      await developerApi.revokeApiKey(target.publicId);
      onRevoked(target.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The key wasn't revoked.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={Boolean(target)}
      onClose={() => {
        if (busy) return;
        setError(null);
        onClose();
      }}
      title="Revoke API key?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Keep key</Button>
          <Button variant="danger" onClick={revoke} busy={busy} busyLabel="Revoking">
            Revoke key
          </Button>
        </>
      }
    >
      {target ? (
        <div className="space-y-4">
          <DetailList
            items={[
              { label: "Name", value: target.name },
              { label: "Public ID", value: <code className="font-mono text-xs">{target.publicId}</code> },
              { label: "Expires", value: target.expiresAt ? formatTimestamp(target.expiresAt) : "—" },
            ]}
          />
          <InlineAlert tone="warning" title="This can't be undone">
            Every request that uses this key will be rejected straight away. Deploy a replacement key first if your server still needs access.
          </InlineAlert>
          {error ? <InlineAlert title="Key not revoked">{error}</InlineAlert> : null}
        </div>
      ) : null}
    </Drawer>
  );
}
