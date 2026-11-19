"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, formatTimestamp } from "./dashboard-shell";
import { BarChart } from "./dashboard-charts";
import { KpiCard } from "./dashboard-toolbar";
import { DataTable, type DataColumn } from "./data-table";
import { merchantTabs } from "./dashboard-tabs";
import { AgentQrPreview } from "./agent-qr-preview";
import { buildAgentQrPayload, type AgentQrPayload } from "../../lib/agent-qr";
import { getMerchantSession } from "../../lib/merchant-api";
import {
  loadMerchantDashboardFromApi,
  resolveMerchantStoreName,
  type MerchantPaymentLink,
  type MerchantTransaction,
  type MerchantWallet,
} from "../../lib/merchant-dashboard-loader";
import { walletApi } from "../../lib/wallet-api";
import {
  Button,
  CopyButton,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  fieldClass,
  InlineAlert,
  Money,
  PageHeading,
  Panel,
  Skeleton,
  StatusBadge,
  statusTone,
  UpdatedAgo,
  useApiResource,
  useIdempotencyKey,
  useToast,
  useViewParam,
} from "../components/ui";

const VIEWS = ["overview", "wallets", "money", "payments", "links", "subscriptions", "webhooks"] as const;
type View = (typeof VIEWS)[number];
type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Positive amount with up to two decimals, or null. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

function totalsByCurrency<T>(items: T[], currency: (t: T) => string, amount: (t: T) => number) {
  const map = new Map<string, number>();
  for (const item of items) map.set(currency(item), (map.get(currency(item)) ?? 0) + amount(item));
  return [...map.entries()].map(([cur, total]) => ({ currency: cur, total }));
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const kindLabel: Record<MerchantTransaction["kind"], string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  other: "Payment",
};

const RECOVERY = "Check Payments before trying again. Pressing Confirm again resends the same request, so it can't be charged twice.";

/* ------------------------------------------------------------------ */
/* View                                                                 */
/* ------------------------------------------------------------------ */

export function MerchantDashboardView() {
  const toast = useToast();
  const [view, setView] = useViewParam<View>(VIEWS, "overview");
  const resource = useApiResource(loadMerchantDashboardFromApi);
  const { data, error, loading, refreshing, reload, loadedAt } = resource;

  const [isPendingReview, setIsPendingReview] = useState(false);
  const [moneyFilter, setMoneyFilter] = useState<"all" | "deposit" | "withdrawal" | "transfer" | "pending">("all");
  const [selectedTxn, setSelectedTxn] = useState<MerchantTransaction | null>(null);
  const [selectedLink, setSelectedLink] = useState<MerchantPaymentLink | null>(null);
  const [flow, setFlow] = useState<null | "transfer" | "deposit" | "withdrawal" | "link" | "wallet">(null);

  useEffect(() => {
    setIsPendingReview(getMerchantSession()?.userStatus === "PENDING_REVIEW");
  }, []);

  const wallets = data?.wallets ?? [];
  const transactions = data?.transactions ?? [];
  const links = data?.paymentLinks ?? [];
  const storeName = data?.storeName ?? resolveMerchantStoreName();
  const primaryWallet = useMemo(() => wallets.find((w) => w.status === "ACTIVE") ?? wallets[0], [wallets]);

  const balances = useMemo(() => totalsByCurrency(wallets, (w) => w.currency, (w) => w.balance), [wallets]);
  const incoming = useMemo(() => transactions.filter((t) => t.incoming), [transactions]);
  const receivedToday = useMemo(
    () =>
      totalsByCurrency(
        incoming.filter((t) => statusTone(t.status) === "posted" && isToday(t.time)),
        (t) => t.currency,
        (t) => t.amount,
      ),
    [incoming],
  );
  const pendingOps = transactions.filter((t) => t.kind !== "other" && ["pending", "review"].includes(statusTone(t.status)));
  const activeLinks = links.filter((l) => l.status === "ACTIVE");

  // Last 7 days of posted incoming money, in the primary wallet's currency only.
  const chartCurrency = primaryWallet?.currency;
  const weekSeries = useMemo(() => {
    if (!chartCurrency) return [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const value = incoming
        .filter((t) => t.currency === chartCurrency && statusTone(t.status) === "posted")
        .filter((t) => {
          const at = new Date(t.time).getTime();
          return at >= d.getTime() && at < next.getTime();
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return { label: d.toLocaleDateString("en-GB", { weekday: "short" }), value: Math.round(value) };
    });
  }, [incoming, chartCurrency]);
  const hasWeekData = weekSeries.some((p) => p.value > 0);

  const moneyRows = useMemo(() => {
    const ops = transactions.filter((t) => t.kind !== "other");
    if (moneyFilter === "all") return ops;
    if (moneyFilter === "pending") return ops.filter((t) => ["pending", "review"].includes(statusTone(t.status)));
    return ops.filter((t) => t.kind === moneyFilter);
  }, [transactions, moneyFilter]);

  const txnColumns: DataColumn<Row>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (r) => <code className="font-mono text-xs">{String(r.reference)}</code>,
    },
    {
      key: "description",
      label: "Description",
      hideOnMobile: true,
      render: (r) => <span className="text-ink-2">{String(r.description) || kindLabel[r.kind as MerchantTransaction["kind"]]}</span>,
    },
    {
      key: "kind",
      label: "Type",
      hideOnMobile: true,
      render: (r) => kindLabel[r.kind as MerchantTransaction["kind"]],
      exportValue: (r) => kindLabel[r.kind as MerchantTransaction["kind"]],
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={String(r.status)} />,
      sortValue: (r) => String(r.status),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      sortValue: (r) => Number(r.amount),
      render: (r) => <Money amount={Number(r.amount)} currency={String(r.currency)} sign={r.incoming ? "+" : ""} />,
      exportValue: (r) => `${String(r.currency)} ${Number(r.amount).toFixed(2)}`,
    },
    {
      key: "time",
      label: "Time",
      align: "right",
      sortValue: (r) => new Date(String(r.time)).getTime(),
      render: (r) => <span className="whitespace-nowrap text-ink-2">{formatTimestamp(String(r.time))}</span>,
      exportValue: (r) => formatTimestamp(String(r.time)),
    },
  ];

  const tableState = {
    loading,
    error,
    onRetry: () => void reload(),
    onRefresh: () => void reload(),
    refreshing,
  };

  const reviewBanner = isPendingReview ? (
    <div className="mb-5">
      <InlineAlert tone="warning" title="Application under review">
        Collections are off until Sutura approves your merchant account.{" "}
        <a href="/merchants/pending" className="font-semibold underline underline-offset-2">
          View status
        </a>
      </InlineAlert>
    </div>
  ) : null;

  const firstLoadFailed = !data && error;

  return (
    <DashboardShell tabs={merchantTabs} activeTab={view} onTabChange={(id) => setView(id as View)}>
      {reviewBanner}

      {view === "overview" && (
        <div className="space-y-5">
          <PageHeading
            title="Overview"
            description={
              <>
                {storeName} · <UpdatedAgo at={loadedAt} />
              </>
            }
            action={
              <>
                <Button variant="secondary" icon="refresh" onClick={() => void reload()} busy={refreshing} busyLabel="Refreshing">
                  Refresh
                </Button>
                <Button icon="link" onClick={() => setFlow("link")} disabled={!primaryWallet}>
                  New payment link
                </Button>
              </>
            }
          />

          {firstLoadFailed ? (
            <Panel>
              <ErrorState title="We couldn't load your dashboard" error={error} onRetry={() => void reload()} retrying={refreshing} />
            </Panel>
          ) : (
            <>
              {/* Did I get paid? */}
              <section aria-labelledby="paid-heading" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-card bg-charcoal-card p-5 text-[#f2f2f7] sm:p-6">
                  <h2 id="paid-heading" className="text-sm text-[#c7c7cc]">
                    Received today
                  </h2>
                  {loading && !data ? (
                    <span className="mt-2 block h-11 w-48 animate-pulse rounded-control bg-white/10" aria-hidden="true" />
                  ) : receivedToday.length === 0 ? (
                    <p className="mt-1 text-[40px] font-medium leading-[44px] tracking-[-0.02em] tabular-nums">
                      {primaryWallet ? <Money amount={0} currency={primaryWallet.currency} /> : "—"}
                    </p>
                  ) : (
                    receivedToday.map((t) => (
                      <p key={t.currency} className="mt-1 text-[40px] font-medium leading-[44px] tracking-[-0.02em]">
                        <Money amount={t.total} currency={t.currency} />
                      </p>
                    ))
                  )}
                  <p className="mt-2 text-sm text-[#c7c7cc]">Posted payments into your wallets since midnight.</p>
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-sm text-[#c7c7cc]">Wallet balance</p>
                    {loading && !data ? (
                      <span className="mt-1 block h-6 w-32 animate-pulse rounded bg-white/10" aria-hidden="true" />
                    ) : balances.length === 0 ? (
                      <p className="mt-1 text-sm">No wallets yet</p>
                    ) : (
                      <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                        {balances.map((b) => (
                          <li key={b.currency} className="text-lg font-medium">
                            <Money amount={b.total} currency={b.currency} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <Panel title="Latest money in" action={<Button variant="ghost" size="sm" onClick={() => setView("payments")}>See all</Button>}>
                  {loading && !data ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-8" />
                      ))}
                    </div>
                  ) : incoming.length === 0 ? (
                    <EmptyState title="No payments yet" icon="inbox" action={<Button variant="secondary" icon="link" onClick={() => setFlow("link")} disabled={!primaryWallet}>Create a payment link</Button>}>
                      Share a payment link or your QR code to start collecting.
                    </EmptyState>
                  ) : (
                    <ul className="divide-y divide-line">
                      {incoming.slice(0, 5).map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedTxn(t)}
                            className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-surface-2"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink">{t.description || kindLabel[t.kind]}</span>
                              <span className="block text-xs text-ink-3">{formatTimestamp(t.time)}</span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                              <Money amount={t.amount} currency={t.currency} sign="+" className="text-sm font-medium" />
                              <StatusBadge status={t.status} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </section>

              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Operations in progress"
                  value={String(pendingOps.length)}
                  change="Deposits, withdrawals and transfers not yet posted"
                  loading={loading && !data}
                  onClick={() => {
                    setMoneyFilter("pending");
                    setView("money");
                  }}
                />
                <KpiCard
                  label="Active payment links"
                  value={String(activeLinks.length)}
                  change={`${links.length} created in total`}
                  loading={loading && !data}
                  onClick={() => setView("links")}
                />
                <KpiCard
                  label="Transactions loaded"
                  value={String(transactions.length)}
                  change="Most recent 50"
                  loading={loading && !data}
                  onClick={() => setView("payments")}
                />
              </div>

              {data ? (
                <Panel
                  title="Money in, last 7 days"
                  description={chartCurrency ? `Posted payments in ${chartCurrency}` : undefined}
                >
                  {hasWeekData ? (
                    <BarChart data={weekSeries} height={200} label={`Money in per day, ${chartCurrency}`} />
                  ) : (
                    <p className="py-6 text-center text-sm text-ink-2">No posted payments in the last 7 days.</p>
                  )}
                </Panel>
              ) : null}
            </>
          )}

          <a href="/app/verification" className="inline-flex text-sm font-medium text-accent-ink underline underline-offset-2">
            Verify the owner&rsquo;s identity
          </a>
        </div>
      )}

      {view === "wallets" && (
        <div className="space-y-5">
          <PageHeading
            title="Wallets"
            description="Your collection wallets and their ledger balances."
            action={
              <Button icon="plus" onClick={() => setFlow("wallet")}>
                New wallet
              </Button>
            }
          />
          <DataTable
            title="Wallets"
            exportFilename="sutura-merchant-wallets"
            searchPlaceholder="Search name, ID or status"
            rows={wallets as unknown as Row[]}
            rowKey={(r) => String(r.id)}
            emptyTitle="No wallets yet"
            emptyDescription="Create a wallet to start collecting payments."
            emptyAction={<Button icon="plus" onClick={() => setFlow("wallet")}>New wallet</Button>}
            {...tableState}
            columns={[
              { key: "id", label: "ID", render: (r) => <code className="font-mono text-xs">#{String(r.id)}</code>, sortValue: (r) => Number(r.id) },
              { key: "name", label: "Name", sortValue: (r) => String(r.name) },
              { key: "currency", label: "Currency" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
              {
                key: "balance",
                label: "Balance",
                align: "right",
                sortValue: (r) => Number(r.balance),
                render: (r) => <Money amount={Number(r.balance)} currency={String(r.currency)} className="font-medium" />,
                exportValue: (r) => `${String(r.currency)} ${Number(r.balance).toFixed(2)}`,
              },
            ]}
          />
        </div>
      )}

      {view === "money" && (
        <div className="space-y-5">
          <PageHeading
            title="Move money"
            description={
              primaryWallet
                ? `Deposits and withdrawals use ${primaryWallet.name} (#${primaryWallet.id}). An agent scans the QR code to complete them.`
                : "Deposits, withdrawals and transfers between wallets."
            }
            action={
              <>
                <Button variant="secondary" icon="arrow-in" onClick={() => setFlow("deposit")} disabled={!primaryWallet}>
                  Deposit
                </Button>
                <Button variant="secondary" icon="arrow-out" onClick={() => setFlow("withdrawal")} disabled={!primaryWallet}>
                  Withdraw
                </Button>
                <Button icon="send" onClick={() => setFlow("transfer")} disabled={!primaryWallet}>
                  Transfer
                </Button>
              </>
            }
          />
          <div role="group" aria-label="Filter operations" className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["pending", "In progress"],
                ["deposit", "Deposits"],
                ["withdrawal", "Withdrawals"],
                ["transfer", "Transfers"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={moneyFilter === id}
                onClick={() => setMoneyFilter(id)}
                className={`h-8 rounded-full border px-3 text-sm transition-colors ${
                  moneyFilter === id ? "border-accent bg-accent-tint font-medium text-ink" : "border-line text-ink-2 hover:bg-surface-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <DataTable
            title="Money movements"
            exportFilename="sutura-merchant-money"
            dateKey="time"
            rows={moneyRows as unknown as Row[]}
            rowKey={(r) => String(r.id)}
            onRowClick={(r) => setSelectedTxn(r as unknown as MerchantTransaction)}
            rowLabel={(r) => `Open ${String(r.reference)}`}
            selectedKey={selectedTxn ? String(selectedTxn.id) : null}
            emptyTitle={moneyFilter === "all" ? "No deposits, withdrawals or transfers yet" : "Nothing in this filter"}
            {...tableState}
            columns={txnColumns}
          />
        </div>
      )}

      {view === "payments" && (
        <div className="space-y-5">
          <PageHeading title="Payments" description="Every transaction on your wallets, newest first." />
          <DataTable
            title="Payments"
            exportFilename="sutura-merchant-payments"
            searchPlaceholder="Search reference, description or status"
            dateKey="time"
            pageSize={12}
            rows={transactions as unknown as Row[]}
            rowKey={(r) => String(r.id)}
            onRowClick={(r) => setSelectedTxn(r as unknown as MerchantTransaction)}
            rowLabel={(r) => `Open ${String(r.reference)}`}
            selectedKey={selectedTxn ? String(selectedTxn.id) : null}
            emptyTitle="No payments yet"
            emptyDescription="Payments appear here once customers pay a link or send to your wallet."
            {...tableState}
            columns={txnColumns}
          />
        </div>
      )}

      {view === "links" && (
        <div className="space-y-5">
          <PageHeading
            title="Payment links"
            description="Checkout links customers pay from a Sutura wallet."
            action={
              <Button icon="plus" onClick={() => setFlow("link")} disabled={!primaryWallet}>
                New payment link
              </Button>
            }
          />
          <DataTable
            title="Payment links"
            exportFilename="sutura-merchant-payment-links"
            searchPlaceholder="Search title, reference or status"
            rows={links as unknown as Row[]}
            rowKey={(r) => String(r.id)}
            onRowClick={(r) => setSelectedLink(r as unknown as MerchantPaymentLink)}
            rowLabel={(r) => `Open link ${String(r.reference)}`}
            selectedKey={selectedLink ? String(selectedLink.id) : null}
            emptyTitle="No payment links yet"
            emptyDescription="Create a link for an invoice, an order or a fee."
            emptyAction={<Button icon="plus" onClick={() => setFlow("link")} disabled={!primaryWallet}>New payment link</Button>}
            {...tableState}
            columns={[
              { key: "reference", label: "Reference", render: (r) => <code className="font-mono text-xs">{String(r.reference)}</code> },
              { key: "title", label: "Title", sortValue: (r) => String(r.title) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
              {
                key: "expiresAt",
                label: "Expires",
                hideOnMobile: true,
                sortValue: (r) => new Date(String(r.expiresAt)).getTime(),
                render: (r) => <span className="text-ink-2">{r.expiresAt ? formatTimestamp(String(r.expiresAt)) : "—"}</span>,
              },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                sortValue: (r) => Number(r.amount),
                render: (r) => <Money amount={Number(r.amount)} currency={String(r.currency)} />,
                exportValue: (r) => `${String(r.currency)} ${Number(r.amount).toFixed(2)}`,
              },
            ]}
          />
        </div>
      )}

      {view === "subscriptions" && (
        <div className="space-y-5">
          <PageHeading title="Plans" description="Recurring billing for your customers." />
          <Panel>
            <EmptyState title="Plans aren't available yet" icon="list">
              Sutura doesn&rsquo;t offer recurring billing through the API yet. Use payment links for each billing period in the meantime.
            </EmptyState>
          </Panel>
        </div>
      )}

      {view === "webhooks" && (
        <div className="space-y-5">
          <PageHeading title="Webhooks" description="Payment status callbacks to your own server." />
          <Panel>
            <EmptyState title="Webhook delivery isn't available yet" icon="webhook">
              Merchant-configured webhooks aren&rsquo;t offered yet. Check a payment link&rsquo;s status in Payment links, or with the API, before you fulfil an order.
            </EmptyState>
          </Panel>
        </div>
      )}

      <TransactionDrawer txn={selectedTxn} wallets={wallets} onClose={() => setSelectedTxn(null)} />
      <LinkDrawer link={selectedLink} onClose={() => setSelectedLink(null)} />

      {primaryWallet ? (
        <>
          <TransferFlow
            open={flow === "transfer"}
            onClose={() => setFlow(null)}
            wallets={wallets}
            defaultWallet={primaryWallet}
            onDone={(ref) => {
              toast(`Transfer ${ref} submitted`);
              void reload();
            }}
          />
          <AgentCashFlow
            kind="deposit"
            open={flow === "deposit"}
            onClose={() => setFlow(null)}
            wallet={primaryWallet}
            storeName={storeName}
            onDone={(ref) => {
              toast(`Deposit ${ref} created. Show the QR code to an agent.`);
              void reload();
            }}
          />
          <AgentCashFlow
            kind="withdrawal"
            open={flow === "withdrawal"}
            onClose={() => setFlow(null)}
            wallet={primaryWallet}
            storeName={storeName}
            onDone={(ref) => {
              toast(`Withdrawal ${ref} created. Show the QR code to an agent.`);
              void reload();
            }}
          />
          <PaymentLinkFlow
            open={flow === "link"}
            onClose={() => setFlow(null)}
            wallets={wallets}
            defaultWallet={primaryWallet}
            onDone={(ref) => {
              toast(`Payment link ${ref} created`);
              void reload();
            }}
          />
        </>
      ) : null}
      <WalletFlow
        open={flow === "wallet"}
        onClose={() => setFlow(null)}
        onDone={(name) => {
          toast(`Wallet "${name}" created`);
          void reload();
        }}
      />
    </DashboardShell>
  );
}

/* ------------------------------------------------------------------ */
/* Detail drawers                                                       */
/* ------------------------------------------------------------------ */

function walletName(wallets: MerchantWallet[], id: number | null) {
  if (id === null) return "—";
  const w = wallets.find((x) => x.id === id);
  return w ? `${w.name} (#${w.id})` : `Wallet #${id}`;
}

function TransactionDrawer({ txn, wallets, onClose }: { txn: MerchantTransaction | null; wallets: MerchantWallet[]; onClose: () => void }) {
  return (
    <Drawer open={Boolean(txn)} onClose={onClose} title={txn ? kindLabel[txn.kind] : ""} subtitle={txn ? formatTimestamp(txn.time) : undefined}>
      {txn ? (
        <div className="space-y-4">
          <div>
            <p className="text-[40px] font-medium leading-[44px] tracking-[-0.02em]">
              <Money amount={txn.amount} currency={txn.currency} sign={txn.incoming ? "+" : ""} />
            </p>
            <div className="mt-2">
              <StatusBadge status={txn.status} />
            </div>
          </div>
          <DetailList
            items={[
              {
                label: "Reference",
                value: (
                  <span className="inline-flex items-center gap-1">
                    <code className="break-all font-mono text-xs">{txn.reference}</code>
                    <CopyButton value={txn.reference} />
                  </span>
                ),
              },
              { label: "Type", value: txn.type },
              { label: "From", value: walletName(wallets, txn.sourceWalletId) },
              { label: "To", value: walletName(wallets, txn.destinationWalletId) },
              { label: "Description", value: txn.description || "—" },
              { label: "Transaction ID", value: <code className="font-mono text-xs">{txn.id}</code> },
            ]}
          />
        </div>
      ) : null}
    </Drawer>
  );
}

function payUrl(reference: string) {
  if (typeof window === "undefined") return `/pay/${encodeURIComponent(reference)}`;
  return `${window.location.origin}/pay/${encodeURIComponent(reference)}`;
}

function LinkDrawer({ link, onClose }: { link: MerchantPaymentLink | null; onClose: () => void }) {
  return (
    <Drawer open={Boolean(link)} onClose={onClose} title={link?.title ?? ""} subtitle="Payment link">
      {link ? (
        <div className="space-y-4">
          <p className="text-[40px] font-medium leading-[44px] tracking-[-0.02em]">
            <Money amount={link.amount} currency={link.currency} />
          </p>
          <StatusBadge status={link.status} />
          <DetailList
            items={[
              {
                label: "Reference",
                value: (
                  <span className="inline-flex items-center gap-1">
                    <code className="font-mono text-xs">{link.reference}</code>
                    <CopyButton value={link.reference} />
                  </span>
                ),
              },
              { label: "Expires", value: link.expiresAt ? formatTimestamp(link.expiresAt) : "—" },
              { label: "Paid by transaction", value: link.transactionReference ? <code className="font-mono text-xs">{link.transactionReference}</code> : "Not paid yet" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/pay/${encodeURIComponent(link.reference)}`}
              className="inline-flex h-10 items-center rounded-control border border-line-strong px-4 text-sm font-semibold hover:bg-surface-2"
            >
              Open checkout page
            </a>
            <CopyButton value={payUrl(link.reference)} label="Copy link" />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Money write flows: form → review → confirm (busy) → receipt          */
/* ------------------------------------------------------------------ */

function TransferFlow({
  open,
  onClose,
  wallets,
  defaultWallet,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  wallets: MerchantWallet[];
  defaultWallet: MerchantWallet;
  onDone: (reference: string) => void;
}) {
  const idem = useIdempotencyKey("mxfer");
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [fromId, setFromId] = useState(defaultWallet.id);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string; status: string } | null>(null);

  const from = wallets.find((w) => w.id === fromId) ?? defaultWallet;
  const parsed = parseAmount(amount);
  const toId = Number(to);

  function close() {
    if (busy) return;
    onClose();
    if (step === "done") {
      setStep("form");
      setTo("");
      setAmount("");
      setNote("");
      setResult(null);
    }
    setError(null);
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d+$/.test(to.trim())) return setFieldError("Enter the destination wallet ID (numbers only).");
    if (toId === from.id) return setFieldError("Choose a different wallet to send to.");
    if (!parsed) return setFieldError("Enter an amount above 0, with up to two decimals.");
    if (parsed > from.balance) return setFieldError(`That's more than the ${from.name} balance.`);
    setFieldError(null);
    setStep("review");
  }

  async function confirm() {
    if (busy || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await walletApi.createTransfer({
        sourceWalletId: from.id,
        destinationWalletId: toId,
        amount: parsed,
        description: note.trim() || "Merchant transfer",
        reference: idem.get(),
      });
      idem.reset();
      setResult({ reference: res.transaction.reference, status: res.transaction.status });
      setStep("done");
      onDone(res.transaction.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The transfer wasn't confirmed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={step === "done" ? "Transfer submitted" : step === "review" ? "Review transfer" : "Transfer"}
      subtitle={step === "form" ? "Send from one of your wallets to another Sutura wallet." : undefined}
      footer={
        step === "form" ? (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" form="merchant-transfer-form">Review</Button>
          </>
        ) : step === "review" ? (
          <>
            <Button variant="secondary" onClick={() => { setStep("form"); idem.reset(); setError(null); }} disabled={busy}>
              Edit
            </Button>
            <Button onClick={confirm} busy={busy} busyLabel="Sending">
              Confirm and send
            </Button>
          </>
        ) : (
          <Button onClick={close}>Done</Button>
        )
      }
    >
      {step === "form" ? (
        <form id="merchant-transfer-form" className="space-y-4" onSubmit={review} noValidate>
          <Field label="From wallet" htmlFor="xfer-from">
            <select id="xfer-from" className={fieldClass} value={fromId} onChange={(e) => setFromId(Number(e.target.value))}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (#{w.id}) · {w.currency} {w.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="To wallet ID" htmlFor="xfer-to">
            <input id="xfer-to" className={fieldClass} inputMode="numeric" autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label={`Amount (${from.currency})`} htmlFor="xfer-amount" error={fieldError}>
            <input
              id="xfer-amount"
              className={`${fieldClass} tabular-nums`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              aria-invalid={Boolean(fieldError) || undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Note (optional)" htmlFor="xfer-note">
            <input id="xfer-note" className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </form>
      ) : step === "review" ? (
        <div className="space-y-4">
          <DetailList
            items={[
              { label: "From", value: `${from.name} (#${from.id})` },
              { label: "To", value: `Wallet #${toId}` },
              { label: "Amount", value: <Money amount={parsed} currency={from.currency} /> },
              { label: "Fee", value: "No fee" },
              { label: "Recipient gets", value: <Money amount={parsed} currency={from.currency} />, emphasis: true },
              ...(note.trim() ? [{ label: "Note", value: note.trim() }] : []),
            ]}
          />
          {error ? (
            <InlineAlert title="Transfer not confirmed">
              {error} {RECOVERY}
            </InlineAlert>
          ) : null}
        </div>
      ) : result ? (
        <Receipt
          status={result.status}
          reference={result.reference}
          items={[
            { label: "From", value: `${from.name} (#${from.id})` },
            { label: "To", value: `Wallet #${toId}` },
            { label: "Amount", value: <Money amount={parsed} currency={from.currency} />, emphasis: true },
          ]}
          note={statusTone(result.status) === "review" || statusTone(result.status) === "pending" ? "This transfer is waiting for a compliance check. No money has moved yet." : undefined}
        />
      ) : null}
    </Drawer>
  );
}

function Receipt({
  status,
  reference,
  items,
  note,
}: {
  status: string;
  reference: string;
  items: { label: string; value: React.ReactNode; emphasis?: boolean }[];
  note?: string;
}) {
  return (
    <div className="space-y-4" role="status">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <code className="font-mono text-xs text-ink-2">{reference}</code>
        <CopyButton value={reference} />
      </div>
      <DetailList items={items} />
      {note ? <InlineAlert tone="info">{note}</InlineAlert> : null}
    </div>
  );
}

function AgentCashFlow({
  kind,
  open,
  onClose,
  wallet,
  storeName,
  onDone,
}: {
  kind: "deposit" | "withdrawal";
  open: boolean;
  onClose: () => void;
  wallet: MerchantWallet;
  storeName: string;
  onDone: (reference: string) => void;
}) {
  const isDeposit = kind === "deposit";
  const idem = useIdempotencyKey(isDeposit ? "mdep" : "mwd");
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<AgentQrPayload | null>(null);
  const parsed = parseAmount(amount);

  function close() {
    if (busy) return;
    onClose();
    if (step === "done") {
      setStep("form");
      setAmount("");
      setQr(null);
    }
    setError(null);
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed) return setFieldError("Enter an amount above 0, with up to two decimals.");
    if (!isDeposit && parsed > wallet.balance) return setFieldError(`That's more than the ${wallet.name} balance.`);
    setFieldError(null);
    setStep("review");
  }

  async function confirm() {
    if (busy || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        walletId: wallet.id,
        amount: parsed,
        currency: wallet.currency,
        description: isDeposit ? "Merchant deposit" : "Merchant withdrawal",
        idempotencyKey: idem.get(),
      };
      const res = isDeposit
        ? await walletApi.createDeposit({ ...payload, paymentMethod: undefined })
        : await walletApi.createWithdrawal({ ...payload, withdrawalMethod: undefined });
      idem.reset();
      setQr(
        buildAgentQrPayload({
          operation: isDeposit ? "DEPOSIT" : "WITHDRAWAL",
          reference: res.reference,
          walletId: wallet.id,
          walletName: wallet.name,
          amount: parsed.toFixed(2),
          currency: wallet.currency,
          merchant: storeName,
        }),
      );
      setStep("done");
      onDone(res.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : `The ${kind} wasn't created.`);
    } finally {
      setBusy(false);
    }
  }

  const title = isDeposit ? "Agent deposit" : "Agent withdrawal";
  return (
    <Drawer
      open={open}
      onClose={close}
      title={step === "done" ? `${title} ready` : step === "review" ? `Review ${kind}` : title}
      subtitle={step === "form" ? `${wallet.name} (#${wallet.id}) · an agent completes it by scanning a QR code.` : undefined}
      footer={
        step === "form" ? (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" form={`merchant-${kind}-form`}>Review</Button>
          </>
        ) : step === "review" ? (
          <>
            <Button variant="secondary" onClick={() => { setStep("form"); idem.reset(); setError(null); }} disabled={busy}>
              Edit
            </Button>
            <Button onClick={confirm} busy={busy} busyLabel="Creating">
              {isDeposit ? "Create deposit" : "Create withdrawal"}
            </Button>
          </>
        ) : (
          <Button onClick={close}>Done</Button>
        )
      }
    >
      {step === "form" ? (
        <form id={`merchant-${kind}-form`} onSubmit={review} noValidate className="space-y-4">
          <Field
            label={`Amount (${wallet.currency})`}
            htmlFor={`${kind}-amount`}
            error={fieldError}
            hint={isDeposit ? undefined : `Available: ${wallet.currency} ${wallet.balance.toFixed(2)}`}
          >
            <input
              id={`${kind}-amount`}
              className={`${fieldClass} tabular-nums`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              aria-invalid={Boolean(fieldError) || undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </form>
      ) : step === "review" ? (
        <div className="space-y-4">
          <DetailList
            items={[
              { label: isDeposit ? "Into" : "From", value: `${wallet.name} (#${wallet.id})` },
              { label: "Amount", value: <Money amount={parsed} currency={wallet.currency} /> },
              { label: "Fee", value: "No fee" },
              {
                label: isDeposit ? "Wallet receives" : "You receive in cash",
                value: <Money amount={parsed} currency={wallet.currency} />,
                emphasis: true,
              },
            ]}
          />
          <p className="text-sm text-ink-2">
            {isDeposit
              ? "Nothing is credited until an agent scans the code and takes your cash."
              : "Nothing leaves your wallet until an agent scans the code and hands you the cash."}
          </p>
          {error ? (
            <InlineAlert title={`${isDeposit ? "Deposit" : "Withdrawal"} not created`}>
              {error} {RECOVERY}
            </InlineAlert>
          ) : null}
        </div>
      ) : qr ? (
        <AgentQrPreview
          payload={qr}
          title={isDeposit ? "Deposit QR code" : "Withdrawal QR code"}
          hint={isDeposit ? "Take the cash to a Sutura agent and show this code." : "Show this code at a Sutura agent to collect your cash."}
        />
      ) : null}
    </Drawer>
  );
}

function PaymentLinkFlow({
  open,
  onClose,
  wallets,
  defaultWallet,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  wallets: MerchantWallet[];
  defaultWallet: MerchantWallet;
  onDone: (reference: string) => void;
}) {
  const [walletId, setWalletId] = useState(defaultWallet.id);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<{ title?: string; amount?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<MerchantPaymentLink | null>(null);
  const wallet = wallets.find((w) => w.id === walletId) ?? defaultWallet;

  function close() {
    if (busy) return;
    onClose();
    if (created) {
      setCreated(null);
      setTitle("");
      setAmount("");
    }
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = parseAmount(amount);
    const errs: { title?: string; amount?: string } = {};
    if (!title.trim()) errs.title = "Give the link a title customers will recognise.";
    if (!parsed) errs.amount = "Enter an amount above 0, with up to two decimals.";
    setFieldError(errs);
    if (errs.title || errs.amount || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      const link = await walletApi.createPaymentLink({
        walletId: wallet.id,
        amount: parsed,
        currency: wallet.currency,
        description: title.trim(),
      });
      setCreated({
        id: link.id,
        reference: link.reference,
        title: link.description || title.trim(),
        amount: Number(link.amount),
        currency: link.currency,
        status: link.status,
        expiresAt: link.expiresAt,
        transactionReference: link.transactionReference ?? null,
      });
      onDone(link.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The link wasn't created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={created ? "Payment link created" : "New payment link"}
      footer={
        created ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
            <Button type="submit" form="merchant-link-form" busy={busy} busyLabel="Creating">
              Create link
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4" role="status">
          <DetailList
            items={[
              { label: "Title", value: created.title },
              { label: "Amount", value: <Money amount={created.amount} currency={created.currency} />, emphasis: true },
              { label: "Status", value: <StatusBadge status={created.status} /> },
              { label: "Reference", value: <code className="font-mono text-xs">{created.reference}</code> },
            ]}
          />
          <div className="rounded-row border border-line bg-surface-2 p-3">
            <p className="text-xs text-ink-2">Share this link</p>
            <p className="mt-1 break-all font-mono text-xs">{payUrl(created.reference)}</p>
            <CopyButton value={payUrl(created.reference)} label="Copy link" className="mt-2" />
          </div>
        </div>
      ) : (
        <form id="merchant-link-form" onSubmit={submit} noValidate className="space-y-4">
          <Field label="Title" htmlFor="link-title" error={fieldError.title} hint="Customers see this on the checkout page.">
            <input id="link-title" className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(fieldError.title) || undefined} />
          </Field>
          {wallets.length > 1 ? (
            <Field label="Pay into" htmlFor="link-wallet">
              <select id="link-wallet" className={fieldClass} value={walletId} onChange={(e) => setWalletId(Number(e.target.value))}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (#{w.id}) · {w.currency}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label={`Amount (${wallet.currency})`} htmlFor="link-amount" error={fieldError.amount}>
            <input
              id="link-amount"
              className={`${fieldClass} tabular-nums`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              aria-invalid={Boolean(fieldError.amount) || undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          {error ? <InlineAlert title="Link not created">{error}</InlineAlert> : null}
        </form>
      )}
    </Drawer>
  );
}

function WalletFlow({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("GMD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return setNameError("Name the wallet, for example Main collections.");
    setNameError(null);
    setBusy(true);
    setError(null);
    try {
      await walletApi.createWallet(name.trim(), currency);
      onDone(name.trim());
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The wallet wasn't created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="New wallet"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="merchant-wallet-form" busy={busy} busyLabel="Creating">
            Create wallet
          </Button>
        </>
      }
    >
      <form id="merchant-wallet-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" htmlFor="wallet-name" error={nameError}>
          <input id="wallet-name" className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(nameError) || undefined} />
        </Field>
        <Field label="Currency" htmlFor="wallet-currency">
          <select id="wallet-currency" className={fieldClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="GMD">GMD</option>
            <option value="USD">USD</option>
          </select>
        </Field>
        {error ? <InlineAlert title="Wallet not created">{error}</InlineAlert> : null}
      </form>
    </Drawer>
  );
}
