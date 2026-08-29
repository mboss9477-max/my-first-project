"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // No error monitoring service is wired up yet (see ISSUES.md) — this is
    // the only record of the failure until one exists.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-6 py-24">
      <span className="label text-accent">Error</span>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-prose text-ink-soft">
        The page failed to load. This has been logged; trying again usually
        works.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 rounded-sm border border-rule px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </main>
  );
}
