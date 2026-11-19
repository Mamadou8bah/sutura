"use client";

/**
 * Sutura web UI kit. Patterns adapted from the zender design system
 * (packages/ui/src/components.tsx), with Sutura's own tokens.
 *
 * - One status system: <StatusBadge> (five tones, shape + label, reversed ≠ failed).
 * - Honest data: useApiResource + Skeleton/ErrorState/EmptyState, never sample data.
 * - Feedback: toasts for success, inline role="alert" errors next to the action.
 * - Money: <Money> with tabular figures, currency always visible.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Icons: one 24px line set, stroke 1.75, aria-hidden unless labelled   */
/* ------------------------------------------------------------------ */

const iconPaths = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  wallet: "M3 7.5h18v11H3zM3 7.5 16 4v3.5M16.5 13h2",
  send: "m4 12 16-7-7 16-2-7z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  "arrow-in": "M12 4v11M7 10l5 5 5-5M5 20h14",
  "arrow-out": "M12 15V4M7 9l5-5 5 5M5 20h14",
  history: "M12 4a8 8 0 1 1-7.4 5M4 4v5h5M12 8v4l3 2",
  user: "M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20.5a7 7 0 0 1 14 0",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M18 20a6 6 0 0 0-3-5.2",
  store: "M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5",
  agent: "M4 20V9l8-5 8 5v11M9 20v-6h6v6M4 20h16",
  id: "M3 6h18v12H3zM8.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16a3 3 0 0 1 6 0M14 10h4M14 13.5h4",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2h-2",
  card: "M3 6.5h18v11H3zM3 10h18",
  link: "M10 13.5a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.5 5.6M14 10.5a4.5 4.5 0 0 0-6.4 0L5 13.1a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1",
  webhook: "M9 16.5a3.5 3.5 0 1 1-3-5.9M12 7.5a3.5 3.5 0 1 1 3.4 4.3M15.5 16.5H9l3.4-6M15.5 16.5a3.5 3.5 0 1 0 2.4-3.3",
  key: "M14.5 9.5a4.5 4.5 0 1 0-3 4.2L13 15.2h2v2h2v2h3v-3l-5.3-5.3a4.5 4.5 0 0 0-.2-1.4zM8 8h.01",
  scale: "M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z",
  alert: "M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z",
  shield: "M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3",
  repeat: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
  refresh: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  x: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5 10 17.5 19 7",
  "check-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 10",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-up": "m6 15 6-6 6 6",
  "chevron-right": "m9 6 6 6-6 6",
  "chevron-left": "m15 6-6 6 6 6",
  logout: "M10 7V5.5A1.5 1.5 0 0 1 11.5 4H19v16h-7.5a1.5 1.5 0 0 1-1.5-1.5V17M15 12H3m0 0 3-3m-3 3 3 3",
  menu: "M4 7h16M4 12h16M4 17h16",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  unlock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  bell: "M12 3.5A5.5 5.5 0 0 0 6.5 9v2.1l-.9 2.7a1 1 0 0 0 .95 1.3h10.9a1 1 0 0 0 .95-1.3l-.9-2.7V9A5.5 5.5 0 0 0 12 3.5zM10 19a2 2 0 0 0 4 0",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  play: "M7 5v14l11-7z",
} as const;

export type IconName = keyof typeof iconPaths;

export function Icon({
  name,
  size = 20,
  label,
  className = "",
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Status: five tones, shape + human label, never colour alone          */
/* ------------------------------------------------------------------ */

export type StatusTone = "pending" | "review" | "posted" | "reversed" | "failed" | "suspended" | "muted";

const toneByStatus: Record<string, StatusTone> = {
  PENDING: "pending",
  AWAITING_AGENT: "pending",
  RUNNING: "pending",
  PROCESSING: "pending",
  PENDING_REPROCESS: "pending",
  INITIATED: "pending",
  CREATED: "pending",
  OPEN: "pending",
  UNRESOLVED: "pending",
  REVIEW: "review",
  UNDER_REVIEW: "review",
  PENDING_REVIEW: "review",
  MORE_INFO_REQUIRED: "review",
  IN_REVIEW: "review",
  KYC_PENDING: "review",
  SUBMITTED: "review",
  COMPLETED: "posted",
  COMPLETE: "posted",
  SUCCESS: "posted",
  SUCCEEDED: "posted",
  PAID: "posted",
  POSTED: "posted",
  ACTIVE: "posted",
  PROCESSED: "posted",
  VERIFIED: "posted",
  APPROVED: "posted",
  RESOLVED: "posted",
  DELIVERED: "posted",
  MATCHED: "posted",
  REVERSED: "reversed",
  REFUNDED: "reversed",
  FAILED: "failed",
  DECLINED: "failed",
  REJECTED: "failed",
  ERROR: "failed",
  CANCELLED: "muted",
  CANCELED: "muted",
  SUSPENDED: "suspended",
  FROZEN: "suspended",
  LOCKED: "suspended",
  BLOCKED: "suspended",
  EXPIRED: "muted",
  REVOKED: "muted",
  CLOSED: "muted",
  INACTIVE: "muted",
  DISABLED: "muted",
};

const labelByStatus: Record<string, string> = {
  AWAITING_AGENT: "Awaiting agent",
  PENDING_REPROCESS: "Reprocess pending",
  PENDING_REVIEW: "Under review",
  UNDER_REVIEW: "Under review",
  REVIEW: "Under review",
  IN_REVIEW: "Under review",
  MORE_INFO_REQUIRED: "More info needed",
  KYC_PENDING: "Verification pending",
  COMPLETED: "Posted",
  COMPLETE: "Posted",
  SUCCESS: "Posted",
  SUCCEEDED: "Posted",
  POSTED: "Posted",
};

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return "muted";
  return toneByStatus[status.toUpperCase().replace(/[\s-]+/g, "_")] ?? "muted";
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  const key = status.toUpperCase().replace(/[\s-]+/g, "_");
  if (labelByStatus[key]) return labelByStatus[key];
  const words = key.toLowerCase().split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const toneClass: Record<StatusTone, string> = {
  pending: "bg-status-pending-bg text-status-pending-fg",
  review: "bg-status-review-bg text-status-review-fg",
  posted: "bg-status-posted-bg text-status-posted-fg",
  reversed: "bg-status-reversed-bg text-status-reversed-fg",
  failed: "bg-status-failed-bg text-status-failed-fg",
  suspended: "bg-surface-2 text-status-failed-fg",
  muted: "bg-surface-2 text-ink-2",
};

function ToneShape({ tone }: { tone: StatusTone }) {
  const common = { width: 10, height: 10, viewBox: "0 0 10 10", "aria-hidden": true as const, className: "shrink-0" };
  switch (tone) {
    case "pending":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "review":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 1.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor" />
        </svg>
      );
    case "posted":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="4" fill="currentColor" />
        </svg>
      );
    case "reversed":
      return (
        <svg {...common}>
          <path d="M3.5 1.5 1 4l2.5 2.5M1.3 4H6a3 3 0 0 1 0 6H4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "failed":
      return (
        <svg {...common}>
          <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "suspended":
      return (
        <svg {...common}>
          <rect x="1.5" y="4.5" width="7" height="5" rx="1" fill="currentColor" />
          <path d="M3 4.5V3.2a2 2 0 0 1 4 0v1.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M2 5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}

/** One status chip for every app surface. Pass the raw API status. */
export function StatusBadge({
  status,
  label,
  tone,
  className = "",
}: {
  status?: string | null;
  label?: string;
  tone?: StatusTone;
  className?: string;
}) {
  const t = tone ?? statusTone(status);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ${toneClass[t]} ${className}`}
    >
      <ToneShape tone={t} />
      <span className="truncate">{label ?? statusLabel(status)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Money and references                                                 */
/* ------------------------------------------------------------------ */

export function formatAmount(amount: number | string | null | undefined, currency?: string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const body = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return currency ? `${currency} ${body}` : body;
}

/** Amount with tabular figures and a visible currency. */
export function Money({
  amount,
  currency,
  sign,
  className = "",
}: {
  amount: number | string | null | undefined;
  currency?: string;
  sign?: "+" | "−" | "";
  className?: string;
}) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {sign ?? ""}
      {formatAmount(amount, currency)}
    </span>
  );
}

export function CopyButton({ value, label = "Copy", className = "" }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink ${className}`}
      aria-label={copied ? "Copied" : `${label} ${value}`}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

/** The reference stamp: status shape, label, reference in mono. */
export function ReferenceStamp({ status, reference }: { status?: string; reference: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {status ? <StatusBadge status={status} /> : null}
      <code className="font-mono text-xs text-ink-2">{reference}</code>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons and form fields                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariant: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-on hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-status-failed-fg text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  busyLabel,
  icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  busyLabel?: string;
  icon?: IconName;
}) {
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-[52px] px-5 text-base" };
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,color,border-color,opacity,transform] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizes[size]} ${buttonVariant[variant]} ${className}`}
    >
      {busy ? <Spinner /> : icon ? <Icon name={icon} size={size === "sm" ? 16 : 18} /> : null}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const fieldClass =
  "h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-accent-ink focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-60 aria-[invalid=true]:border-status-failed-fg";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-3">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-status-failed-fg" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page structure                                                       */
/* ------------------------------------------------------------------ */

/** Functional page title: what this view is, one line of context, one action. */
export function PageHeading({
  title,
  description,
  action,
  as: As = "h1",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <As className="text-2xl font-semibold leading-8 text-ink md:text-xl md:leading-7">{title}</As>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-ink-2">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Loading, empty, error                                                */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-9 w-9 rounded-row" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${55 + ((i * 17) % 30)}%` }} />
            <Skeleton className="h-3" style={{ width: `${30 + ((i * 11) % 25)}%` }} />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  icon = "inbox",
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-card bg-surface-2 text-ink-2">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      {children ? <p className="mt-1 max-w-sm text-sm text-ink-2">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Data failed to load. Shows what happened and a Retry; never falls back to sample data. */
export function ErrorState({
  title = "We couldn't load this",
  error,
  onRetry,
  retrying = false,
}: {
  title?: string;
  error?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-card bg-status-failed-bg text-status-failed-fg">
        <Icon name="alert" size={24} />
      </span>
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-2">
        {friendlyError(error)}
      </p>
      {onRetry ? (
        <Button variant="secondary" icon="refresh" className="mt-4" onClick={onRetry} busy={retrying} busyLabel="Retrying">
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function friendlyError(error?: string | null) {
  if (!error) return "Something went wrong. Try again in a moment.";
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(error)) {
    return "Sutura's servers didn't respond. Check your connection; if the service is starting up this can take up to a minute.";
  }
  return error;
}

export function InlineAlert({
  tone = "error",
  title,
  children,
  action,
}: {
  tone?: "error" | "info" | "success" | "warning";
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const cls = {
    error: "border-status-failed-fg/30 bg-status-failed-bg text-status-failed-fg",
    info: "border-status-review-fg/30 bg-status-review-bg text-status-review-fg",
    success: "border-status-posted-fg/30 bg-status-posted-bg text-status-posted-fg",
    warning: "border-status-pending-fg/30 bg-status-pending-bg text-status-pending-fg",
  }[tone];
  const icon: IconName = tone === "error" || tone === "warning" ? "alert" : tone === "success" ? "check-circle" : "info";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-row border px-3 py-3 text-sm ${cls}`}>
      <Icon name={icon} size={18} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer: side panel on desktop, bottom sheet on phones                */
/* ------------------------------------------------------------------ */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sutura-drawer"
      style={{ ["--drawer-width" as string]: `${width}px` }}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className="flex max-h-[88dvh] flex-col rounded-t-panel border border-line bg-surface shadow-pop md:h-full md:max-h-none md:rounded-none md:border-y-0 md:border-r-0">
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {subtitle ? <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="x" size={18} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <footer
              className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {footer}
            </footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** Definition list used in drawers, reviews and receipts. */
export function DetailList({ items }: { items: { label: string; value: ReactNode; emphasis?: boolean }[] }) {
  return (
    <dl className="divide-y divide-line rounded-row border border-line">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
          <dt className="text-ink-2">{item.label}</dt>
          <dd className={`min-w-0 text-right tabular-nums ${item.emphasis ? "text-base font-semibold text-ink" : "text-ink"}`}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts: success and info; errors stay longer and are dismissible     */
/* ------------------------------------------------------------------ */

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: ReactNode; tone: ToastTone };
const ToastContext = createContext<((message: ReactNode, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback((message: ReactNode, tone: ToastTone = "success") => {
    const id = next.current++;
    setToasts((list) => [...list.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 8000 : 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100001] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink shadow-pop"
          >
            <span
              className={
                t.tone === "error" ? "text-status-failed-fg" : t.tone === "info" ? "text-status-review-fg" : "text-status-posted-fg"
              }
            >
              <Icon name={t.tone === "error" ? "alert" : t.tone === "info" ? "info" : "check-circle"} size={18} />
            </span>
            <span className="min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              className="-m-1 grid h-7 w-7 place-items-center rounded-control text-ink-3 hover:bg-surface-2 hover:text-ink"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) ?? (() => undefined);
}

/* ------------------------------------------------------------------ */
/* Theme                                                                */
/* ------------------------------------------------------------------ */

export type ThemeChoice = "auto" | "light" | "dark";

export function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [theme, setThemeState] = useState<ThemeChoice>("auto");
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") setThemeState(current);
  }, []);
  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try {
      if (t === "auto") localStorage.removeItem("sutura_theme");
      else localStorage.setItem("sutura_theme", t);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
  }, []);
  return [theme, setTheme];
}

/** Light / Dark / System segmented control. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const options: { id: ThemeChoice; label: string; icon: IconName }[] = [
    { id: "light", label: "Light", icon: "sun" },
    { id: "dark", label: "Dark", icon: "moon" },
    { id: "auto", label: "System", icon: "monitor" },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className={`inline-flex rounded-control border border-line bg-surface-2 p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={theme === o.id}
          title={o.label}
          onClick={() => setTheme(o.id)}
          className={`grid h-8 w-8 place-items-center rounded-[6px] transition-colors ${
            theme === o.id ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink"
          }`}
        >
          <Icon name={o.icon} size={16} />
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data loading                                                         */
/* ------------------------------------------------------------------ */

export type Resource<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => Promise<void>;
  loadedAt: number | null;
};

/**
 * Loads data with explicit loading / error / refreshing states.
 * `data` stays null until the API answers; there is no sample fallback.
 */
export function useApiResource<T>(load: (() => Promise<T>) | null, deps: unknown[] = []): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(load));
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);

  const run = useCallback(async (isRefresh: boolean) => {
    const fn = loadRef.current;
    if (!fn) {
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (id !== seq.current) return;
      setData(result);
      setLoadedAt(Date.now());
    } catch (err) {
      if (id !== seq.current) return;
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(true), [run]);
  return { data, error, loading, refreshing, reload, loadedAt };
}

/** "Updated 12s ago" for data that is actually refreshed. */
export function UpdatedAgo({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);
  if (!at) return null;
  const s = Math.max(0, Math.round((now - at) / 1000));
  const text = s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
  return <span className="text-xs text-ink-3">Updated {text}</span>;
}

/* ------------------------------------------------------------------ */
/* URL per view                                                         */
/* ------------------------------------------------------------------ */

/**
 * Keeps the current view in `?view=` so refresh, back and shared links land on
 * the same section. Uses the History API directly (no Suspense boundary needed).
 */
export function useViewParam<T extends string>(allowed: readonly T[], fallback: T, param = "view"): [T, (v: T) => void] {
  const read = useCallback((): T => {
    if (typeof window === "undefined") return fallback;
    const v = new URLSearchParams(window.location.search).get(param) as T | null;
    return v && allowed.includes(v) ? v : fallback;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, fallback, allowed.join("|")]);
  const [view, setViewState] = useState<T>(fallback);
  useEffect(() => {
    setViewState(read());
    const onPop = () => setViewState(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [read]);
  const setView = useCallback(
    (v: T) => {
      setViewState(v);
      const url = new URL(window.location.href);
      if (v === fallback) url.searchParams.delete(param);
      else url.searchParams.set(param, v);
      window.history.pushState(null, "", url.toString());
    },
    [fallback, param],
  );
  return [view, setView];
}

/* ------------------------------------------------------------------ */
/* Idempotency                                                          */
/* ------------------------------------------------------------------ */

export function newIdempotencyKey(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

/**
 * One idempotency key per attempt. The key is created when the person reviews
 * a payment and is reused if they press Confirm again after a failure or
 * timeout, so the server can deduplicate. Call `reset()` after success or when
 * the payment details change. Failed writes are never replayed automatically.
 */
export function useIdempotencyKey(prefix: string) {
  const ref = useRef<string | null>(null);
  const get = useCallback(() => {
    if (!ref.current) ref.current = newIdempotencyKey(prefix);
    return ref.current;
  }, [prefix]);
  const reset = useCallback(() => {
    ref.current = null;
  }, []);
  return { get, reset };
}

export function formatDateTime(value: string | number | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
