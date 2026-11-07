"use client";

import { DATE_RANGE_OPTIONS, type DateRangeKey } from "./dashboard-utils";
import { inputClass, selectClass } from "./dashboard-shell";

export function DashboardToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  dateRange,
  onDateRangeChange,
  onDownload,
  onRefresh,
  resultCount,
  children,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  dateRange?: DateRangeKey;
  onDateRangeChange?: (value: DateRangeKey) => void;
  onDownload?: () => void;
  onRefresh?: () => void;
  resultCount?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
      {onSearchChange ? (
        <div className="relative min-w-0 w-full flex-1">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={`${inputClass} pl-10`}
          />
        </div>
      ) : null}

      {onDateRangeChange ? (
        <select
          value={dateRange ?? "30d"}
          onChange={(e) => onDateRangeChange(e.target.value as DateRangeKey)}
          className={`${selectClass} w-full sm:w-auto`}
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : null}

      {children}

      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        {typeof resultCount === "number" ? (
          <span className="text-xs font-semibold text-slate-600">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
        ) : null}
        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="inline-flex h-11 min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-full bg-slate-200 px-4 text-xs font-bold text-slate-800 hover:bg-slate-300 sm:flex-none">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v6h6M20 20v-6h-6" /><path d="M5 19a9 9 0 0 0 14-2M19 5a9 9 0 0 0-14 2" /></svg>
            Refresh
          </button>
        ) : null}
        {onDownload ? (
          <button type="button" onClick={onDownload} className="inline-flex h-11 min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-bold text-slate-950 hover:bg-orange-600 sm:flex-none">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 13l5 5 5-5" /><path d="M5 21h14" /></svg>
            <span className="sm:hidden">CSV</span>
            <span className="hidden sm:inline">Download CSV</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  change,
  changePositive,
  sparkline,
}: {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  sparkline?: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
        {sparkline}
      </div>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {change ? (
        <p className={`mt-1 text-xs font-semibold ${changePositive ? "text-emerald-700" : "text-rose-700"}`}>{change}</p>
      ) : null}
    </article>
  );
}
