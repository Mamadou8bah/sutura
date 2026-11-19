"use client";

/**
 * Small SVG charts for dashboards. Colours come from theme tokens so they work
 * in light and dark: one series = accent (or neutral ink), categorical data uses
 * the status tones. Every chart is role="img" with a text summary.
 * Charts must be fed real API data; never pass sample series.
 */

import { useId } from "react";

export type ChartPoint = { label: string; value: number };

const SERIES = "rgb(var(--accent))";
const GRID = "rgb(var(--line))";
const AXIS = "rgb(var(--ink-3))";
const INK = "rgb(var(--ink))";
/** Categorical fallback: status tones, never a rainbow. */
const CATEGORY = [
  "rgb(var(--posted-fg))",
  "rgb(var(--pending-fg))",
  "rgb(var(--failed-fg))",
  "rgb(var(--review-fg))",
  "rgb(var(--reversed-fg))",
  "rgb(var(--ink-3))",
];

function summarise(data: { label: string; value: number }[], prefix = "", suffix = "") {
  return data.map((d) => `${d.label} ${prefix}${d.value.toLocaleString()}${suffix}`).join(", ");
}

export function LineAreaChart({
  data,
  height = 220,
  color = SERIES,
  fillColor,
  valuePrefix = "",
  valueSuffix = "",
  label = "Line chart",
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  fillColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  label?: string;
}) {
  const clipId = useId().replace(/:/g, "");
  const width = 560;
  const pad = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: pad.top + innerH - (d.value / max) * innerH,
    ...d,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${pad.top + innerH} L ${points[0]?.x ?? pad.left} ${pad.top + innerH} Z`;
  const yTicks = [0, 0.5, 1].map((t) => ({ y: pad.top + innerH - t * innerH, label: Math.round(t * max).toLocaleString() }));

  return (
    <figure className="w-full max-w-full overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${label}: ${summarise(data, valuePrefix, valueSuffix)}`}
      >
        <clipPath id={clipId}>
          <rect x={pad.left} y={pad.top} width={innerW} height={innerH} />
        </clipPath>
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke={GRID} strokeWidth="1" />
            <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" fontSize="12" fill={AXIS} style={{ fontVariantNumeric: "tabular-nums" }}>
              {valuePrefix}
              {tick.label}
              {valueSuffix}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          <path d={areaPath} fill={fillColor ?? color} fillOpacity={fillColor ? 1 : 0.12} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {points.map((p) => (
          <text key={`${p.label}-x`} x={p.x} y={height - 8} textAnchor="middle" fontSize="12" fill={AXIS}>
            {p.label}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export function BarChart({
  data,
  height = 200,
  valuePrefix = "",
  label = "Bar chart",
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  valuePrefix?: string;
  label?: string;
}) {
  const width = 560;
  const pad = { top: 24, right: 8, bottom: 32, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barGap = 12;
  const barW = Math.max(8, (innerW - barGap * (data.length - 1)) / Math.max(data.length, 1));

  return (
    <figure className="w-full max-w-full overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${label}: ${summarise(data, valuePrefix)}`}
      >
        <line x1={pad.left} y1={pad.top + innerH} x2={width - pad.right} y2={pad.top + innerH} stroke={GRID} />
        {data.map((d, i) => {
          const barH = d.value > 0 ? Math.max(2, (d.value / max) * innerH) : 0;
          const x = pad.left + i * (barW + barGap);
          const y = pad.top + innerH - barH;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={barH} rx="4" fill={d.color ?? SERIES} />
              <text
                x={x + barW / 2}
                y={Math.max(pad.top - 6, y - 6)}
                textAnchor="middle"
                fontSize="12"
                fill={INK}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {valuePrefix}
                {d.value.toLocaleString()}
              </text>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="12" fill={AXIS}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function DonutChart({
  data,
  size = 160,
  label = "Breakdown",
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  label?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const safeTotal = total || 1;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const stroke = size * 0.13;
  let angle = -90;

  const arcs = data.map((d, i) => {
    const sweep = Math.min(359.99, (d.value / safeTotal) * 360);
    const start = angle;
    angle += sweep;
    const startRad = (start * Math.PI) / 180;
    const endRad = (angle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
    return { ...d, color: d.color ?? CATEGORY[i % CATEGORY.length], path, pct: Math.round((d.value / safeTotal) * 100) };
  });

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto shrink-0 sm:mx-0"
        role="img"
        aria-label={`${label}: ${arcs.map((a) => `${a.label} ${a.value} (${a.pct}%)`).join(", ")}`}
      >
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={GRID} strokeWidth={stroke} />
        {total > 0
          ? arcs.map((a) => <path key={a.label} d={a.path} fill="none" stroke={a.color} strokeWidth={stroke} />)
          : null}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="16" fontWeight="600" fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>
          {total.toLocaleString()}
        </text>
      </svg>
      <ul className="w-full min-w-0 space-y-2 sm:max-w-[12rem]">
        {arcs.map((a) => (
          <li key={a.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} aria-hidden="true" />
              <span className="truncate">{a.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {a.value.toLocaleString()} <span className="text-ink-3">· {a.pct}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** @deprecated Sparklines were removed from KPI tiles in the redesign. Kept only for compatibility; renders nothing. */
export function Sparkline(_props: { values: number[]; color?: string }) {
  void _props;
  return null;
}

/**
 * Flat charcoal summary card (the "money figure" moment). No gradient, no
 * invented progress: the bar only renders when a real `progress` is passed.
 */
export function DashboardHeroCard({
  label,
  value,
  hint,
  footerLeft,
  footerRight,
  progress,
  progressLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  footerLeft?: string;
  footerRight?: string;
  progress?: number;
  progressLabel?: string;
}) {
  return (
    <section className="rounded-card bg-charcoal-card p-5 text-[#f2f2f7] sm:p-6">
      <p className="text-sm text-[#c7c7cc]">{label}</p>
      <p className="mt-1 text-[40px] font-medium leading-[44px] tracking-[-0.02em] tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#c7c7cc]">{hint}</p> : null}
      {footerLeft || footerRight ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          {footerLeft ? <span className="font-medium">{footerLeft}</span> : <span />}
          {footerRight ? <span className="text-[#c7c7cc]">{footerRight}</span> : null}
        </div>
      ) : null}
      {typeof progress === "number" ? (
        <>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel ?? label}
          >
            <div className="h-full rounded-full bg-[#f97316]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          {progressLabel ? <p className="mt-2 text-xs text-[#c7c7cc]">{progressLabel}</p> : null}
        </>
      ) : null}
    </section>
  );
}
