"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { Button, Drawer, Field, Icon, InlineAlert, StatusBadge, fieldClass, useToast, type StatusTone } from "../../components/ui";

/** Admin sections are path-based: /dashboard/<section>[/<record or action>]. */
export function useAdminNav() {
  const router = useRouter();
  return useCallback(
    (section: string, sub?: string) => {
      if (section === "overview" && !sub) router.push("/dashboard");
      else router.push(sub ? `/dashboard/${section}/${sub}` : `/dashboard/${section}`);
    },
    [router],
  );
}

/**
 * `?status=` filter set by overview tiles (e.g. Frozen wallets → /dashboard/wallets?status=SUSPENDED).
 * Read after mount; clearing removes it from the URL.
 */
export function useStatusFilter(): [string | null, () => void] {
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    setStatus(new URLSearchParams(window.location.search).get("status"));
  }, []);
  const clear = useCallback(() => {
    setStatus(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    window.history.replaceState(null, "", url.toString());
  }, []);
  return [status, clear];
}

export function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
      <span>Filtered:</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pl-2.5 pr-1 text-ink">
        {label}
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear filter ${label}`}
          className="grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <Icon name="x" size={12} />
        </button>
      </span>
    </div>
  );
}

const actionLabels: Record<string, string> = {
  FREEZE_WALLET: "Freeze wallet",
  UNFREEZE_WALLET: "Unfreeze wallet",
  REVERSE_TRANSACTION: "Reverse payment",
  REPROCESS_WEBHOOK: "Reprocess webhook",
  REPLAY_WEBHOOK: "Replay webhook",
  TRIGGER_RECONCILIATION: "Run reconciliation",
  RESOLVE_MISMATCH: "Resolve mismatch",
  RESOLVE_RISK_FLAG: "Resolve risk flag",
  RISK_EVALUATE: "Evaluate risk",
};

/** FREEZE_WALLET → "Freeze wallet". */
export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  if (actionLabels[value]) return actionLabels[value];
  const words = value.toLowerCase().replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const riskTone: Record<string, StatusTone> = {
  CRITICAL: "failed",
  HIGH: "failed",
  MEDIUM: "pending",
  LOW: "muted",
};

export function RiskBadge({ level }: { level: string }) {
  const key = level?.toUpperCase() ?? "";
  return <StatusBadge tone={riskTone[key] ?? "muted"} label={humanize(key) + " risk"} />;
}

/**
 * Confirmation drawer for sensitive admin actions. Shows record context and
 * the impact before anything is sent, requires a reason when asked, keeps the
 * confirm button busy while the request runs and never retries by itself.
 */
export function ConfirmActionDrawer({
  open,
  onClose,
  title,
  subtitle,
  context,
  impact,
  confirmLabel,
  busyLabel = "Working",
  destructive = false,
  reasonLabel = "Reason",
  requireReason = true,
  reasonHint = "Recorded in the audit trail with your name.",
  extra,
  canConfirm = true,
  onConfirm,
  successMessage,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  context?: ReactNode;
  impact?: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  destructive?: boolean;
  reasonLabel?: string;
  requireReason?: boolean;
  reasonHint?: string;
  extra?: ReactNode;
  canConfirm?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  successMessage: string;
}) {
  const toast = useToast();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const close = () => {
    if (busy) return;
    setReason("");
    setError(null);
    setTouched(false);
    onClose();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setTouched(true);
    if (requireReason && !reason.trim()) return;
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      toast(successMessage, "success");
      setReason("");
      setTouched(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  const reasonMissing = requireReason && touched && !reason.trim();
  const formId = `${reasonId}-form`;

  return (
    <Drawer
      open={open}
      onClose={close}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={destructive ? "danger" : "primary"}
            busy={busy}
            busyLabel={busyLabel}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        {context}
        {impact ? <InlineAlert tone={destructive ? "warning" : "info"}>{impact}</InlineAlert> : null}
        {extra}
        {requireReason ? (
          <Field label={reasonLabel} htmlFor={reasonId} hint={reasonHint} error={reasonMissing ? "Enter a reason before confirming." : null}>
            <textarea
              id={reasonId}
              rows={3}
              maxLength={1000}
              value={reason}
              disabled={busy}
              aria-invalid={reasonMissing || undefined}
              onChange={(e) => setReason(e.target.value)}
              className={`${fieldClass} h-auto py-2`}
            />
          </Field>
        ) : null}
        {error ? (
          <InlineAlert tone="error" title="Nothing was changed">
            {error} Check the audit trail before trying again.
          </InlineAlert>
        ) : null}
      </form>
    </Drawer>
  );
}

/** Small form used by the typed-ID action routes (e.g. /dashboard/wallets/freeze). */
export function IdEntry({
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  hint,
  type = "number",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  hint?: string;
  type?: "number" | "text";
}) {
  const id = useId();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit();
      }}
    >
      <div className="w-full sm:max-w-xs">
        <Field label={label} htmlFor={id} hint={hint}>
          <input
            id={id}
            className={fieldClass}
            type={type}
            inputMode={type === "number" ? "numeric" : undefined}
            min={type === "number" ? 1 : undefined}
            step={type === "number" ? 1 : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
          />
        </Field>
      </div>
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  );
}
