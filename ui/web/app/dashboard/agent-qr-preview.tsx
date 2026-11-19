"use client";

import QRCode from "react-qr-code";
import { encodeAgentQrPayload, type AgentQrPayload } from "../../lib/agent-qr";
import { CopyButton, Money, StatusBadge } from "../components/ui";

export function AgentQrPreview({
  payload,
  title,
  hint,
}: {
  payload: AgentQrPayload;
  title: string;
  hint?: string;
}) {
  const value = encodeAgentQrPayload(payload);
  const operation = payload.operation === "DEPOSIT" ? "cash-in" : "cash-out";

  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5" aria-label={title}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-2">{hint}</p> : null}
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* QR codes need a light quiet zone to scan, so the tile stays white in both themes. */}
        <div className="rounded-card border border-line p-3" style={{ background: "#ffffff" }}>
          <QRCode value={value} size={168} level="M" title={`QR code for ${operation} ${payload.reference}`} />
        </div>
        <dl className="w-full min-w-0 flex-1 divide-y divide-line rounded-row border border-line text-sm">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Reference</dt>
            <dd className="flex min-w-0 items-center gap-1">
              <code className="truncate font-mono text-xs text-ink">{payload.reference}</code>
              <CopyButton value={payload.reference} />
            </dd>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Wallet</dt>
            <dd className="text-right text-ink">
              {payload.walletName} <span className="text-ink-3 tabular-nums">#{payload.walletId}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Amount</dt>
            <dd className="font-semibold text-ink">
              <Money amount={payload.amount} currency={payload.currency} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Status</dt>
            <dd>
              <StatusBadge status="AWAITING_AGENT" label="Awaiting agent scan" />
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-4 text-sm text-ink-2">
        An agent scans this code to complete the {operation} on your wallet. Nothing moves until the agent confirms.
      </p>
    </section>
  );
}

export function PrimaryWalletBanner({
  name,
  id,
  balance,
  currency,
}: {
  name: string;
  id: number;
  balance: string;
  currency: string;
}) {
  return (
    <div className="rounded-row border border-line bg-surface-2 px-4 py-3">
      <p className="text-xs text-ink-2">Your wallet</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{name}</p>
      <p className="text-xs text-ink-2 tabular-nums">
        #{id} · {balance || `${currency} balance unavailable`}
      </p>
    </div>
  );
}
