"use client";

import { useId } from "react";
import { Icon, Spinner } from "../components/ui";
import { DATE_RANGE_OPTIONS, type DateRangeKey } from "./dashboard-utils";
import { inputClass, selectClass } from "./dashboard-shell";

export function DashboardToolbar({
  search,
  onSearchChange,
  searchLabel = "Search",
  searchPlaceholder = "Search",
  dateRange,
  onDateRangeChange,
  onDownload,
  onRefresh,
  refreshing = false,
  resultCount,
  children,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  dateRange?: DateRangeKey;
  onDateRangeChange?: (value: DateRangeKey) => void;
  onDownload?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  resultCount?: number;
  children?: React.ReactNode;
}) {
  const searchId = useId();
  const rangeId = useId();
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange ? (
        <div className="relative w-full min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </label>
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            id={searchId}
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={`${inputClass} h-9 pl-9`}
          />
        </div>
      ) : null}

      {onDateRangeChange ? (
        <div>
          <label htmlFor={rangeId} className="sr-only">
            Date range
          </label>
          <select
            id={rangeId}
            value={dateRange ?? "30d"}
            onChange={(e) => onDateRangeChange(e.target.value as DateRangeKey)}
            className={`${selectClass} h-9 w-full sm:w-auto`}
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {children}

      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        {typeof resultCount === "number" ? (
          <span className="mr-1 text-xs text-ink-2 tabular-nums" aria-live="polite">
            {resultCount} result{resultCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
          >
            {refreshing ? <Spinner size={14} /> : <Icon name="refresh" size={16} />}
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        ) : null}
        {onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <Icon name="download" size={16} />
            CSV
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** KPI tile. Pass `onClick` to make it open the matching filtered list. No sparklines or invented trends. */
export function KpiCard({
  label,
  value,
  change,
  changePositive,
  sparkline,
  onClick,
  loading = false,
}: {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  /** @deprecated sparklines were removed in the redesign; ignored. */
  sparkline?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) {
  void sparkline;
  void changePositive;
  const inner = (
    <>
      <p className="text-sm text-ink-2">{label}</p>
      {loading ? (
        <span className="skeleton mt-2 h-7 w-24" aria-hidden="true" />
      ) : (
        <p className="mt-1 text-[28px] font-medium leading-8 text-ink tabular-nums">{value}</p>
      )}
      {change ? <p className="mt-1 text-xs text-ink-3">{change}</p> : null}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group rounded-card border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong hover:bg-surface-2"
      >
        {inner}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-ink">
          View list <Icon name="chevron-right" size={14} />
        </span>
      </button>
    );
  }
  return <article className="rounded-card border border-line bg-surface p-4 shadow-card">{inner}</article>;
}
