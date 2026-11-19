import { DocsShell } from "./docs-shell";
import { Callout, CodeBlock, EndpointTable, SectionHeading } from "./docs-components";
import {
  BASE_URL,
  apiKeyEndpoints,
  codeSamples,
  errorCodes,
  paymentEndpoints,
  quickstartSteps,
} from "./docs-data";

export default function DocsPage() {
  return (
    <DocsShell>
      <div className="mx-auto max-w-4xl space-y-16">
        <section id="introduction" className="scroll-mt-24">
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white">
            <div className="border-b border-line px-6 py-10 lg:px-10">
              <p className="text-sm text-ink-2">Developer docs</p>
              <h1 className="mt-2 max-w-2xl text-[36px] font-medium leading-10 tracking-[-0.03em] text-ink lg:text-5xl lg:leading-[52px]">
                Accept payments with an API key
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-7 text-ink-2">
                Integrate Sutura in three steps: create a key, create a payment from your backend, and confirm with webhooks.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#quickstart" className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover">
                  Quickstart
                </a>
                <a href="/dashboard" className="inline-flex h-11 items-center rounded-control border border-line-strong px-5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2">
                  Open dashboard
                </a>
              </div>
            </div>

            <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
              {[
                ["Auth", "X-Api-Key header"],
                ["Payments", "Checkout links"],
                ["Events", "payment.paid webhooks"],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-5 py-4">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-card border border-slate-200 bg-white p-8">
            <SectionHeading
              title="How it works"
              description="Your server talks to Sutura. Your customer pays on our checkout page. Your server gets notified when money arrives."
            />
            <ol className="grid gap-4 lg:grid-cols-3">
              {quickstartSteps.map((item) => (
                <li key={item.step} className="rounded-card border border-slate-200 bg-slate-50 p-5">
                  <span className="inline-flex h-8 w-8 tabular-nums items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-ink">{item.step}</span>
                  <h3 className="mt-3 font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="api-keys" className="scroll-mt-24 rounded-card border border-slate-200 bg-white p-8 lg:p-10">
          <SectionHeading
            eyebrow="Authentication"
            title="API keys"
            description="Use API keys for server-to-server calls. Never put them in a browser or mobile app — only your backend should see the secret."
          />

          <Callout type="warning" title="Keep keys secret">
            Treat API keys like passwords. If one leaks, revoke it in the dashboard and create a new key.
          </Callout>

          <div className="mt-6">
            <CodeBlock
              title="Request header"
              code={`X-Api-Key: pf_live_<public>.<secret>
Content-Type: application/json`}
            />
          </div>

          <div className="mt-8">
            <EndpointTable endpoints={apiKeyEndpoints} />
          </div>

          <div className="mt-8">
            <CodeBlock title="Create a key (from dashboard session)" code={codeSamples.createKey} />
          </div>
        </section>

        <section id="quickstart" className="scroll-mt-24 rounded-card border border-slate-200 bg-white p-8 lg:p-10">
          <SectionHeading
            eyebrow="Quickstart"
            title="Create your first payment"
            description="From your backend, create a payment link and send the customer to the checkout URL."
          />

          <CodeBlock title="Create payment link" code={codeSamples.createPayment} />

          <div className="mt-8">
            <Callout type="tip" title="Response">
              The API returns a payment link with a <code className="rounded bg-emerald-100 px-1 font-mono text-xs">checkoutUrl</code>. Redirect your customer there to complete payment.
            </Callout>
          </div>

          <div className="mt-8">
            <SectionHeading title="Payment endpoints" />
            <EndpointTable endpoints={paymentEndpoints} />
          </div>
        </section>

        <section id="webhooks" className="scroll-mt-24 rounded-card border border-slate-200 bg-white p-8 lg:p-10">
          <SectionHeading
            title="Webhooks"
            description="Register an endpoint in the developer dashboard. Sutura POSTs events when payment status changes."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-slate-200 bg-slate-50 p-5">
              <p className="font-mono text-sm font-bold text-accent-ink">payment.paid</p>
              <p className="mt-2 text-sm text-slate-600">Customer completed checkout. Fulfil the order in your system.</p>
            </div>
            <div className="rounded-card border border-slate-200 bg-slate-50 p-5">
              <p className="font-mono text-sm font-bold text-accent-ink">payment.failed</p>
              <p className="mt-2 text-sm text-slate-600">Payment did not succeed. Show an error or retry in your app.</p>
            </div>
          </div>

          <div className="mt-8">
            <CodeBlock title="Example payload" code={codeSamples.webhookPayload} />
          </div>

          <div className="mt-6">
            <Callout type="info" title="Best practice">
              Respond with HTTP 200 quickly, then process the event asynchronously. Sutura retries failed deliveries.
            </Callout>
          </div>
        </section>

        <section id="errors" className="scroll-mt-24 rounded-card border border-slate-200 bg-white p-8 lg:p-10">
          <SectionHeading title="Errors" description="Common responses when integrating payments." />

          <div className="overflow-hidden rounded-card border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Meaning</th>
                  <th className="hidden px-5 py-3 md:table-cell">Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {errorCodes.map((row) => (
                  <tr key={row.code} className="bg-white">
                    <td className="px-5 py-4 font-mono font-bold text-slate-950">{row.code}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{row.title}</td>
                    <td className="hidden px-5 py-4 text-slate-600 md:table-cell">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
          <p>
            Full OpenAPI reference:{" "}
            <a href={`${BASE_URL}/swagger-ui.html`} className="font-semibold text-accent-ink hover:underline">
              Swagger UI
            </a>
            {" · "}
            <a href="/dashboard" className="font-semibold text-accent-ink hover:underline">
              Developer dashboard
            </a>
          </p>
        </footer>
      </div>
    </DocsShell>
  );
}
