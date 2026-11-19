"use client";

import { useMemo, useState } from "react";
import { EmptyState, ErrorState, Icon, SkeletonRows } from "../components/ui";
import { DashboardToolbar } from "./dashboard-toolbar";
import { downloadCsv, matchesSearch, paginate, type DateRangeKey } from "./dashboard-utils";
import { PanelCard } from "./dashboard-shell";

export type DataColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string;
  searchValue?: (row: T) => string;
  /** Right-align numbers and money (tabular figures). */
  align?: "left" | "right" | "center";
  /** Makes the column header a sort button. */
  sortValue?: (row: T) => string | number;
  /** Hide below 640px. */
  hideOnMobile?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  rows,
  exportFilename,
  searchPlaceholder = "Search",
  pageSize = 8,
  dateKey,
  action,
  rowKey,
  onRowClick,
  rowLabel,
  selectedKey,
  loading = false,
  error = null,
  onRetry,
  onRefresh,
  refreshing = false,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  headingLevel = "h2",
}: {
  title: string;
  subtitle?: string;
  columns: DataColumn<T>[];
  rows: T[];
  exportFilename: string;
  searchPlaceholder?: string;
  pageSize?: number;
  dateKey?: keyof T;
  action?: React.ReactNode;
  rowKey?: (row: T) => string;
  /** Opens the row's detail (drawer). Rows become keyboard-focusable. */
  onRowClick?: (row: T) => void;
  /** Accessible name for a clickable row, e.g. "Open payment TXN-1". */
  rowLabel?: (row: T) => string;
  selectedKey?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Refetch from the API. Without it, the Refresh button is hidden. */
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  headingLevel?: "h1" | "h2";
}) {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const filtered = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const list = rows.filter((row) => {
      const searchValues = columns.flatMap((col) => {
        if (col.searchValue) return [col.searchValue(row)];
        const val = row[col.key];
        return [typeof val === "string" || typeof val === "number" ? val : ""];
      });
      if (!matchesSearch(search, searchValues)) return false;

      if (dateKey && row[dateKey]) {
        const raw = String(row[dateKey]);
        if (new Date(raw).getTime() < cutoff) return false;
      }
      return true;
    });

    if (!sort) return list;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return list;
    const value = col.sortValue;
    return [...list].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, columns, search, dateRange, dateKey, sort]);

  const { items, page: safePage, totalPages, total } = paginate(filtered, page, pageSize);
  const filtersActive = search.trim() !== "" || (Boolean(dateKey) && dateRange !== "90d");

  function handleDownload() {
    const headers = columns.map((c) => c.label);
    const csvRows = filtered.map((row) =>
      columns.map((col) => (col.exportValue ? col.exportValue(row) : String(row[col.key] ?? ""))),
    );
    downloadCsv(exportFilename, headers, csvRows);
  }

  function clearFilters() {
    setSearch("");
    setDateRange("90d");
    setPage(1);
  }

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right tabular-nums" : a === "center" ? "text-center" : "text-left";

  let body: React.ReactNode;
  if (error && rows.length === 0) {
    body = <ErrorState title={`Couldn't load ${title.toLowerCase()}`} error={error} onRetry={onRetry ?? onRefresh} retrying={refreshing} />;
  } else if (loading && rows.length === 0) {
    body = <SkeletonRows rows={5} label={`Loading ${title.toLowerCase()}`} />;
  } else if (rows.length === 0) {
    body = (
      <EmptyState title={emptyTitle} action={emptyAction}>
        {emptyDescription}
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        title="No results"
        icon="search"
        action={
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-accent-ink underline underline-offset-2">
            Clear search and filters
          </button>
        }
      >
        Nothing in {title.toLowerCase()} matches these filters.
      </EmptyState>
    );
  } else {
    body = (
      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="min-w-full border-collapse text-left text-[13px] leading-[18px] tabular-nums">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-y border-line bg-surface-2/60 text-xs text-ink-2">
              {columns.map((col) => {
                const sorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={sorted ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                    className={`h-9 whitespace-nowrap px-3 font-medium first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5 ${alignClass(col.align)} ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 rounded hover:text-ink ${col.align === "right" ? "flex-row-reverse" : ""}`}
                        onClick={() => {
                          setPage(1);
                          setSort((s) => (s?.key === col.key ? (s.dir === 1 ? { key: col.key, dir: -1 } : null) : { key: col.key, dir: 1 }));
                        }}
                      >
                        {col.label}
                        <Icon
                          name={sorted && sort.dir === -1 ? "chevron-up" : "chevron-down"}
                          size={14}
                          className={sorted ? "opacity-100" : "opacity-35"}
                        />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((row, i) => {
              const key = rowKey ? rowKey(row) : String(row.id ?? row.reference ?? `${safePage}-${i}`);
              const selected = selectedKey != null && selectedKey === key;
              return (
                <tr
                  key={key}
                  className={`h-10 transition-colors ${onRowClick ? "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2" : ""} ${selected ? "bg-accent-tint" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-ink first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5 ${alignClass(col.align)} ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <PanelCard title={title} subtitle={subtitle} action={action} headingLevel={headingLevel}>
      {rows.length > 0 || error || onRefresh ? (
        <DashboardToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchLabel={`Search ${title.toLowerCase()}`}
          searchPlaceholder={searchPlaceholder}
          dateRange={dateKey ? dateRange : undefined}
          onDateRangeChange={
            dateKey
              ? (v) => {
                  setDateRange(v);
                  setPage(1);
                }
              : undefined
          }
          onDownload={rows.length > 0 ? handleDownload : undefined}
          onRefresh={onRefresh}
          refreshing={refreshing}
          resultCount={rows.length > 0 ? total : undefined}
        />
      ) : null}
      {error && rows.length > 0 ? (
        <p role="alert" className="mb-3 text-sm text-status-failed-fg">
          Showing the last loaded data. Refresh failed: {error}
        </p>
      ) : null}
      {body}
      {totalPages > 1 && filtered.length > 0 ? (
        <nav aria-label={`${title} pages`} className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-ink-2 tabular-nums">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-control border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevron-left" size={16} />
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-control border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </nav>
      ) : null}
    </PanelCard>
  );
}
