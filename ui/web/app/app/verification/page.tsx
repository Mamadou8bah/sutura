"use client";

import Link from "next/link";
import { KycConnectionPending } from "../../../lib/kyc-warmup";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import { getMerchantTokenSession } from "../../../lib/merchant-api";
import { kycApi, type KycStatus } from "../../../lib/kyc-api";
import { Button, ErrorState, Icon, Skeleton, StatusBadge, type StatusTone } from "../../components/ui";

const descriptions: Record<KycStatus["status"], string> = {
  NOT_STARTED: "Verify your identity with an identity document and a face and liveness check.",
  PENDING: "Your verification is in progress. Finish the steps on the verification page, then come back here.",
  EXPIRED: "Your verification link has expired. Start again to get a new link.",
  VERIFIED: "Your identity has been verified.",
  FLAGGED: "Your verification needs a manual review. Check back later for the result.",
  REJECTED: "We couldn't verify your identity. Try again with a clear photo of a valid document.",
};

const kycBadge: Record<KycStatus["status"], { label: string; tone: StatusTone }> = {
  NOT_STARTED: { label: "Not started", tone: "muted" },
  PENDING: { label: "In progress", tone: "pending" },
  EXPIRED: { label: "Expired", tone: "muted" },
  VERIFIED: { label: "Verified", tone: "posted" },
  FLAGGED: { label: "Under review", tone: "review" },
  REJECTED: { label: "Not verified", tone: "failed" },
};

export default function VerificationPage() {
  const router = useRouter();
  const [record, setRecord] = useState<KycStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState("");
  const request = useRef<AbortController | null>(null);
  const [back, setBack] = useState("/app");

  useEffect(() => {
    document.title = "Verify your identity · Sutura";
    const auth = getAuthSession();
    const merchant = getMerchantTokenSession();
    if (!auth?.accessToken && !merchant) {
      router.replace("/login");
      return;
    }
    if (auth?.accessToken && auth.role !== "customer" && auth.role !== "merchant" && auth.role !== "developer") {
      router.replace("/dashboard");
      return;
    }
    setBack(auth?.role === "customer" ? "/app?view=profile" : "/dashboard");
    let active = true;
    const controller = new AbortController(); request.current = controller;
    const options = { signal: controller.signal, deadline: Date.now() + 180000, onRetry: () => { if (active) setConnecting(true); } };
    kycApi
      .status(options)
      .then(async (local) => {
        if (active) setRecord(local);
        return local.status === "PENDING" && local.sessionId && local.sessionId > 0 ? await kycApi.refresh(options) : local.status === "NOT_STARTED" ? await kycApi.start(options) : local;
      })
      .then((value) => {
        if (active) setRecord(value);
      })
      .catch((err) => {
        if (active) { if (err instanceof KycConnectionPending) setConnectionNotice(err.message); else setError(err instanceof Error ? err.message : "Could not load verification"); }
      })
      .finally(() => {
        if (active) { setBusy(false); setConnecting(false); }
      });
    return () => {
      active = false; request.current?.abort();
    };
  }, [router]);

  // While pending, re-check every 30s when the tab is visible, and on focus.
  useEffect(() => {
    if (record?.status !== "PENDING" || busy || connectionNotice) return;
    let running = false;
    let stopped = false;
    const pollController = new AbortController();
    const refresh = async () => {
      if (running || stopped || document.visibilityState !== "visible") return;
      running = true;
      try {
        const value = await kycApi.refresh({ signal: pollController.signal, onRetry: () => { if (!stopped) setConnecting(true); } });
        if (!stopped) {
          setRecord(value);
          setError(null);
        }
      } catch (err) {
        if (!stopped) { if (err instanceof KycConnectionPending) setConnectionNotice(err.message); else setError(err instanceof Error ? err.message : "Could not refresh verification"); }
      } finally {
        running = false; if (!stopped) setConnecting(false);
      }
    };
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true; pollController.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [record?.status, busy, connectionNotice]);

  async function run(action: "start" | "refresh" | "status") {
    if (busy) return;
    request.current?.abort();
    setBusy(true); setError(null); setConnectionNotice(""); setConnecting(false);
    const controller = new AbortController(); request.current = controller;
    const current = () => request.current === controller && !controller.signal.aborted;
    try {
      const value = await kycApi[action]({ signal: controller.signal, deadline: Date.now() + 180000, onRetry: () => { if (current()) setConnecting(true); } });
      if (current()) setRecord(value);
    } catch (err) {
      if (current()) { if (err instanceof KycConnectionPending) setConnectionNotice(err.message); else setError(err instanceof Error ? err.message : "Verification is unavailable"); }
    } finally {
      if (current()) { setBusy(false); setConnecting(false); }
    }
  }

  const canStart = record && ["NOT_STARTED", "EXPIRED", "REJECTED"].includes(record.status);
  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink sm:py-16">
      <div className="mx-auto max-w-md">
        <Link
          href={back}
          className="-ml-2 inline-flex h-9 items-center gap-1 rounded-control px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="chevron-left" size={18} />
          Back to your account
        </Link>
        <section className="mt-4 rounded-panel border border-line bg-surface p-5 shadow-card sm:p-6">
          <h1 className="text-2xl font-semibold leading-8">Verify your identity</h1>
          {!record && busy ? (
            <div role="status" aria-label="Loading verification" className="mt-5 space-y-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : null}
          {record ? (
            <div className="mt-5" aria-live="polite">
              <StatusBadge label={kycBadge[record.status].label} tone={kycBadge[record.status].tone} />
              <p className="mt-3 text-sm leading-6 text-ink-2">{descriptions[record.status]}</p>
              {record.explanation ? <p className="mt-2 text-sm text-ink-2">{record.explanation}</p> : null}
            </div>
          ) : null}
          {(connecting || connectionNotice) && <p role="status" className="mt-4 text-sm leading-6 text-ink-2">{connecting ? "Connecting to verification. This can take about a minute. Your status has not changed." : connectionNotice}</p>}
          {!record && connectionNotice && <Button onClick={() => void run("status")} busy={busy}>Try again</Button>}
          {error && !record ? (
            <ErrorState title="We couldn't load your verification" error={error} onRetry={() => void run("status")} retrying={busy} />
          ) : error ? (
            <p className="mt-4 text-sm text-status-failed-fg" role="alert">
              {error}
            </p>
          ) : null}
          {record ? (
            <div className="mt-6 flex flex-col gap-2">
              {canStart ? (
                <Button size="lg" busy={busy} busyLabel="Starting" onClick={() => run("start")}>
                  {record.status === "NOT_STARTED" ? "Start verification" : "Start again"}
                </Button>
              ) : null}
              {record.status === "PENDING" && record.hostedUrl ? (
                <a
                  href={record.hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-control bg-accent px-5 font-semibold text-accent-on hover:bg-accent-hover"
                >
                  Continue verification
                  <Icon name="external" size={18} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
              {record.sessionId ? (
                <Button variant="secondary" size="lg" icon="refresh" busy={busy} busyLabel="Checking" onClick={() => run("refresh")}>
                  Check status
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
