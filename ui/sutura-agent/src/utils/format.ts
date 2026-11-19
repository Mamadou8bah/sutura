import type { OperationType } from "../types";
import { statusLabel as toneLabel } from "../components/StatusPill";

/** One money format in all three apps: en-GB grouping, 2 dp (up to 4 when asked), currency code first. */
export function formatMoney(amount: number, currency: string, maximumFractionDigits = 2): string {
  return `${currency} ${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, maximumFractionDigits),
  })}`;
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function operationLabel(type: OperationType): string {
  return type === "DEPOSIT" ? "Cash-in" : "Cash-out";
}

/** Human status label; never a raw enum. See StatusPill for tones. */
export function statusLabel(status: string): string {
  return toneLabel(status);
}
