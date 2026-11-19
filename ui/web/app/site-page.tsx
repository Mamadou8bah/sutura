import { LandingHeader } from "./landing-header";
import { footerColumns, headerNavGroups } from "./site-nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <a href="/" className="inline-flex items-center gap-2 rounded-control">
              <img src="/brand/sutura-logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              <span className="text-base font-semibold text-ink">Sutura</span>
            </a>
            <p className="mt-3 text-sm leading-6 text-ink-2">
              Wallets, merchant payments and cash agents on a double-entry ledger.
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4 lg:max-w-3xl">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-2">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <a href={link.href} className="rounded transition-colors hover:text-ink">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-5 text-sm text-ink-3">© 2026 Sutura</p>
      </div>
    </footer>
  );
}

export function SitePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingHeader groups={headerNavGroups} />
      <main id="main" className="min-h-[60vh] overflow-x-clip bg-canvas text-ink">
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-[880px] px-4 py-10 sm:px-6 sm:py-14">
            <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em] text-ink sm:text-4xl sm:leading-[44px]">{title}</h1>
            {description ? <p className="mt-3 max-w-[36rem] text-lg leading-7 text-ink-2">{description}</p> : null}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6 sm:py-12">
          <div className="prose-links space-y-6 text-base leading-7 text-ink-2">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export function ContentBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-ink-2">{children}</div>
    </section>
  );
}
