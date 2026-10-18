"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell, formatTimestamp, inputClass, PanelCard, PrimaryButton } from "./dashboard-shell";
import { DataTable } from "./data-table";
import { developerTabs } from "./dashboard-tabs";
import { mockDeveloperDashboard } from "../../lib/mock/developer-dashboard";
import { developerApi } from "../../lib/developer-api";
import {getDemoSession} from "../../lib/demo-auth";
import { getAuthSession } from "../../lib/auth-session";

type Tab = "overview" | "keys" | "payments" | "webhooks";
type Message = { type: "success" | "error"; text: string } | null;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function IntegrationSteps() {
  const steps = [
    { n: "1", title: "Create an API key", body: "Generate a test or live key. Use it in the X-Api-Key header on every request." },
    { n: "2", title: "Create a payment", body: "Call the payment-links API from your backend. Redirect your customer to the checkout URL." },
    { n: "3", title: "Check payment status", body: "Retrieve the collection reference from your server and fulfil the order only when its status is PAID." },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {steps.map((step) => (
        <div key={step.n} className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#123c91] text-sm font-black text-white">{step.n}</span>
          <h3 className="mt-3 font-bold text-slate-950">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

export function DeveloperDashboardView() {
  const [data, setData] = useState(()=>getDemoSession()&&!getAuthSession()?{...mockDeveloperDashboard,projectName:"Sample integration",stats:[{label:"Payments (30d)",value:"24",hint:"Sample payments"},{label:"Success rate",value:"95.8%",hint:"Sample activity"},{label:"Active API keys",value:"1",hint:"Sample key"}],apiKeys:[{id:"demo-key-1",name:"Sample checkout",prefix:"demo_sample_••••",created:"2026-10-11",lastUsed:"Sample activity",status:"active"}],payments:[{id:"demo-payment-1",reference:"DEMO-PAY-101",amount:"GMD 250.00",status:"completed",customer:"Sample customer",time:new Date().toISOString()}],webhookEvents:[{id:"demo-event-1",type:"payment.completed",status:"delivered",time:new Date().toISOString()}]}:mockDeveloperDashboard);
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState<Message>(null);
  const [keyForm, setKeyForm] = useState({ name: "" });
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);

  const hasApiSession = () => Boolean(getAuthSession()?.accessToken);

  useEffect(() => {
    if (!hasApiSession()) return;
    void developerApi.listApiKeys().then((keys) => {
      setData((prev) => ({
        ...prev,
        apiKeys: keys.map((k) => ({
          id: k.publicId,
          name: k.name,
          prefix: `${k.publicId}_••••`,
          created: k.expiresAt?.slice(0, 10) ?? "—",
          lastUsed: "—",
          status: k.revoked ? "revoked" : "active",
        })),
      }));
    }).catch(err => notify("error",err instanceof Error?err.message:"Could not load API keys"));
    void developerApi.listPayments().then(payments=>setData(prev=>({...prev,payments:payments.map(p=>({id:String(p.id),reference:p.reference,amount:`${p.currency} ${p.amount}`,status:p.status.toLowerCase(),customer:"Account payment",time:p.createdAt})),stats:[{label:"Payments",value:String(payments.length),hint:"Account history"},{label:"Completed",value:String(payments.filter(p=>p.status==="COMPLETED").length),hint:"Settled payments"},{label:"Active API keys",value:String(prev.apiKeys.filter(k=>k.status==="active").length),hint:"Server integrations"}]}))).catch(err=>notify("error",err instanceof Error?err.message:"Could not load payments"));
  }, []);

  function notify(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (hasApiSession()) {
      try {
        const created = await developerApi.createApiKey(keyForm.name, 365);
        if (created.apiKey) setNewKeySecret(created.apiKey);
        const keys = await developerApi.listApiKeys();
        setData((prev) => ({
          ...prev,
          apiKeys: keys.map((k) => ({
            id: k.publicId,
            name: k.name,
            prefix: `${k.publicId}_••••`,
            created: k.expiresAt?.slice(0, 10) ?? "—",
            lastUsed: "—",
            status: k.revoked ? "revoked" : "active",
          })),
        }));
        notify("success", "API key created — copy it now, you won't see it again");
        setKeyForm({ name: "" });
        return;
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Failed to create key");
        return;
      }
    }
    if(getDemoSession()){const name=keyForm.name.trim();if(!name){notify("error","Enter a key name.");return;}const id=`demo-${Date.now()}`;setData(prev=>({...prev,apiKeys:[...prev.apiKeys,{id,name,prefix:"demo_only_••••",created:new Date().toISOString().slice(0,10),lastUsed:"Never",status:"active"}]}));setNewKeySecret("demo_only_not_a_valid_api_key");setKeyForm({name:""});notify("success","Sample key created locally. It cannot authenticate API requests.");return;}
    notify("error", "Please sign in to create API keys");
  }

  async function handleRevokeKey(id: string) {
    if(hasApiSession()) {
      try { await developerApi.revokeApiKey(id); }
      catch(err) { notify("error",err instanceof Error?err.message:"Could not revoke key");return; }
    }
    setData((prev) => ({
      ...prev,
      apiKeys: prev.apiKeys.map((k) => (k.id === id ? { ...k, status: "revoked" } : k)),
    }));
    notify("success", "API key revoked");
  }


  return (
    <DashboardShell tabs={developerTabs} activeTab={tab} onTabChange={(id) => setTab(id as Tab)} message={message}>
      {tab === "overview" && (
        <div className="space-y-5">
          <PanelCard title="Accept payments in your app" subtitle="Three steps to go live">
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-slate-600">
              Sutura lets developers collect payments by creating checkout links from their backend. Your app stays in control — check the collection status through the API before fulfilling an order.
            </p>
            <IntegrationSteps />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setTab("keys")} className="rounded-full bg-[#123c91] px-5 py-2.5 text-sm font-bold text-white">
                Create API key
              </button>
              <Link href="/docs" className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-800">
                Read the docs
              </Link>
            </div>
          </PanelCard>

          <div className="grid gap-4 sm:grid-cols-3">
            {data.stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{stat.label === "Active API keys" ? data.apiKeys.filter(k=>k.status === "active").length : stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
              </div>
            ))}
          </div>

          <PanelCard title="Example request" subtitle="Create a payment from your server">
            <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-100">{data.integrationSnippet}</pre>
          </PanelCard>

          <DataTable
            title="Recent payments"
            subtitle="Payments created via your API keys"
            exportFilename="sutura-developer-payments"
            dateKey="time"
            pageSize={5}
            rows={data.payments as unknown as Record<string, unknown>[]}
            columns={[
              { key: "id", label: "Payment" },
              { key: "reference", label: "Reference" },
              { key: "customer", label: "Customer" },
              { key: "amount", label: "Amount" },
              { key: "status", label: "Status", render: (r) => <span className="capitalize">{String(r.status)}</span> },
              { key: "time", label: "Time", render: (r) => formatTimestamp(String(r.time)), exportValue: (r) => formatTimestamp(String(r.time)) },
            ]}
          />
        </div>
      )}

      {tab === "keys" && (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <DataTable
            title="API keys"
            subtitle="Authenticate your server-side requests"
            exportFilename="sutura-api-keys"
            searchPlaceholder="Search keys…"
            rows={data.apiKeys as unknown as Record<string, unknown>[]}
            columns={[
              { key: "name", label: "Name", render: (r) => <span className="font-semibold">{String(r.name)}</span> },
              { key: "prefix", label: "Key", render: (r) => <span className="font-mono text-sm">{String(r.prefix)}</span> },
              { key: "status", label: "Status", render: (r) => <span className="capitalize">{String(r.status)}</span> },
              { key: "lastUsed", label: "Last used" },
              {
                key: "_actions",
                label: "",
                searchValue: () => "",
                exportValue: () => "",
                render: (r) =>
                  r.status === "active" ? (
                    <button type="button" onClick={() => handleRevokeKey(String(r.id))} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Revoke
                    </button>
                  ) : null,
              },
            ]}
          />

          <div className="space-y-5">
            <PanelCard title="New API key" subtitle="Keys are shown once at creation">
              <form className="space-y-3" onSubmit={handleCreateKey}>
                <Field label="Key name">
                  <input className={inputClass} value={keyForm.name} onChange={(e) => setKeyForm({ name: e.target.value })} placeholder="e.g. Production backend" required />
                </Field>
                <PrimaryButton type="submit">Generate key</PrimaryButton>
              </form>
            </PanelCard>

            {newKeySecret ? (
              <PanelCard title="Your new key" subtitle="Copy and store it securely">
                <code className="block break-all rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-100">{newKeySecret}</code>
                <p className="mt-3 text-xs text-slate-500">Send this as the <code className="font-mono">X-Api-Key</code> header. Never expose it in mobile apps or browsers.</p>
              </PanelCard>
            ) : null}

            <PanelCard title="How to authenticate" subtitle="Server-side only">
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-100">{`X-Api-Key: pf_live_<public>.<secret>
Content-Type: application/json`}</pre>
            </PanelCard>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <DataTable
          title="Payments"
          subtitle="All payments accepted through your integration"
          exportFilename="sutura-developer-payments"
          searchPlaceholder="Search by customer, reference, status…"
          dateKey="time"
          rows={data.payments as unknown as Record<string, unknown>[]}
          columns={[
            { key: "id", label: "Payment" },
            { key: "reference", label: "Reference" },
            { key: "customer", label: "Customer" },
            { key: "amount", label: "Amount" },
            { key: "status", label: "Status", render: (r) => (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                r.status === "paid" ? "bg-emerald-100 text-emerald-800" : r.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
              }`}>{String(r.status)}</span>
            ) },
            { key: "time", label: "Time", render: (r) => formatTimestamp(String(r.time)), exportValue: (r) => formatTimestamp(String(r.time)) },
          ]}
        />
      )}

      {tab === "webhooks" && <PanelCard title="Integration status" subtitle="Confirm payment from your server">
        <p className="text-sm leading-relaxed text-slate-600">Use your server-side API key to create a collection for a wallet owned by your integration account. Query the reference after checkout. PAID confirms settlement; REVIEW remains pending, FAILED must not fulfil an order, and REFUNDED records a reversal.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-100">{`GET /api/v1/payment-links/ref/<reference>\nX-Api-Key: <your server key>`}</pre>
        <Link href="/app/verification" className="mt-4 inline-block text-sm font-bold underline">Verify integration account owner</Link>
        <p className="mt-4 text-sm text-slate-600">Provider and Sentinel settlement callbacks are configured by platform operators. Merchant-configured outbound event delivery is not available.</p>
      </PanelCard>}

    </DashboardShell>
  );
}
