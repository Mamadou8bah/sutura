import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md text-center">
        <img src="/brand/sutura-logo.png" alt="" width={40} height={40} className="mx-auto h-10 w-10 object-contain" />
        <p className="mt-6 text-sm text-ink-2 tabular-nums">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          The link may be out of date, or the page has moved. If you followed a payment link, ask the merchant for a new one.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-on hover:bg-accent-hover"
          >
            Go to the home page
          </a>
          <a
            href="/help"
            className="inline-flex h-11 items-center justify-center rounded-control border border-line-strong px-5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            Get help
          </a>
        </div>
      </div>
    </main>
  );
}
