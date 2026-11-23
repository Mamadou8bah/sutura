"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { getAuthSession } from "../../../lib/auth-session";
import { walletApi, type PaymentLinkResponse, type WalletResponse } from "../../../lib/wallet-api";
import {
  Button,
  CopyButton,
  DetailList,
  EmptyState,
  ErrorState,
  InlineAlert,
  Money,
  Skeleton,
  StatusBadge,
  fieldClass,
  formatDateTime,
  useApiResource,
} from "../../components/ui";

const statusCopy: Record<string, string> = {
  ACTIVE: "Ready to pay",
  PROCESSING: "Payment is processing. You can check its status here.",
  REVIEW: "Under review. No money has moved yet.",
  PAID: "Paid",
  FAILED: "This payment was declined. No money was taken.",
  EXPIRED: "This payment link has expired. Ask the merchant for a new one.",
  REFUNDED: "This payment was refunded.",
};

type Loaded = { link: PaymentLinkResponse; wallets: WalletResponse[] };

export default function CollectionCheckout() {
  const { reference } = useParams<{ reference: string }>();
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getAuthSession()?.accessToken));
    setChecked(true);
    document.title = "Pay a merchant · Sutura";
  }, []);

  const resource = useApiResource<Loaded>(
    signedIn
      ? async () => {
          const [link, wallets] = await Promise.all([walletApi.getPaymentLink(reference), walletApi.listWallets()]);
          return { link, wallets };
        }
      : null,
    [signedIn, reference],
  );

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink sm:py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 rounded-control" aria-label="Sutura home">
          <img src="/brand/sutura-logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="text-base font-semibold">Sutura</span>
        </Link>
        <section className="rounded-panel border border-line bg-surface p-5 shadow-card sm:p-6">
          <h1 className="text-2xl font-semibold leading-8">Pay a merchant</h1>
          <p className="mt-1 text-sm text-ink-2">
            Payment link <code className="font-mono text-xs">{reference}</code>
          </p>

          <div className="mt-5">
            {!checked ? (
              <CheckoutSkeleton />
            ) : !signedIn ? (
              <EmptyState
                title="Log in to pay"
                icon="lock"
                action={
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-on hover:bg-accent-hover"
                  >
                    Log in
                  </Link>
                }
              >
                Pay from your Sutura wallet. After you log in, open this payment link again.
              </EmptyState>
            ) : resource.error && !resource.data ? (
              <ErrorState title="We couldn't load this payment" error={resource.error} onRetry={() => void resource.reload()} retrying={resource.refreshing} />
            ) : !resource.data ? (
              <CheckoutSkeleton />
            ) : (
              <Checkout reference={reference} initial={resource.data} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Loading payment" className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-4 h-11 w-full" />
    </div>
  );
}

function Checkout({ reference, initial }: { reference: string; initial: Loaded }) {
  const selectId = useId();
  const [link, setLink] = useState(initial.link);
  const wallets = initial.wallets.filter((w) => w.currency === link.currency && w.status === "ACTIVE");
  const [walletId, setWalletId] = useState<number | undefined>(wallets[0]?.id);
  const [step, setStep] = useState<"choose" | "review">("choose");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const wallet = wallets.find((w) => w.id === walletId);

  async function pay() {
    if (!walletId || inFlight.current) return; // one request at a time
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      setLink(await walletApi.payPaymentLink(reference, walletId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      setLink(await walletApi.getPaymentLink(reference));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh the payment status");
    } finally {
      setRefreshing(false);
    }
  }

  const amount = <Money amount={link.amount} currency={link.currency} />;

  if (link.status === "PAID") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <StatusBadge status="PAID" />
          <p className="mt-3 text-3xl font-medium tabular-nums">{amount}</p>
          <p className="mt-1 text-sm text-ink-2">Paid to {link.merchantName}</p>
        </div>
        <DetailList
          items={[
            { label: "Merchant", value: link.merchantName },
            { label: "For", value: link.description || "—" },
            { label: "Amount", value: amount, emphasis: true },
            { label: "Sutura fee", value: "None" },
            ...(wallet ? [{ label: "Paid from", value: `${wallet.name} #${wallet.id}` }] : []),
            {
              label: "Reference",
              value: (
                <span className="inline-flex items-center gap-1">
                  <code className="font-mono text-xs">{link.transactionReference ?? link.reference}</code>
                  <CopyButton value={link.transactionReference ?? link.reference} />
                </span>
              ),
            },
          ]}
        />
        <Link href="/app?view=activity" className="inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong text-sm font-semibold hover:bg-surface-2">
          View in Activity
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-ink-2">{link.merchantName}</p>
        <p className="mt-1 text-3xl font-medium tabular-nums">{amount}</p>
        {link.description ? <p className="mt-1 text-sm text-ink">{link.description}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={link.status} label={link.status === "ACTIVE" ? "Ready to pay" : undefined} />
          {link.expiresAt && link.status === "ACTIVE" ? <span className="text-xs text-ink-3">Expires {formatDateTime(link.expiresAt)}</span> : null}
        </div>
        {link.status !== "ACTIVE" ? (
          <p className="mt-2 text-sm text-ink-2" role="status">
            {statusCopy[link.status] ?? `Status: ${link.status}`}
          </p>
        ) : null}
      </div>

      {link.status === "ACTIVE" ? (
        wallets.length === 0 ? (
          <InlineAlert tone="warning" title={`You need an active ${link.currency} wallet`}>
            None of your wallets can pay in {link.currency}.
          </InlineAlert>
        ) : step === "choose" ? (
          <>
            <div className="space-y-1.5">
              <label htmlFor={selectId} className="block text-sm font-medium">
                Pay from
              </label>
              <select id={selectId} className={fieldClass} value={walletId ?? ""} onChange={(e) => setWalletId(Number(e.target.value))}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · #{w.id} · {w.currency}
                  </option>
                ))}
              </select>
            </div>
            <Button size="lg" className="w-full" disabled={!walletId} onClick={() => setStep("review")}>
              Review payment
            </Button>
          </>
        ) : (
          <>
            <DetailList
              items={[
                { label: "Pay to", value: link.merchantName },
                { label: "From", value: wallet ? `${wallet.name} #${wallet.id}` : "—" },
                { label: "Amount", value: amount },
                { label: "Sutura fee", value: "None" },
                { label: "Total", value: amount, emphasis: true },
              ]}
            />
            {error ? (
              <InlineAlert tone="error" title="We couldn't confirm the payment">
                {error}. Refresh the status below before trying again; this link can only be paid once.
              </InlineAlert>
            ) : null}
            <Button size="lg" className="w-full" busy={busy} busyLabel="Paying" onClick={pay}>
              Pay {link.currency} {Number(link.amount).toFixed(2)}
            </Button>
            <Button variant="secondary" size="lg" className="w-full" disabled={busy} onClick={() => setStep("choose")}>
              Change wallet
            </Button>
          </>
        )
      ) : null}

      {error && step !== "review" ? (
        <p role="alert" className="text-sm text-status-failed-fg">
          {error}
        </p>
      ) : null}
      <Button variant="ghost" size="sm" icon="refresh" busy={refreshing} busyLabel="Refreshing" disabled={busy} onClick={refresh}>
        Refresh payment status
      </Button>
    </div>
  );
}
