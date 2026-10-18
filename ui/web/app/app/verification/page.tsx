"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import { getMerchantTokenSession } from "../../../lib/merchant-api";
import { kycApi, type KycStatus } from "../../../lib/kyc-api";

const descriptions: Record<KycStatus["status"], string> = {
  NOT_STARTED: "Verify your identity with an identity document and a face and liveness check.",
  PENDING: "Your verification is in progress. Complete the steps in the verification page, then refresh your status.",
  EXPIRED: "Your verification link has expired. Start again to get a new link.",
  VERIFIED: "Your identity has been verified.",
  FLAGGED: "Your verification needs review. You can return later to check the result.",
  REJECTED: "Your identity could not be verified. You can try again with clear, valid evidence.",
};

export default function VerificationPage() {
  const router = useRouter();
  const [record, setRecord] = useState<KycStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [back, setBack] = useState("/app");

  useEffect(() => {
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
    setBack(auth?.role === "customer" ? "/app" : "/dashboard");
    let active = true;
    kycApi.status()
      .then(async (local) => {
        if (active) setRecord(local);
        return local.sessionId ? await kycApi.refresh() : local.status === "NOT_STARTED" ? await kycApi.start() : local;
      })
      .then((value) => { if (active) setRecord(value); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load verification"); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [router]);

  useEffect(()=>{
    if(record?.status!=="PENDING"||busy)return;
    let running=false;let stopped=false;
    const refresh=async()=>{if(running||stopped||document.visibilityState!=="visible")return;running=true;try{const value=await kycApi.refresh();if(!stopped){setRecord(value);setError(null);}}catch(err){if(!stopped)setError(err instanceof Error?err.message:"Could not refresh identity");}finally{running=false;}};
    const timer=setInterval(()=>void refresh(),30000);window.addEventListener("focus",refresh);
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[record?.status,busy]);

  async function run(action: "start" | "refresh") {
    setBusy(true);
    setError(null);
    try {
      setRecord(await kycApi[action]());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification is unavailable");
    } finally {
      setBusy(false);
    }
  }

  const canStart = record && ["NOT_STARTED", "EXPIRED", "REJECTED"].includes(record.status);
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <Link href={back} className="text-sm font-bold text-[#123c91]">← Back to your account</Link>
        <h1 className="mt-6 text-2xl font-black text-slate-900">Verify your identity</h1>
        {record && (
          <div className="mt-5" aria-live="polite">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#123c91]">
              {record.status.replaceAll("_", " ")}
            </span>
            <p className="mt-4 text-sm leading-6 text-slate-600">{descriptions[record.status]}</p>
          </div>
        )}
        {busy && <p className="mt-4 text-sm text-slate-600" role="status">Updating verification…</p>}
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
        <div className="mt-6 flex flex-col gap-3">
          {canStart && <button disabled={busy} onClick={() => run("start")} className="rounded-xl bg-[#123c91] px-4 py-3 font-bold text-white disabled:opacity-50">Start verification</button>}
          {record?.status === "PENDING" && record.hostedUrl && (
            <a href={record.hostedUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#123c91] px-4 py-3 text-center font-bold text-white">Continue verification</a>
          )}
          {record?.sessionId && <button disabled={busy} onClick={() => run("refresh")} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-800 disabled:opacity-50">Refresh status</button>}
          {!record && !busy && <button onClick={() => { setBusy(true); kycApi.status().then(setRecord).catch((err) => setError(err.message)).finally(() => setBusy(false)); }} className="rounded-xl border border-slate-200 px-4 py-3 font-bold">Try again</button>}
        </div>
      </div>
    </main>
  );
}
