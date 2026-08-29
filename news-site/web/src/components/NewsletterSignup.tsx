"use client";

import { useActionState } from "react";

import { subscribe, type SubscribeResult } from "@/app/actions/subscribe";
import { SITE_NAME } from "@/lib/site";

const initialState: SubscribeResult | null = null;

/**
 * Newsletter capture, writing directly into Sanity as a newsletterSubscriber
 * document until a real ESP is chosen — see the schema file and ISSUES.md.
 * This is a holding pattern for collecting real signups now, not the
 * permanent home for that data.
 */
export function NewsletterSignup() {
  const [state, formAction, pending] = useActionState(
    subscribe,
    initialState,
  );

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="caged border border-rule p-6 md:flex md:items-center md:justify-between md:gap-8"
    >
      <div>
        <h2 id="newsletter-heading" className="font-serif text-xl tracking-tight">
          The {SITE_NAME} morning briefing
        </h2>
        <p className="mt-1 max-w-md text-sm text-ink-soft">
          The stories that matter, in your inbox before nine. Free, and no more
          than one email a day.
        </p>
      </div>

      {state?.ok ? (
        <p
          role="status"
          className="fade-in mt-4 text-sm font-medium text-accent md:mt-0"
        >
          You&rsquo;re on the list.
        </p>
      ) : (
        <form
          action={formAction}
          className="mt-4 flex w-full max-w-sm flex-col gap-2 md:mt-0"
          noValidate
        >
          <div className="flex gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              disabled={pending}
              placeholder="you@example.com"
              aria-invalid={state?.ok === false}
              aria-describedby={
                state?.ok === false ? "newsletter-error" : undefined
              }
              className="min-w-0 flex-1 rounded-sm border border-rule bg-surface px-3 py-2 text-sm transition-colors duration-150 ease-out placeholder:text-ink-soft focus:border-accent focus:outline-none disabled:opacity-70"
            />
            {/* Honeypot: hidden from sighted and screen-reader users alike, so
                only a bot filling every field will ever populate this. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 rounded-sm border border-rule px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Joining…" : "Subscribe"}
            </button>
          </div>

          {state?.ok === false ? (
            <p id="newsletter-error" role="alert" className="text-xs text-accent">
              {state.error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
