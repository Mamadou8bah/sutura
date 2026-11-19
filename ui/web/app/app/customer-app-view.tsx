"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clearAuthSession, getAuthSession, type AppSession } from "../../lib/auth-session";
import { clearDemoSession } from "../../lib/demo-auth";
import { buildAgentQrPayload, type AgentQrPayload } from "../../lib/agent-qr";
import type { CustomerDashboardData, CustomerTransaction, CustomerWallet } from "../../lib/mock/customer-dashboard";
import { walletApi, type TransactionResponse } from "../../lib/wallet-api";
import { AgentQrPreview } from "../dashboard/agent-qr-preview";
import { SuturaLoader } from "../components/sutura-loader";
import {
  Button,
  CopyButton,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  InlineAlert,
  Money,
  Skeleton,
  SkeletonRows,
  StatusBadge,
  ThemeToggle,
  fieldClass,
  formatDateTime,
  useApiResource,
  useIdempotencyKey,
  useToast,
  useViewParam,
  type IconName,
} from "../components/ui";

const VIEWS = ["home", "send", "topup", "withdraw", "activity", "profile"] as const;
type View = (typeof VIEWS)[number];

const viewTitles: Record<View, string> = {
  home: "Wallet",
  send: "Send money",
  topup: "Top up",
  withdraw: "Withdraw cash",
  activity: "Activity",
  profile: "Profile",
};

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

function classify(t: TransactionResponse, walletId: number): CustomerTransaction["type"] {
  const type = t.type.toUpperCase();
  if (type.includes("TRANSFER") || type.includes("PAYMENT")) {
    return t.sourceWalletId === walletId ? "TRANSFER_OUT" : "TRANSFER_IN";
  }
  if (type.includes("DEPOSIT")) return "DEPOSIT";
  if (type.includes("WITHDRAW")) return "WITHDRAWAL";
  return "OTHER";
}

async function loadCustomerData(): Promise<CustomerDashboardData> {
  const wallets = await walletApi.listWallets();
  const primary = wallets[0];
  if (!primary) return { wallet: null, transactions: [] };
  const [balance, transactions] = await Promise.all([walletApi.getBalance(primary.id), walletApi.listTransactions()]);
  return {
    wallet: {
      id: primary.id,
      name: primary.name,
      currency: primary.currency,
      balance: Number(balance.balance),
      status: balance.walletStatus ?? primary.status,
    },
    transactions: transactions.map((t) => ({
      id: String(t.id),
      reference: t.reference,
      type: classify(t, primary.id),
      rawType: t.type,
      counterparty: t.description || t.reference,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      time: t.createdAt,
    })),
  };
}

/** Parses a typed amount. Returns null if it is not a positive number with at most 2 decimals. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/* ------------------------------------------------------------------ */
/* Money write attempt: one in-flight request, one key per attempt      */
/* ------------------------------------------------------------------ */

function useWriteAttempt(prefix: string) {
  const key = useIdempotencyKey(prefix);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A definite outcome (declined, unavailable): nothing is in doubt, so no "check Activity" advice. */
  const [final, setFinal] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function run<R>(fn: (idempotencyKey: string) => Promise<R>): Promise<R | null> {
    if (inFlight.current) return null; // no double submit
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFinal(null);
    try {
      return await fn(key.get());
    } catch (err) {
      // Keep the key: pressing Confirm again repeats the same request, so the server can deduplicate.
      setError(errorText(err, "We couldn't confirm this request."));
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function clear() {
    setError(null);
    setFinal(null);
  }

  return { busy, error, final, setFinal, clear, run, resetKey: key.reset };
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                         */
/* ------------------------------------------------------------------ */

const typeIcon: Record<CustomerTransaction["type"], IconName> = {
  TRANSFER_IN: "arrow-down",
  TRANSFER_OUT: "arrow-up",
  DEPOSIT: "plus",
  WITHDRAWAL: "arrow-out",
  OTHER: "repeat",
};

const typeLabel: Record<CustomerTransaction["type"], string> = {
  TRANSFER_IN: "Received",
  TRANSFER_OUT: "Sent",
  DEPOSIT: "Top up",
  WITHDRAWAL: "Withdrawal",
  OTHER: "Transaction",
};

function isCredit(t: CustomerTransaction) {
  return t.type === "TRANSFER_IN" || t.type === "DEPOSIT";
}

function TransactionRow({ txn, onOpen }: { txn: CustomerTransaction; onOpen: (t: CustomerTransaction) => void }) {
  const credit = isCredit(txn);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(txn)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-row bg-surface-2 text-ink-2">
          <Icon name={typeIcon[txn.type]} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{txn.counterparty}</span>
          <span className="block text-xs text-ink-3">
            {typeLabel[txn.type]} · {formatDateTime(txn.time)}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <Money
            amount={txn.amount}
            currency={txn.currency}
            sign={credit ? "+" : "−"}
            className={`text-sm font-semibold ${credit ? "text-status-posted-fg" : "text-ink"}`}
          />
          <StatusBadge status={txn.status} />
        </span>
      </button>
    </li>
  );
}

function TransactionList({
  transactions,
  onOpen,
}: {
  transactions: CustomerTransaction[];
  onOpen: (t: CustomerTransaction) => void;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {transactions.map((txn) => (
        <TransactionRow key={txn.id} txn={txn} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function WalletCard({ wallet, holder }: { wallet: CustomerWallet; holder: string }) {
  // The wallet card is the one dark "moment"; its text colours are fixed so they stay legible in both themes.
  return (
    <section aria-label="Wallet balance" className="rounded-panel bg-charcoal-card p-5 sm:p-6" style={{ color: "#f2f2f7" }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "#aeaeb2" }}>
          {wallet.name}
        </p>
        <span className="text-sm tabular-nums" style={{ color: "#aeaeb2" }}>
          Wallet #{wallet.id}
        </span>
      </div>
      <p className="mt-6 text-sm" style={{ color: "#aeaeb2" }}>
        Available balance
      </p>
      <p className="mt-1 text-[40px] font-medium leading-[44px] tracking-[-0.02em] tabular-nums">
        <span className="mr-2 text-xl font-medium" style={{ color: "#aeaeb2" }}>
          {wallet.currency}
        </span>
        {new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(wallet.balance)}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span className="truncate">{holder}</span>
        {wallet.status.toUpperCase() !== "ACTIVE" ? <StatusBadge status={wallet.status} /> : null}
      </div>
    </section>
  );
}

function WalletCardSkeleton() {
  return (
    <div role="status" aria-label="Loading balance" className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-8 h-4 w-28" />
      <Skeleton className="mt-2 h-10 w-56" />
      <Skeleton className="mt-6 h-4 w-40" />
    </div>
  );
}

function ViewHeader({ title, description, onBack }: { title: string; description?: React.ReactNode; onBack?: () => void }) {
  return (
    <header className="mb-5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-2 inline-flex h-9 items-center gap-1 rounded-control px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="chevron-left" size={18} />
          Wallet
        </button>
      ) : null}
      <h1 className="text-2xl font-semibold leading-8 text-ink">{title}</h1>
      {description ? <p className="mt-1 text-sm text-ink-2">{description}</p> : null}
    </header>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">{children}</div>;
}

function WriteFailure({ error }: { error: string }) {
  return (
    <InlineAlert tone="error" title="We couldn't confirm this">
      {error.replace(/\.$/, "")}. It may still have gone through. Check Activity before trying again; pressing Confirm again repeats the same
      request, so it won't be processed twice.
    </InlineAlert>
  );
}

function Receipt({
  title,
  status,
  reference,
  items,
  note,
  onDone,
  children,
}: {
  title: string;
  status: string;
  reference: string;
  items: { label: string; value: React.ReactNode; emphasis?: boolean }[];
  note?: React.ReactNode;
  onDone: () => void;
  children?: React.ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-center text-center">
          <StatusBadge status={status} />
          <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-lg font-semibold text-ink outline-none">
            {title}
          </h2>
          <div className="mt-1 flex items-center gap-1">
            <code className="font-mono text-xs text-ink-2">{reference}</code>
            <CopyButton value={reference} />
          </div>
        </div>
        <DetailList items={items} />
        {note ? <p className="text-sm text-ink-2">{note}</p> : null}
      </Card>
      {children}
      <Button size="lg" className="w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Send                                                                 */
/* ------------------------------------------------------------------ */

function SendFlow({ wallet, onComplete, onBack }: { wallet: CustomerWallet; onComplete: () => void; onBack: () => void }) {
  const toast = useToast();
  const ids = { dest: useId(), amount: useId(), note: useId() };
  const [form, setForm] = useState({ destination: "", amount: "", note: "" });
  const [errors, setErrors] = useState<{ destination?: string; amount?: string }>({});
  const [step, setStep] = useState<"form" | "review" | "receipt">("form");
  const [receipt, setReceipt] = useState<{ status: string; reference: string; time: string; replay: boolean } | null>(null);
  const write = useWriteAttempt("xfer");

  const amount = parseAmount(form.amount);
  const destId = Number(form.destination.trim());

  function edit(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
    write.resetKey(); // new details, new attempt
    write.clear();
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\d+$/.test(form.destination.trim())) next.destination = "Enter the recipient's wallet ID (numbers only).";
    else if (destId === wallet.id) next.destination = "You can't send money to the same wallet.";
    if (amount === null) next.amount = "Enter an amount greater than 0, with up to 2 decimals.";
    else if (amount > wallet.balance) next.amount = `That's more than your available ${wallet.currency} ${wallet.balance.toFixed(2)}.`;
    setErrors(next);
    if (Object.keys(next).length === 0) setStep("review");
  }

  async function confirm() {
    if (amount === null) return;
    const result = await write.run((key) =>
      walletApi.createTransfer({
        sourceWalletId: wallet.id,
        destinationWalletId: destId,
        amount,
        description: form.note.trim() || `Transfer to wallet ${destId}`,
        reference: key,
      }),
    );
    if (!result) return;
    const status = result.transaction.status;
    if (status === "FAILED") {
      write.resetKey(); // the decline is final; a new try is a new request
      write.setFinal("The transfer was declined. No money was sent.");
      return;
    }
    write.resetKey();
    setReceipt({ status, reference: result.transaction.reference, time: result.transaction.createdAt, replay: result.idempotentReplay });
    setStep("receipt");
    if (status !== "PENDING") toast("Transfer sent");
  }

  if (step === "receipt" && receipt && amount !== null) {
    const pending = receipt.status === "PENDING";
    return (
      <>
        <ViewHeader title="Transfer receipt" />
        <Receipt
          title={pending ? "Transfer under review" : "Transfer sent"}
          status={pending ? "UNDER_REVIEW" : receipt.status}
          reference={receipt.reference}
          items={[
            { label: "To wallet", value: `#${destId}` },
            { label: "Amount", value: <Money amount={amount} currency={wallet.currency} />, emphasis: true },
            { label: "Sutura fee", value: "None" },
            { label: "Time", value: formatDateTime(receipt.time) },
          ]}
          note={
            pending
              ? "A compliance check is reviewing this transfer. No money has moved yet; Activity shows the result."
              : receipt.replay
                ? "This transfer had already been processed. This is the original result, not a second payment."
                : undefined
          }
          onDone={onComplete}
        />
      </>
    );
  }

  if (step === "review" && amount !== null) {
    return (
      <>
        <ViewHeader title="Check the transfer" description="Nothing is sent until you confirm." />
        <div className="space-y-4">
          <Card>
            <DetailList
              items={[
                { label: "From", value: `${wallet.name} #${wallet.id}` },
                { label: "To wallet", value: `#${destId}` },
                { label: "Amount", value: <Money amount={amount} currency={wallet.currency} /> },
                { label: "Sutura fee", value: "None" },
                { label: "Recipient gets", value: <Money amount={amount} currency={wallet.currency} />, emphasis: true },
                ...(form.note.trim() ? [{ label: "Note", value: form.note.trim() }] : []),
              ]}
            />
            {write.error ? <WriteFailure error={write.error} /> : null}
            {write.final ? <InlineAlert tone="error">{write.final}</InlineAlert> : null}
          </Card>
          <Button size="lg" className="w-full" busy={write.busy} busyLabel="Sending" onClick={confirm}>
            {write.error ? "Confirm again" : `Send ${wallet.currency} ${amount.toFixed(2)}`}
          </Button>
          <Button variant="secondary" size="lg" className="w-full" disabled={write.busy} onClick={() => setStep("form")}>
            Edit details
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <ViewHeader
        title="Send money"
        onBack={onBack}
        description={
          <>
            Available: <Money amount={wallet.balance} currency={wallet.currency} />
          </>
        }
      />
      <form onSubmit={review} noValidate>
        <Card>
          <Field label="Recipient wallet ID" htmlFor={ids.dest} error={errors.destination} hint="Ask the recipient for the wallet number shown in their Sutura app.">
            <input
              id={ids.dest}
              className={fieldClass}
              inputMode="numeric"
              autoComplete="off"
              value={form.destination}
              aria-invalid={Boolean(errors.destination)}
              onChange={(e) => edit({ destination: e.target.value })}
            />
          </Field>
          <Field label={`Amount (${wallet.currency})`} htmlFor={ids.amount} error={errors.amount}>
            <input
              id={ids.amount}
              className={`${fieldClass} tabular-nums`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={form.amount}
              aria-invalid={Boolean(errors.amount)}
              onChange={(e) => edit({ amount: e.target.value })}
            />
          </Field>
          <Field label="Note (optional)" htmlFor={ids.note}>
            <input
              id={ids.note}
              className={fieldClass}
              maxLength={120}
              placeholder="What it's for"
              value={form.note}
              onChange={(e) => edit({ note: e.target.value })}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            Review transfer
          </Button>
        </Card>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Top up                                                               */
/* ------------------------------------------------------------------ */

function TopUpFlow({
  wallet,
  holder,
  onComplete,
  onBack,
}: {
  wallet: CustomerWallet;
  holder: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const ids = { amount: useId(), method: useId(), phone: useId() };
  const [form, setForm] = useState({ amount: "", method: "mobile_money" as "mobile_money" | "agent", phone: "" });
  const [errors, setErrors] = useState<{ amount?: string; phone?: string }>({});
  const [step, setStep] = useState<"form" | "review" | "receipt">("form");
  const [qr, setQr] = useState<AgentQrPayload | null>(null);
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("PENDING");
  const write = useWriteAttempt("dep");
  const amount = parseAmount(form.amount);
  const agent = form.method === "agent";

  function edit(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
    write.resetKey();
    write.clear();
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (amount === null) next.amount = "Enter an amount greater than 0, with up to 2 decimals.";
    if (!agent && form.phone.trim().length < 7) next.phone = "Enter the mobile money number to charge.";
    setErrors(next);
    if (Object.keys(next).length === 0) setStep("review");
  }

  async function confirm() {
    if (amount === null) return;
    const deposit = await write.run((key) =>
      walletApi.createDeposit({
        walletId: wallet.id,
        amount,
        currency: wallet.currency,
        paymentMethod: agent ? undefined : "mobile_money",
        phoneNumber: agent ? undefined : form.phone.trim(),
        description: agent ? "Agent cash-in" : "Mobile money top-up",
        idempotencyKey: key,
      }),
    );
    if (!deposit) return;
    if (!agent) {
      if (!deposit.paymentUrl) {
        write.resetKey();
        write.setFinal(`Mobile money checkout is unavailable right now. Top-up ${deposit.reference} was not charged and stays pending.`);
        return;
      }
      write.resetKey();
      window.location.assign(deposit.paymentUrl);
      return;
    }
    write.resetKey();
    setReference(deposit.reference);
    setStatus(deposit.status);
    setQr(
      buildAgentQrPayload({
        operation: "DEPOSIT",
        reference: deposit.reference,
        walletId: wallet.id,
        walletName: wallet.name,
        amount: amount.toFixed(2),
        currency: wallet.currency,
        merchant: holder,
      }),
    );
    setStep("receipt");
  }

  if (step === "receipt" && qr && amount !== null) {
    return (
      <>
        <ViewHeader title="Cash-in request" />
        <Receipt
          title="Show this code to an agent"
          status={status === "PENDING" ? "AWAITING_AGENT" : status}
          reference={reference}
          items={[
            { label: "Wallet", value: `${wallet.name} #${wallet.id}` },
            { label: "Amount", value: <Money amount={amount} currency={wallet.currency} />, emphasis: true },
            { label: "Sutura fee", value: "None" },
          ]}
          note="Hand the agent the cash. Your balance updates when the agent confirms."
          onDone={onComplete}
        >
          <AgentQrPreview payload={qr} title="Cash-in QR code" hint="A Sutura agent scans this to credit your wallet." />
        </Receipt>
      </>
    );
  }

  if (step === "review" && amount !== null) {
    return (
      <>
        <ViewHeader title="Check the top-up" description="Nothing is charged until you confirm." />
        <div className="space-y-4">
          <Card>
            <DetailList
              items={[
                { label: "To wallet", value: `${wallet.name} #${wallet.id}` },
                { label: "Method", value: agent ? "Cash at a Sutura agent" : `Mobile money (${form.phone.trim()})` },
                { label: "Sutura fee", value: "None" },
                { label: "You receive", value: <Money amount={amount} currency={wallet.currency} />, emphasis: true },
              ]}
            />
            {!agent ? <p className="text-sm text-ink-2">You'll be taken to the mobile money checkout to approve the payment.</p> : null}
            {write.error ? <WriteFailure error={write.error} /> : null}
            {write.final ? <InlineAlert tone="error">{write.final}</InlineAlert> : null}
          </Card>
          <Button size="lg" className="w-full" busy={write.busy} busyLabel="Starting top-up" onClick={confirm}>
            {write.error ? "Confirm again" : agent ? "Create agent code" : "Continue to checkout"}
          </Button>
          <Button variant="secondary" size="lg" className="w-full" disabled={write.busy} onClick={() => setStep("form")}>
            Edit details
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <ViewHeader title="Top up" onBack={onBack} description="Add money with mobile money or with cash at a Sutura agent." />
      <form onSubmit={review} noValidate>
        <Card>
          <Field label={`Amount (${wallet.currency})`} htmlFor={ids.amount} error={errors.amount}>
            <input
              id={ids.amount}
              className={`${fieldClass} tabular-nums`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={form.amount}
              aria-invalid={Boolean(errors.amount)}
              onChange={(e) => edit({ amount: e.target.value })}
            />
          </Field>
          <Field label="Method" htmlFor={ids.method}>
            <select id={ids.method} className={fieldClass} value={form.method} onChange={(e) => edit({ method: e.target.value as typeof form.method })}>
              <option value="mobile_money">Mobile money (ModemPay)</option>
              <option value="agent">Cash at a Sutura agent</option>
            </select>
          </Field>
          {!agent ? (
            <Field label="Mobile money number" htmlFor={ids.phone} error={errors.phone}>
              <input
                id={ids.phone}
                className={fieldClass}
                type="tel"
                autoComplete="tel"
                placeholder="+220 7XX XXXX"
                value={form.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(e) => edit({ phone: e.target.value })}
              />
            </Field>
          ) : null}
          <Button type="submit" size="lg" className="w-full">
            Review top-up
          </Button>
        </Card>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Withdraw                                                             */
/* ------------------------------------------------------------------ */

const payoutLabels = { agent: "Cash at a Sutura agent", wave: "Wave payout", afrimoney: "Afrimoney payout" } as const;
type Payout = keyof typeof payoutLabels;

function WithdrawFlow({
  wallet,
  holder,
  onComplete,
  onBack,
}: {
  wallet: CustomerWallet;
  holder: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const toast = useToast();
  const ids = { amount: useId(), method: useId(), phone: useId() };
  const [form, setForm] = useState<{ amount: string; method: Payout; phone: string }>({ amount: "", method: "agent", phone: "" });
  const [errors, setErrors] = useState<{ amount?: string; phone?: string }>({});
  const [step, setStep] = useState<"form" | "review" | "receipt">("form");
  const [qr, setQr] = useState<AgentQrPayload | null>(null);
  const [result, setResult] = useState<{ reference: string; status: string } | null>(null);
  const write = useWriteAttempt("wd");
  const amount = parseAmount(form.amount);
  const agent = form.method === "agent";

  function edit(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
    write.resetKey();
    write.clear();
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (amount === null) next.amount = "Enter an amount greater than 0, with up to 2 decimals.";
    else if (amount > wallet.balance) next.amount = `That's more than your available ${wallet.currency} ${wallet.balance.toFixed(2)}.`;
    if (!agent && form.phone.trim().length < 7) next.phone = "Enter the number that should receive the payout.";
    setErrors(next);
    if (Object.keys(next).length === 0) setStep("review");
  }

  async function confirm() {
    if (amount === null) return;
    const withdrawal = await write.run((key) =>
      walletApi.createWithdrawal({
        walletId: wallet.id,
        amount,
        currency: wallet.currency,
        withdrawalMethod: agent ? undefined : form.method,
        phoneNumber: agent ? undefined : form.phone.trim(),
        description: agent ? "Agent cash-out" : "Mobile money payout",
        idempotencyKey: key,
      }),
    );
    if (!withdrawal) return;
    write.resetKey();
    setResult({ reference: withdrawal.reference, status: withdrawal.status });
    if (agent) {
      setQr(
        buildAgentQrPayload({
          operation: "WITHDRAWAL",
          reference: withdrawal.reference,
          walletId: wallet.id,
          walletName: wallet.name,
          amount: amount.toFixed(2),
          currency: wallet.currency,
          merchant: holder,
        }),
      );
    } else {
      toast("Payout requested");
    }
    setStep("receipt");
  }

  if (step === "receipt" && result && amount !== null) {
    return (
      <>
        <ViewHeader title="Withdrawal request" />
        <Receipt
          title={agent ? "Show this code to an agent" : "Payout requested"}
          status={agent && result.status === "PENDING" ? "AWAITING_AGENT" : result.status}
          reference={result.reference}
          items={[
            { label: "From wallet", value: `${wallet.name} #${wallet.id}` },
            { label: "Method", value: agent ? payoutLabels.agent : `${payoutLabels[form.method]} to ${form.phone.trim()}` },
            { label: "Amount", value: <Money amount={amount} currency={wallet.currency} />, emphasis: true },
            { label: "Sutura fee", value: "None" },
          ]}
          note={agent ? "The agent hands you the cash after scanning this code." : "Activity shows when the payout completes."}
          onDone={onComplete}
        >
          {qr ? <AgentQrPreview payload={qr} title="Cash-out QR code" hint="A Sutura agent scans this to pay you cash from your wallet." /> : null}
        </Receipt>
      </>
    );
  }

  if (step === "review" && amount !== null) {
    return (
      <>
        <ViewHeader title="Check the withdrawal" description="Nothing leaves your wallet until you confirm." />
        <div className="space-y-4">
          <Card>
            <DetailList
              items={[
                { label: "From wallet", value: `${wallet.name} #${wallet.id}` },
                { label: "Method", value: agent ? payoutLabels.agent : `${payoutLabels[form.method]} to ${form.phone.trim()}` },
                { label: "Amount", value: <Money amount={amount} currency={wallet.currency} /> },
                { label: "Sutura fee", value: "None" },
                { label: "You receive", value: <Money amount={amount} currency={wallet.currency} />, emphasis: true },
              ]}
            />
            {write.error ? <WriteFailure error={write.error} /> : null}
            {write.final ? <InlineAlert tone="error">{write.final}</InlineAlert> : null}
          </Card>
          <Button size="lg" className="w-full" busy={write.busy} busyLabel="Requesting" onClick={confirm}>
            {write.error ? "Confirm again" : `Withdraw ${wallet.currency} ${amount.toFixed(2)}`}
          </Button>
          <Button variant="secondary" size="lg" className="w-full" disabled={write.busy} onClick={() => setStep("form")}>
            Edit details
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <ViewHeader
        title="Withdraw cash"
        onBack={onBack}
        description={
          <>
            Available: <Money amount={wallet.balance} currency={wallet.currency} />
          </>
        }
      />
      <form onSubmit={review} noValidate>
        <Card>
          <Field label={`Amount (${wallet.currency})`} htmlFor={ids.amount} error={errors.amount}>
            <input
              id={ids.amount}
              className={`${fieldClass} tabular-nums`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={form.amount}
              aria-invalid={Boolean(errors.amount)}
              onChange={(e) => edit({ amount: e.target.value })}
            />
          </Field>
          <Field label="Payout method" htmlFor={ids.method}>
            <select id={ids.method} className={fieldClass} value={form.method} onChange={(e) => edit({ method: e.target.value as Payout })}>
              {(Object.keys(payoutLabels) as Payout[]).map((k) => (
                <option key={k} value={k}>
                  {payoutLabels[k]}
                </option>
              ))}
            </select>
          </Field>
          {!agent ? (
            <Field label="Payout phone number" htmlFor={ids.phone} error={errors.phone}>
              <input
                id={ids.phone}
                className={fieldClass}
                type="tel"
                autoComplete="tel"
                placeholder="+220 7XX XXXX"
                value={form.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(e) => edit({ phone: e.target.value })}
              />
            </Field>
          ) : null}
          <Button type="submit" size="lg" className="w-full">
            Review withdrawal
          </Button>
        </Card>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                           */
/* ------------------------------------------------------------------ */

function BottomNav({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const items: { id: View; label: string; icon: IconName }[] = [
    { id: "home", label: "Wallet", icon: "home" },
    { id: "send", label: "Send", icon: "send" },
    { id: "topup", label: "Top up", icon: "plus" },
    { id: "activity", label: "Activity", icon: "history" },
    { id: "profile", label: "Profile", icon: "user" },
  ];
  return (
    <nav aria-label="Wallet sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {items.map((item) => {
          const active = view === item.id || (item.id === "home" && view === "withdraw");
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-control px-2 text-xs font-medium transition-colors ${
                active ? "text-accent-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              <Icon name={item.icon} size={22} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                 */
/* ------------------------------------------------------------------ */

function readCustomerSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  return getAuthSession();
}

export function CustomerAppView() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useViewParam(VIEWS, "home");
  const [openTxn, setOpenTxn] = useState<CustomerTransaction | null>(null);

  useEffect(() => {
    setSession(readCustomerSession());
    setChecked(true);
  }, []);

  const isApiSession = session?.source === "api" && Boolean(session.accessToken);
  const resource = useApiResource(isApiSession ? loadCustomerData : null, [isApiSession]);

  useEffect(() => {
    document.title = `${viewTitles[view]} · Sutura`;
  }, [view]);

  function go(v: View) {
    setView(v);
    window.scrollTo({ top: 0 });
  }

  function handleLogout() {
    clearAuthSession();
    clearDemoSession();
    window.location.href = "/login";
  }

  if (!checked) {
    return <SuturaLoader message="Opening your wallet" submessage="Checking your session" />;
  }

  if (!session || !isApiSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm">
          <EmptyState title="Log in to see your wallet" icon="lock" action={<a href="/login" className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-on hover:bg-accent-hover">Log in</a>}>
            Your session has ended or you are not logged in.
          </EmptyState>
        </div>
      </main>
    );
  }

  const initials = session.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const data = resource.data;
  const wallet = data?.wallet ?? null;
  const transactions = data?.transactions ?? [];
  const sessionExpired = /session expired|not authenticated/i.test(resource.error ?? "");

  function afterWrite() {
    go("home");
    void resource.reload();
  }

  // Shared states for views that need the wallet.
  let walletGate: React.ReactNode = null;
  if (sessionExpired) {
    walletGate = (
      <EmptyState title="Your session has ended" icon="lock" action={<a href="/login" className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-on hover:bg-accent-hover">Log in again</a>}>
        For your security, log in again to continue.
      </EmptyState>
    );
  } else if (resource.error && !data) {
    walletGate = <ErrorState title="We couldn't load your wallet" error={resource.error} onRetry={() => void resource.reload()} retrying={resource.refreshing} />;
  } else if (!data) {
    walletGate = null; // loading, handled per view
  } else if (!wallet) {
    walletGate = (
      <EmptyState title="You don't have a wallet yet" icon="wallet">
        Your wallet is created when your account is set up. If this persists, contact Sutura support.
      </EmptyState>
    );
  }

  const loading = !data && !resource.error;

  return (
    <div className="min-h-screen bg-canvas pb-28 text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <a href="/" className="flex items-center gap-2 rounded-control" aria-label="Sutura home">
            <img src="/brand/sutura-logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="text-base font-semibold">Sutura</span>
          </a>
          <button
            type="button"
            onClick={() => go("profile")}
            className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink"
            aria-label={`Profile for ${session.name}`}
          >
            {initials}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-lg px-4 pt-5">
        {view === "home" && (
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <h1 className="text-2xl font-semibold leading-8">Wallet</h1>
              {data ? (
                <Button variant="ghost" size="sm" icon="refresh" busy={resource.refreshing} busyLabel="Refreshing" onClick={() => void resource.reload()}>
                  Refresh
                </Button>
              ) : null}
            </div>
            {walletGate ??
              (loading || !wallet ? (
                <>
                  <WalletCardSkeleton />
                  <SkeletonRows rows={4} label="Loading activity" />
                </>
              ) : (
                <>
                  {resource.error ? (
                    <InlineAlert tone="warning" title="Showing your last loaded balance">
                      Refresh failed: {resource.error}
                    </InlineAlert>
                  ) : null}
                  <WalletCard wallet={wallet} holder={session.name} />
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="lg" icon="send" onClick={() => go("send")} className="px-2">
                      Send
                    </Button>
                    <Button size="lg" variant="secondary" icon="plus" onClick={() => go("topup")} className="px-2">
                      Top up
                    </Button>
                    <Button size="lg" variant="secondary" icon="arrow-out" onClick={() => go("withdraw")} className="px-2">
                      Withdraw
                    </Button>
                  </div>
                  <section aria-labelledby="recent-heading">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 id="recent-heading" className="text-base font-semibold">
                        Recent activity
                      </h2>
                      {transactions.length > 0 ? (
                        <button type="button" onClick={() => go("activity")} className="rounded-control px-1 text-sm font-medium text-accent-ink hover:underline">
                          See all
                        </button>
                      ) : null}
                    </div>
                    {transactions.length === 0 ? (
                      <div className="rounded-card border border-line bg-surface">
                        <EmptyState title="No activity yet" icon="history">
                          Top up or receive a transfer and it will show here.
                        </EmptyState>
                      </div>
                    ) : (
                      <TransactionList transactions={transactions.slice(0, 5)} onOpen={setOpenTxn} />
                    )}
                  </section>
                </>
              ))}
          </div>
        )}

        {(view === "send" || view === "topup" || view === "withdraw") &&
          (walletGate ? (
            <>
              <ViewHeader title={viewTitles[view]} />
              {walletGate}
            </>
          ) : loading || !wallet ? (
            <>
              <ViewHeader title={viewTitles[view]} />
              <div role="status" aria-label="Loading wallet" className="space-y-3 rounded-card border border-line bg-surface p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            </>
          ) : wallet.status.toUpperCase() !== "ACTIVE" ? (
            <>
              <ViewHeader title={viewTitles[view]} onBack={() => go("home")} />
              <InlineAlert tone="error" title="This wallet can't move money right now">
                Its status is <StatusBadge status={wallet.status} />. Contact Sutura support to find out why.
              </InlineAlert>
            </>
          ) : view === "send" ? (
            <SendFlow key="send" wallet={wallet} onComplete={afterWrite} onBack={() => go("home")} />
          ) : view === "topup" ? (
            <TopUpFlow key="topup" wallet={wallet} holder={session.name} onComplete={afterWrite} onBack={() => go("home")} />
          ) : (
            <WithdrawFlow key="withdraw" wallet={wallet} holder={session.name} onComplete={afterWrite} onBack={() => go("home")} />
          ))}

        {view === "activity" && (
          <div>
            <ViewHeader title="Activity" description="Every transfer, top-up and withdrawal on your wallet." />
            {walletGate ??
              (loading ? (
                <SkeletonRows rows={6} label="Loading activity" />
              ) : transactions.length === 0 ? (
                <div className="rounded-card border border-line bg-surface">
                  <EmptyState title="No activity yet" icon="history">
                    Top up or receive a transfer and it will show here.
                  </EmptyState>
                </div>
              ) : (
                <TransactionList transactions={transactions} onOpen={setOpenTxn} />
              ))}
          </div>
        )}

        {view === "profile" && (
          <div className="space-y-5">
            <ViewHeader title="Profile" />
            <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-2 text-lg font-semibold">{initials}</div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{session.name}</p>
                <p className="truncate text-sm text-ink-2">{session.email}</p>
                <p className="mt-1 text-xs text-ink-3">Customer account</p>
              </div>
            </div>

            <section aria-labelledby="wallet-details">
              <h2 id="wallet-details" className="mb-2 text-base font-semibold">
                Wallet
              </h2>
              {walletGate ??
                (loading || !wallet ? (
                  <SkeletonRows rows={2} label="Loading wallet" />
                ) : (
                  <DetailList
                    items={[
                      { label: "Name", value: wallet.name },
                      { label: "Wallet ID", value: <span className="tabular-nums">#{wallet.id}</span> },
                      { label: "Currency", value: wallet.currency },
                      { label: "Status", value: <StatusBadge status={wallet.status} /> },
                    ]}
                  />
                ))}
            </section>

            <nav aria-label="Account" className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              <a href="/app/verification" className="flex min-h-12 items-center justify-between px-4 text-sm font-medium hover:bg-surface-2">
                <span className="flex items-center gap-3">
                  <Icon name="id" size={18} className="text-ink-2" />
                  Verify your identity
                </span>
                <Icon name="chevron-right" size={18} className="text-ink-3" />
              </a>
              <button type="button" onClick={() => go("topup")} className="flex min-h-12 w-full items-center justify-between px-4 text-sm font-medium hover:bg-surface-2">
                <span className="flex items-center gap-3">
                  <Icon name="plus" size={18} className="text-ink-2" />
                  Top up
                </span>
                <Icon name="chevron-right" size={18} className="text-ink-3" />
              </button>
              <button type="button" onClick={() => go("withdraw")} className="flex min-h-12 w-full items-center justify-between px-4 text-sm font-medium hover:bg-surface-2">
                <span className="flex items-center gap-3">
                  <Icon name="arrow-out" size={18} className="text-ink-2" />
                  Withdraw cash
                </span>
                <Icon name="chevron-right" size={18} className="text-ink-3" />
              </button>
              <div className="flex min-h-12 items-center justify-between px-4 text-sm font-medium">
                <span className="flex items-center gap-3">
                  <Icon name="sun" size={18} className="text-ink-2" />
                  Appearance
                </span>
                <ThemeToggle />
              </div>
            </nav>

            <Button variant="secondary" size="lg" icon="logout" className="w-full text-status-failed-fg" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        )}
      </main>

      <Drawer open={openTxn !== null} onClose={() => setOpenTxn(null)} title={openTxn ? typeLabel[openTxn.type] : ""} subtitle={openTxn ? openTxn.counterparty : undefined}>
        {openTxn ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={openTxn.status} />
              <Money
                amount={openTxn.amount}
                currency={openTxn.currency}
                sign={isCredit(openTxn) ? "+" : "−"}
                className="text-xl font-semibold"
              />
            </div>
            <DetailList
              items={[
                {
                  label: "Reference",
                  value: (
                    <span className="inline-flex items-center gap-1">
                      <code className="font-mono text-xs">{openTxn.reference}</code>
                      <CopyButton value={openTxn.reference} />
                    </span>
                  ),
                },
                { label: "Type", value: typeLabel[openTxn.type] },
                { label: "Description", value: openTxn.counterparty },
                { label: "Time", value: formatDateTime(openTxn.time) },
              ]}
            />
            {openTxn.status.toUpperCase() === "PENDING" ? (
              <p className="text-sm text-ink-2">This is still being processed. No money has settled yet.</p>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <BottomNav view={view} onChange={go} />
    </div>
  );
}
