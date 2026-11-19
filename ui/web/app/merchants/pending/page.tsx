"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "../../auth-shell";
import { Button, fieldClass, InlineAlert, StatusBadge } from "../../components/ui";
import { getMerchantTokenSession } from "../../../lib/merchant-api";
import { getAuthSession } from "../../../lib/auth-session";
import { applicationApi, type ApplicationCorrection, type MerchantApplication } from "../../../lib/merchant-application";

const fields: [keyof ApplicationCorrection, string, number][] = [
  ["businessName", "Business name", 120],
  ["tradingName", "Trading name (optional)", 120],
  ["cityOrArea", "City or area", 80],
  ["streetAddress", "Street address", 255],
  ["businessRegistrationNumber", "Registration number (optional)", 60],
  ["firstName", "Owner first name", 100],
  ["lastName", "Owner last name", 100],
  ["ownerIdNumber", "ID document number", 40],
  ["explanation", "What you changed", 1000],
];

const choices: { field: "category" | "region" | "ownerIdType"; label: string; values: string[] }[] = [
  {
    field: "category",
    label: "Business category",
    values: [
      "RETAIL_SHOP",
      "MARKET_STALL",
      "RESTAURANT_FOOD",
      "SALON_BEAUTY",
      "PHARMACY_HEALTH",
      "HARDWARE_BUILDING",
      "TRANSPORT_LOGISTICS",
      "PROFESSIONAL_SERVICES",
      "ONLINE_ECOMMERCE",
      "OTHER",
    ],
  },
  { field: "region", label: "Region", values: ["BANJUL", "KANIFING", "BRIKAMA", "MANSAKONKO", "KEREWAN", "KUNTAUR", "BASSE"] },
  { field: "ownerIdType", label: "ID document type", values: ["GAMBIAN_NATIONAL_ID", "ECOWAS_PASSPORT", "DRIVERS_LICENSE", "VOTERS_CARD"] },
];

const humanize = (value: string) => {
  const words = value.toLowerCase().split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export default function MerchantPendingPage() {
  const router = useRouter();
  const [application, setApplication] = useState<MerchantApplication | null>(null);
  const [draft, setDraft] = useState<ApplicationCorrection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    const value = await applicationApi.status();
    setApplication(value);
    const merchant = getMerchantTokenSession();
    const auth = getAuthSession();
    if (merchant) {
      localStorage.setItem(
        "sutura_merchant_session",
        JSON.stringify({ ...merchant, userStatus: value.userStatus, businessName: value.businessName }),
      );
    } else if (auth?.role === "merchant") {
      localStorage.setItem("sutura_auth_session", JSON.stringify({ ...auth, userStatus: value.userStatus }));
    }
    if (value.userStatus === "ACTIVE") router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!getMerchantTokenSession() && getAuthSession()?.role !== "merchant") {
      router.replace("/login");
      return;
    }
    let stopped = false;
    let reading = false;
    const run = async () => {
      if (stopped || reading) return;
      reading = true;
      try {
        await refresh();
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : "Could not load your application.");
      } finally {
        reading = false;
      }
    };
    void run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [refresh, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      await applicationApi.resubmit(draft);
      setDraft(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your corrections.");
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    setError("");
    setChecking(true);
    try {
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your application.");
    } finally {
      setChecking(false);
    }
  }

  const canCorrect = application && ["REJECTED", "MORE_INFO_REQUIRED"].includes(application.status);

  return (
    <AuthShell
      heading={canCorrect ? "Update your application" : "Application under review"}
      description={`${application?.businessName ?? "Your business"} can accept payments once the application is approved.`}
    >
      <div className="mt-6 space-y-5">
        <div className="rounded-card border border-line bg-surface-2 p-4" aria-live="polite">
          <p className="text-sm text-ink-2">Application status</p>
          <div className="mt-2">
            {application ? <StatusBadge status={application.status} /> : <StatusBadge tone="pending" label="Checking status" />}
          </div>
          {application?.reviewReason ? <p className="mt-3 text-sm text-ink">{application.reviewReason}</p> : null}
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

        <Link className="inline-block text-sm font-semibold text-accent-ink underline underline-offset-2" href="/app/verification">
          Verify the owner&apos;s identity
        </Link>

        {canCorrect && !draft ? (
          <Button className="w-full" size="lg" onClick={() => setDraft({ ...application, explanation: "" })}>
            Correct and resubmit
          </Button>
        ) : null}

        {draft ? (
          <form className="space-y-4" onSubmit={submit}>
            {fields.map(([field, label, max]) => (
              <div key={field} className="space-y-1.5">
                <label htmlFor={`f-${field}`} className="block text-sm font-medium text-ink">
                  {label}
                </label>
                <input
                  id={`f-${field}`}
                  className={fieldClass}
                  value={draft[field] ?? ""}
                  maxLength={max}
                  required={!label.includes("optional")}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                />
              </div>
            ))}
            {choices.map(({ field, label, values }) => (
              <div key={field} className="space-y-1.5">
                <label htmlFor={`c-${field}`} className="block text-sm font-medium text-ink">
                  {label}
                </label>
                <select
                  id={`c-${field}`}
                  className={fieldClass}
                  value={draft[field]}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                >
                  {values.map((value) => (
                    <option key={value} value={value}>
                      {humanize(value)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="text-sm text-ink-2">
              Changing the owner&apos;s details starts a new identity check. Your account stays pending until it is reviewed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" busy={busy} busyLabel="Submitting">
                Submit corrections
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        <Button variant="secondary" icon="refresh" disabled={busy} busy={checking} busyLabel="Checking" onClick={() => void checkNow()}>
          Check status now
        </Button>
      </div>
    </AuthShell>
  );
}
