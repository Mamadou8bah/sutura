"use client";

import { useEffect } from "react";
import { Button } from "./components/ui";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" role="alert" className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md text-center">
        <img src="/brand/sutura-logo.png" alt="" width={40} height={40} className="mx-auto h-10 w-10 object-contain" />
        <h1 className="mt-6 text-2xl font-semibold text-ink">This page didn&apos;t load</h1>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          Something went wrong on our side. Try again, and if it keeps happening, contact
          support with the reference below.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-ink-3">
            Reference <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button icon="refresh" onClick={() => reset()}>
            Try again
          </Button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-control border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            Go to the home page
          </a>
        </div>
      </div>
    </main>
  );
}
