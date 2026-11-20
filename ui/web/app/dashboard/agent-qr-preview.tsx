"use client";

import { useEffect, useRef, useState } from "react";
import { authenticatedFetch, readAuthenticatedJson } from "../../lib/authenticated-fetch";
import QRCode from "react-qr-code";
import { encodeAgentQrPayload, type AgentQrPayload } from "../../lib/agent-qr";
import { CopyButton, Money, StatusBadge } from "../components/ui";

export function AgentQrPreview({
  payload,
  title,
  hint,
}: {
  payload: AgentQrPayload;
  title: string;
  hint?: string;
}) {
  if (payload.operation === "WITHDRAWAL") return <CashOutQrPreview payload={payload} />;
  const value = encodeAgentQrPayload(payload);
  const operation = payload.operation === "DEPOSIT" ? "cash-in" : "cash-out";

  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5" aria-label={title}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-2">{hint}</p> : null}
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* QR codes need a light quiet zone to scan, so the tile stays white in both themes. */}
        <div className="rounded-card border border-line p-3" style={{ background: "#ffffff" }}>
          <QRCode value={value} size={168} level="M" title={`QR code for ${operation} ${payload.reference}`} />
        </div>
        <dl className="w-full min-w-0 flex-1 divide-y divide-line rounded-row border border-line text-sm">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Reference</dt>
            <dd className="flex min-w-0 items-center gap-1">
              <code className="truncate font-mono text-xs text-ink">{payload.reference}</code>
              <CopyButton value={payload.reference} />
            </dd>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Wallet</dt>
            <dd className="text-right text-ink">
              {payload.walletName} <span className="text-ink-3 tabular-nums">#{payload.walletId}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Amount</dt>
            <dd className="font-semibold text-ink">
              <Money amount={payload.amount} currency={payload.currency} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">Status</dt>
            <dd>
              <StatusBadge status="AWAITING_AGENT" label="Awaiting agent scan" />
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-4 text-sm text-ink-2">
        An agent scans this code to complete the {operation} on your wallet. Nothing moves until the agent confirms.
      </p>
    </section>
  );
}

export function PrimaryWalletBanner({
  name,
  id,
  balance,
  currency,
}: {
  name: string;
  id: number;
  balance: string;
  currency: string;
}) {
  return (
    <div className="rounded-row border border-line bg-surface-2 px-4 py-3">
      <p className="text-xs text-ink-2">Your wallet</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{name}</p>
      <p className="text-xs text-ink-2 tabular-nums">
        #{id} · {balance || `${currency} balance unavailable`}
      </p>
    </div>
  );
}

function CashOutQrPreview({payload}:{payload:AgentQrPayload}) {
  type Qr = {token:string|null;expiresAt:string|null;status:string};
  const [qr,setQr]=useState<Qr|null>(null), [now,setNow]=useState(Date.now()), [error,setError]=useState("");
  const current=useRef<Qr|null>(null);
  useEffect(()=>{
    let active=true, running=false, retryAt=0, controller:AbortController|null=null;
    current.current=null;setQr(null);
    const load=async()=>{
      const stored=current.current;
      if(!active||running||document.visibilityState!=="visible"||Date.now()<retryAt)return;
      if(stored&&!['AWAITING_AGENT','SCANNED','PENDING_REVIEW'].includes(stored.status))return;
      if(stored?.token&&stored.expiresAt&&Date.parse(stored.expiresAt)>Date.now())return;
      running=true;const request=new AbortController();controller=request;
      try{
        const response=await authenticatedFetch(`/api/v1/withdrawals/reference/${encodeURIComponent(payload.reference)}/qr`,{method:"POST",signal:request.signal});
        const value=await readAuthenticatedJson<Qr>(response);
        if(!value||typeof value.status!=="string"||(value.token&&(!/^[A-Za-z0-9_-]{43}$/.test(value.token)||!Number.isFinite(Date.parse(value.expiresAt??"")))))throw Error("Invalid QR");
        if(active&&!request.signal.aborted){current.current=value;setQr(value);setError("");retryAt=["SCANNED","PENDING_REVIEW"].includes(value.status)?Date.now()+5000:0;}
      }catch{if(active&&!request.signal.aborted){current.current=null;setQr(null);setError("QR unavailable. Reconnect for a fresh code.");retryAt=Date.now()+5000;}}
      finally{if(controller===request)running=false;}
    };
    const visibility=()=>{controller?.abort();controller=null;running=false;current.current=null;setQr(null);setNow(Date.now());void load();};
    document.addEventListener("visibilitychange",visibility);
    void load();const tick=setInterval(()=>{setNow(Date.now());void load();},1000);
    return()=>{active=false;controller?.abort();clearInterval(tick);document.removeEventListener("visibilitychange",visibility);};
  },[payload.reference]);
  const visible=qr?.token&&Date.parse(qr.expiresAt??"")>now;
  return <section aria-label="Cash-out QR code" className="rounded-card border border-line bg-surface p-5 text-center">
    <h2 className="font-semibold text-ink">Cash-out QR</h2><p className="my-3 text-lg font-semibold text-ink"><Money amount={payload.amount} currency={payload.currency}/></p>
    {visible&&<div className="mx-auto w-fit rounded-card bg-white p-3"><QRCode value={JSON.stringify({app:"sutura",v:2,operation:"WITHDRAWAL",reference:payload.reference,token:qr.token,expiresAt:qr.expiresAt})} size={180}/></div>}
    <p role="status" className="mt-4 text-sm text-ink-2">{qr?.status==="SCANNED"?"The agent is reviewing your cash-out.":qr?.status==="COMPLETED"?"Cash-out completed. Check Activity for your receipt.":qr&&!['AWAITING_AGENT','SCANNED'].includes(qr.status)?"This cash-out is not ready. Check Activity.":visible?`Show the agent. Refreshes in ${Math.min(30,Math.max(0,Math.ceil((Date.parse(qr.expiresAt!)-now)/1000)))}s.`:error||"Preparing a fresh QR…"}</p>
  </section>;
}
