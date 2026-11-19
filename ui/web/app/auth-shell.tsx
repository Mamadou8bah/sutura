"use client";

import { useId, useState } from "react";
import { StatusBadge } from "./components/ui";

type AuthShellProps = {
  heading: string;
  description?: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
};

export function AuthShell({ heading, description, children, footerText, footerLinkLabel, footerLinkHref }: AuthShellProps) {
  return (
    <main id="main" className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <div className="mx-auto grid min-h-screen w-full max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:px-8">
        <section className="flex w-full flex-col px-4 pb-10 pt-6 sm:px-8 lg:px-0 lg:py-10">
          <a href="/" className="inline-flex w-fit items-center gap-2 rounded-control" aria-label="Sutura home">
            <img src="/brand/sutura-logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-lg font-semibold text-ink">Sutura</span>
          </a>

          <div className="mt-10 w-full max-w-[400px] sm:mx-auto lg:mx-0 lg:mt-20">
            <h1 className="text-2xl font-semibold leading-8 text-ink">{heading}</h1>
            {description ? <p className="mt-2 text-sm leading-6 text-ink-2">{description}</p> : null}
            {children}
          </div>

          {footerText && footerLinkHref && footerLinkLabel ? (
            <p className="mt-8 w-full max-w-[400px] text-sm text-ink-2 sm:mx-auto lg:mx-0">
              {footerText}{" "}
              <a href={footerLinkHref} className="font-semibold text-accent-ink underline underline-offset-2">
                {footerLinkLabel}
              </a>
            </p>
          ) : null}
        </section>

        <aside aria-hidden="true" className="hidden items-center lg:flex">
          <div className="w-full rounded-panel border border-line bg-surface-2 p-8">
            <p className="text-sm text-ink-2">Every payment ends with a receipt like this one.</p>
            <div className="mt-4 rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Sent to Awa Jallow</p>
                  <p className="text-xs text-ink-3">Wallet transfer · No fee</p>
                </div>
                <p className="text-lg font-semibold text-ink tabular-nums">GMD 1,200.00</p>
              </div>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs tabular-nums">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Debit · Your wallet</dt>
                  <dd>1,200.00</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Credit · Recipient wallet</dt>
                  <dd>1,200.00</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge status="POSTED" />
                <code className="font-mono text-xs text-ink-2">TXN-2026-004182</code>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-3">Example receipt. Names and amounts are illustrative.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

const authInputClass =
  "h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-ink-3 transition-colors focus:border-accent-ink disabled:opacity-60 sm:text-sm";

export function AuthField({
  label,
  type,
  value,
  onChange,
  name,
  autoComplete,
  required = true,
  disabled,
  hint,
  inputMode,
  placeholder,
}: {
  label: string;
  type: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          className={`${authInputClass} ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            {visible ? (
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M7.4 7.6C4.4 9.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M10.5 5.6c.5-.1 1-.1 1.5-.1 6 0 9.5 6.5 9.5 6.5s-.7 1.3-2 2.8" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export { authInputClass };
