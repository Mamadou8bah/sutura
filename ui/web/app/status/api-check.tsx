"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../lib/api-base";
import { Button, StatusBadge } from "../components/ui";

type CheckState =
  | { phase: "checking" }
  | { phase: "up"; at: number; ms: number }
  | { phase: "down"; at: number; detail: string };

/** One honest check from this browser to the API health endpoint. Not a monitoring service. */
export function ApiHealthCheck() {
  const [state, setState] = useState<CheckState>({ phase: "checking" });

  const run = useCallback(async () => {
    setState({ phase: "checking" });
    const started = performance.now();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_BASE}/actuator/health`, { signal: controller.signal, cache: "no-store" });
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      if (res.ok && (!body?.status || body.status === "UP")) {
        setState({ phase: "up", at: Date.now(), ms: Math.round(performance.now() - started) });
      } else {
        setState({ phase: "down", at: Date.now(), detail: `The API answered with status ${body?.status ?? res.status}.` });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setState({
        phase: "down",
        at: Date.now(),
        detail: aborted
          ? "No answer within 20 seconds. The server may be starting up."
          : "The API could not be reached from this browser.",
      });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const time = (at: number) => new Intl.DateTimeFormat("en-GB", { timeStyle: "medium" }).format(at);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-ink">Sutura API</span>
          {state.phase === "checking" ? (
            <StatusBadge tone="pending" label="Checking" />
          ) : state.phase === "up" ? (
            <StatusBadge tone="posted" label="Reachable" />
          ) : (
            <StatusBadge tone="failed" label="Unreachable" />
          )}
        </div>
        <p className="mt-1 text-sm text-ink-2 tabular-nums">
          {state.phase === "checking"
            ? "Contacting the API health endpoint."
            : state.phase === "up"
              ? `Answered in ${state.ms} ms at ${time(state.at)}.`
              : `${state.detail} Checked at ${time(state.at)}.`}
        </p>
      </div>
      <Button variant="secondary" icon="refresh" onClick={() => void run()} busy={state.phase === "checking"} busyLabel="Checking">
        Check again
      </Button>
    </div>
  );
}
