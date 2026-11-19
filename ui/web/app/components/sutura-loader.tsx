type SuturaLoaderProps = {
  message?: string;
  submessage?: string;
};

/** Full-page wait (session check, redirect). Announces itself; no decorative spinner stack. */
export function SuturaLoader({ message = "Loading", submessage }: SuturaLoaderProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4" aria-busy="true">
      <div role="status" className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
        <img src="/brand/sutura-logo.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
        <div>
          <p className="text-sm font-semibold text-ink">{message}</p>
          {submessage ? <p className="mt-1 text-sm text-ink-2">{submessage}</p> : null}
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
            <span className="sutura-loader-dot h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="sutura-loader-dot h-1.5 w-1.5 rounded-full bg-accent [animation-delay:150ms]" />
            <span className="sutura-loader-dot h-1.5 w-1.5 rounded-full bg-accent [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </main>
  );
}

/** Dashboard-shaped skeleton while the session and role view load. */
export function DashboardLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-canvas text-ink" aria-busy="true">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <span className="skeleton h-7 w-7 rounded-control" />
          <span className="skeleton h-4 w-16" />
          <div className="mx-auto hidden gap-3 md:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="skeleton h-4 w-16" />
            ))}
          </div>
          <span className="skeleton ml-auto h-8 w-20 rounded-control" />
        </div>
      </header>
      <div role="status" className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <span className="sr-only">Preparing your dashboard</span>
        <span className="skeleton h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="skeleton h-24 rounded-card" />
          ))}
        </div>
        <span className="skeleton h-72 rounded-card" />
      </div>
    </main>
  );
}
