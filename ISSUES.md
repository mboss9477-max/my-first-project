# Known issues and future work

Deliberately deferred items. Each one names what is missing and what it would
take, so it can be picked up without re-deriving the context.

## Blocked on an account, token, or live URL

- **Analytics.** Nothing is instrumented. Needs a provider decision (Plausible
  and Fathom are the privacy-preserving options; GA4 if reach matters more) and
  an account before any code is worth writing.
- **Error monitoring.** No Sentry or equivalent. Same shape of blocker: needs an
  account and a DSN.
- **Draft preview.** `/api/draft-mode` and `previewClient()` exist, but need
  `SANITY_VIEWER_TOKEN` (a Viewer token from sanity.io/manage) and
  `SANITY_PREVIEW_SECRET`. Not wired into the page components on purpose:
  reading `draftMode()` inside a route opts it out of static generation, which
  would undo the SSG on every article and category page. Preview should be an
  explicit opt-in surface rather than a cost paid on every production request.
- **On-demand revalidation.** `/api/revalidate` is written and validates the
  webhook signature, but the webhook itself must be created in
  sanity.io/manage against a deployed URL, and `SANITY_REVALIDATE_SECRET` set on
  both sides. Until then content refreshes on the 60s timer.
- **Newsletter signup.** The footer block is rendered but the form is disabled,
  because there is no mailing list behind it. Silently swallowing an address
  would be worse than saying so. Needs a provider (Buttondown, Ghost, Mailchimp)
  and then a server action.

## Blocked on a dependency change

- **Shared-element view transitions.** React's `<ViewTransition>` would let a
  card thumbnail morph into the article hero on navigation, natively, with no
  animation library. The installed React 19.2.8 does not export it — the Next
  guide assumes a React canary build. Revisit when it lands in stable, or make a
  deliberate decision to move to canary.

## Navigation and content

- **Series / collections.** No way to group ongoing coverage across articles.
  Would need a `series` document type and a `/series/[slug]` route.
- **Author linking on existing content.** The seeded `author-cs-news-staff`
  document exists, but articles created before the author field was added still
  carry a plain `byline` string. Set the author reference on those articles so
  they link to the author page.
- **Curated nav.** The header shows every category. If the nav should be a
  subset, add a "show in nav" boolean to the category schema and filter on it.

## Testing and CI

- **No tests at all**, and CI runs only `claude-review` — nothing verifies that
  the build or types pass on a pull request. A GitHub Actions workflow running
  `tsc --noEmit`, `eslint` and `next build` is the minimum; Vitest plus
  Testing Library would cover the query, image and date helpers.

## Deployment

- Studio is local-only and never deployed.
- The production domain is not yet added as a CORS origin in Sanity, so the
  Studio will only work from localhost.
- No hosting target configured.
