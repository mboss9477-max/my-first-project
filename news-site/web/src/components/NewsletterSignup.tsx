import { SITE_NAME } from "@/lib/site";

/**
 * Newsletter capture. Deliberately NOT wired to a provider — there is no
 * mailing list yet, and silently swallowing an address would be worse than
 * saying so. The form is disabled and labelled as such until a provider is
 * chosen; see ISSUES.md.
 */
export function NewsletterSignup() {
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

      <form
        className="mt-4 flex w-full max-w-sm gap-2 md:mt-0"
        aria-describedby="newsletter-status"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          disabled
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-sm border border-rule bg-surface px-3 py-2 text-sm transition-colors duration-150 ease-out placeholder:text-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="submit"
          disabled
          className="shrink-0 cursor-not-allowed rounded-sm border border-rule px-4 py-2 text-sm font-medium text-ink-soft"
        >
          Subscribe
        </button>
      </form>

      <p id="newsletter-status" className="sr-only">
        Newsletter signup is not yet available.
      </p>
    </section>
  );
}
