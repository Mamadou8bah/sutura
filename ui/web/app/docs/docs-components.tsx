"use client";

import { useState } from "react";
import type { EndpointDoc, HttpMethod } from "./docs-data";

const methodStyles: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-amber-100 text-amber-900",
  PATCH: "bg-violet-100 text-violet-800",
  DELETE: "bg-rose-100 text-rose-800",
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`inline-flex min-w-[4.25rem] justify-center rounded-md px-2 py-1 font-mono text-xs font-bold tracking-wide ${methodStyles[method]}`}>
      {method}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 border-b border-slate-200 pb-6">
      {eyebrow ? (
        <p className="text-sm text-ink-2">{eyebrow}</p>
      ) : null}
      <h2 className={`font-semibold tracking-[-0.02em] text-ink ${eyebrow ? "mt-2 text-[28px] leading-9" : "text-[28px] leading-9"}`}>
        {title}
      </h2>
      {description ? <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{description}</p> : null}
    </div>
  );
}

export function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-[#1c1c1e] text-[#f2f2f7]">
      <div className="flex items-center justify-between border-b border-[#ffffff1a] px-4 py-2.5">
        <span className="text-xs font-semibold text-[#aeaeb2]">{title}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#c7c7cc] transition-colors hover:bg-[#ffffff1a] hover:text-[#ffffff]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#f2f2f7]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function EndpointTable({ endpoints }: { endpoints: EndpointDoc[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white">
      <div className="hidden grid-cols-[5.5rem_1fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
        <span>Method</span>
        <span>Endpoint</span>
        <span>Description</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {endpoints.map((ep) => (
          <li key={`${ep.method}-${ep.path}`} className="grid gap-3 px-5 py-4 md:grid-cols-[5.5rem_1fr_1.2fr] md:items-center md:gap-4">
            <div>
              <MethodBadge method={ep.method} />
            </div>
            <code className="block break-all font-mono text-sm font-semibold text-slate-900">{ep.path}</code>
            <p className="text-sm leading-relaxed text-slate-600">{ep.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "tip" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-status-review-fg/20 bg-status-review-bg text-slate-800",
    tip: "border-emerald-200 bg-emerald-50 text-slate-800",
    warning: "border-amber-200 bg-amber-50 text-slate-800",
  }[type];

  return (
    <aside className={`rounded-card border px-5 py-4 ${styles}`}>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </aside>
  );
}

export function FeatureGrid({
  items,
}: {
  items: { label: string; value: string; hint: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-card border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500">{item.label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
          <p className="mt-1 text-sm text-slate-600">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
