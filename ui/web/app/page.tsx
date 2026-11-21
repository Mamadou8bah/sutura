import type { Metadata } from "next";
import Image from "next/image";
import { Icon, type IconName } from "./components/ui";
import { LandingHeader } from "./landing-header";
import { SiteFooter } from "./site-page";
import { headerNavGroups } from "./site-nav";

export const metadata: Metadata = {
  title: { absolute: "Sutura — wallets, merchant payments and cash agents" },
  description:
    "Hold and send money, collect payments with links and QR, and cash in or out at agents. Every movement is posted on a double-entry ledger.",
};

const audiences: { icon: IconName; title: string; text: string; href: string; cta: string }[] = [
  {
    icon: "wallet",
    title: "Customers",
    text: "Keep a wallet, send money to other Sutura wallets without a transfer fee, top up with mobile money and withdraw cash at an agent.",
    href: "/signup",
    cta: "Open a wallet",
  },
  {
    icon: "store",
    title: "Merchants",
    text: "Collect with payment links and QR codes, see each payment as it is posted and follow settlements from one dashboard.",
    href: "/merchants/register",
    cta: "Register a business",
  },
  {
    icon: "key",
    title: "Developers",
    text: "Create API keys, take payments from your backend and confirm them with webhooks. Idempotency keys protect every money write.",
    href: "/docs",
    cta: "Read the docs",
  },
  {
    icon: "scale",
    title: "Operations teams",
    text: "Review identity checks, freeze wallets, reverse payments with a reason and reconcile the ledger with a full audit trail.",
    href: "/operations/reconciliation",
    cta: "How reconciliation works",
  },
];

const principles = [
  {
    title: "Every movement is posted twice",
    text: "A transfer is a debit on one account and a credit on another. Balances are derived from postings, so they always add up.",
  },
  {
    title: "Retries never pay twice",
    text: "Each payment carries an idempotency key. If a connection drops, trying again returns the original result instead of a second charge.",
  },
  {
    title: "Risk and identity checks before money lands",
    text: "Transfers are scored before they post. Payments that need a closer look are held as under review, not silently completed.",
  },
  {
    title: "Status you can read",
    text: "Pending, under review, posted, reversed and failed look different everywhere, with a label as well as a colour.",
  },
];

function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[310px]" aria-labelledby="preview-caption">
      <div className="relative rounded-[48px] border border-[#77777b] bg-[#242426] p-[7px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
        <span aria-hidden="true" className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-[#555558]" />
        <span aria-hidden="true" className="absolute -left-[3px] top-40 h-12 w-[3px] rounded-l bg-[#555558]" />
        <span aria-hidden="true" className="absolute -right-[3px] top-36 h-16 w-[3px] rounded-r bg-[#555558]" />
        <div className="overflow-hidden rounded-[40px] bg-white">
          <div aria-hidden="true" className="relative flex h-11 items-center justify-between px-6 text-[11px] font-semibold text-[#1c1c1e]">
            <span>9:41</span>
            <span className="absolute left-1/2 top-2 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-[#151515]" />
            <svg width="47" height="12" viewBox="0 0 47 12" fill="currentColor">
              <path d="M0 8h3v4H0zm5-3h3v7H5zm5-3h3v10h-3zm5-2h3v12h-3z" />
              <rect x="24" y="2" width="19" height="9" rx="2" fill="none" stroke="currentColor" />
              <rect x="26" y="4" width="15" height="5" rx="1" />
              <path d="M44 5h2v3h-2z" />
            </svg>
          </div>
          <Image
            src="/brand/customer-app-home.png"
            alt="Sutura customer app home screen showing the wallet balance, Send, Add Funds, Withdraw and QR actions, and recent transactions."
            width={780}
            height={1560}
            sizes="(max-width: 340px) 270px, 294px"
            priority
            className="block h-auto w-full"
          />
          <div aria-hidden="true" className="flex h-5 items-center justify-center">
            <span className="h-1 w-24 rounded-full bg-[#1c1c1e]" />
          </div>
        </div>
      </div>
      <figcaption id="preview-caption" className="mt-4 text-center text-xs text-ink-3">
        Sutura customer app. Illustrative account and transactions.
      </figcaption>
    </figure>
  );
}
export default function HomePage() {
  return (
    <>
      <LandingHeader groups={headerNavGroups} />
      <main id="main" className="overflow-x-clip bg-canvas text-ink">
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8">
            <div>
              <h1 className="max-w-[16ch] text-[36px] font-medium leading-10 tracking-[-0.03em] text-ink md:text-[56px] md:leading-[60px]">
                Wallets, merchant payments and cash agents on one ledger
              </h1>
              <p className="mt-5 max-w-[36rem] text-lg leading-7 text-ink-2">
                Sutura lets people in The Gambia hold and send money, lets merchants collect with payment links and QR codes,
                and lets agents handle cash in and out. Every movement is posted on a double-entry ledger, so balances always
                reconcile.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-on transition-colors hover:bg-accent-hover"
                >
                  Open an account
                </a>
                <a
                  href="/merchants/register"
                  className="inline-flex h-12 items-center justify-center gap-1 rounded-control px-4 text-base font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  Register a business
                  <Icon name="chevron-right" size={18} />
                </a>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Audiences */}
        <section id="audiences" aria-labelledby="audiences-title" className="border-b border-line">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
            <h2 id="audiences-title" className="text-[32px] font-semibold leading-10 tracking-[-0.02em] text-ink">
              Who uses Sutura
            </h2>
            <p className="mt-3 max-w-[36rem] text-lg leading-7 text-ink-2">One platform, with a separate app or dashboard for each job.</p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map((item) => (
                <li key={item.title} className="flex flex-col rounded-card border border-line bg-surface p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-control bg-accent-tint text-accent-ink">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-2">{item.text}</p>
                  <a href={item.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline">
                    {item.cta}
                    <Icon name="chevron-right" size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Principles */}
        <section id="capabilities" aria-labelledby="principles-title" className="border-b border-line bg-surface-2">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8">
            <div>
              <h2 id="principles-title" className="text-[32px] font-semibold leading-10 tracking-[-0.02em] text-ink">
                Built so the numbers are right
              </h2>
              <p className="mt-3 max-w-[30rem] text-lg leading-7 text-ink-2">
                Payments software earns trust in the details: postings, retries, reviews and statuses.
              </p>
            </div>
            <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {principles.map((item) => (
                <div key={item.title}>
                  <dt className="text-base font-semibold text-ink">{item.title}</dt>
                  <dd className="mt-2 text-sm leading-6 text-ink-2">{item.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Mobile apps */}
        <section aria-labelledby="apps-title" className="border-b border-line">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-surface-2 text-ink-2">
                <Icon name="monitor" size={20} />
              </span>
              <div>
                <h2 id="apps-title" className="text-lg font-semibold text-ink">
                  Mobile apps: coming soon
                </h2>
                <p className="mt-1 max-w-[36rem] text-sm leading-6 text-ink-2">
                  The customer, merchant and agent apps are not in the app stores yet. Until then, customers and merchants can use
                  Sutura on the web.
                </p>
              </div>
            </div>
            <a
              href="/login"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-control border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-surface-2"
            >
              Log in on the web
            </a>
          </div>
        </section>

        {/* Closing CTA */}
        <section aria-labelledby="cta-title">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between md:py-20 lg:px-8">
            <div>
              <h2 id="cta-title" className="text-[32px] font-semibold leading-10 tracking-[-0.02em] text-ink">
                Start with a wallet or an API key
              </h2>
              <p className="mt-3 max-w-[36rem] text-lg leading-7 text-ink-2">
                Open a customer account in a few minutes, or read the docs and make a test payment from your backend.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-on hover:bg-accent-hover"
              >
                Open an account
              </a>
              <a
                href="/docs"
                className="inline-flex h-12 items-center justify-center rounded-control border border-line-strong px-6 text-base font-semibold text-ink hover:bg-surface-2"
              >
                Developer docs
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
