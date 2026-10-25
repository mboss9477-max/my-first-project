# Brief 15: Edge States, Error Handling & Unreachable CMS Audit

**Date:** 2026-10-25  
**Auditor:** Gemini CLI  
**Environment:** Local production build (`news-site/web`) evaluated in Sanity mode and CMS runtime failure simulation  
**Status:** Audit Findings Only (Read-Only; no code changed)

---

## 1. Executive Summary

This audit systematically checks what visitors see across all edge, error, loading, and empty states on CS NEWS, as well as the runtime behavior when the backend CMS becomes unreachable while the site is serving traffic.

### Key Conclusions
1. **No Technical Messages Exposed:** Across all tested failure modes (404, unhandled exceptions, unreachable CMS, invalid API tokens, database disconnection), **zero technical error messages, stack traces, or raw HTTP status codes (e.g., `ECONNREFUSED`, `500`, `FetchError`) are exposed to readers**. All errors are mapped to friendly editorial messages or caught by Next.js boundaries.
2. **High Resilience on Static & Revalidating Pages:** Because the site is statically generated with Incremental Static Regeneration (ISR), **stopping the CMS has zero visual impact on existing static and revalidating pages**. Next.js serves the cached static page and gracefully falls back to stale content when background revalidation encounters network failures.
3. **Primary Resilience Gap:** The dynamic search route (`/search`) does not wrap backend queries in a `try/catch`. When the CMS is unreachable, executing a search crashes the entire route into `error.tsx` ("Something went wrong"), unmounting the search form and preventing visitors from refining their query.
4. **Accessibility Findings:**
   - `error.tsx` lacks `role="alert"` and does not automatically shift keyboard focus to the error heading on mount.
   - Search result counts (`X results for “...”` / `No stories match “...”`) lack `role="status"` / `aria-live="polite"`, requiring screen reader users to manually navigate down the DOM to discover whether results were found.

---

## 2. Comprehensive States Audit Table

| State | How to Reach It | What Shows to Visitor | Problem / Accessibility Gap | Suggested Fix |
|---|---|---|---|---|
| **404 Not Found** | Navigate to any non-existent URL (e.g. `/broken-link`) | Accent gold "404", Playfair heading "Page not found", description: *"The story you’re looking for may have moved, been renamed, or never existed."*, and button link *"← Back to the front page"*. | Focus is not programmatically moved to the `<h1>` on navigation; keyboard users remain at document root. | Add `tabIndex={-1}` and autofocus the `<h1>` or main container upon mounting `not-found.tsx`. |
| **Runtime Error (`error.tsx`)** | Trigger an uncaught client/server exception (e.g. backend crash on dynamic SSR) | Accent gold "Error", Playfair heading "Something went wrong", description: *"The page failed to load. This has been logged; trying again usually works."*, and *"Try again"* button. | 1. Lacks `role="alert"` or `aria-live="assertive"`.<br>2. Focus is not moved to the error container, so keyboard/screen reader users are not alerted to the failure. | Add `role="alert"` to `<main>` and auto-focus heading on mount via `useEffect` with `tabIndex={-1}`. |
| **Home Loading (`app/loading.tsx`)** | Client-side navigation to `/` during slow network / data fetch | Polished ash-tinted skeleton matching the 2-column home card cage. Screen readers hear polite announcement: *"Loading the front page"*. | None. Skeletons are `aria-hidden="true"`, preventing screen reader verbosity, and match real card geometry. | **Fine as-is.** |
| **Category Loading (`app/category/[slug]/loading.tsx`)** | Client-side navigation to section (e.g. `/category/tech`) | Title block skeleton and 4 article row skeletons. Screen readers hear: *"Loading section"*. | None. Preserves layout stability and prevents cumulative layout shift (CLS). | **Fine as-is.** |
| **Article Loading (`app/article/[slug]/loading.tsx`)** | Client-side navigation to article | Kicker, 2-line headline, standfirst, hero image aspect box, and 6-line body skeleton. Screen readers hear: *"Loading article"*. | None. Matches article geometry cleanly. | **Fine as-is.** |
| **Topic / Author / Search Loading** | Client-side navigation to `/topic/[slug]`, `/author/[slug]`, or `/search` | Fallback to root `app/loading.tsx`: flashes the 2-column home page card cage and announces *"Loading the front page"*. | Layout mismatch: topic and author pages use vertical lists, but show the home card grid during loading. | Add dedicated `loading.tsx` in `app/topic/[slug]` and `app/author/[slug]` mirroring `CategoryLoading`. |
| **Empty Category** | Category with 0 published stories | Header: *"No stories published in this section yet."*<br>Body: *"Once a story is filed under {category.name}, it will appear here."* | Text is clear, but lacks `role="status"` / `aria-live="polite"` for dynamic updates. | Add `role="status"` to the empty state container. |
| **Empty Topic** | Topic with 0 published stories | Topic badge, topic title, and body message: *"Nothing filed under {topic.name} yet."* | Clear, clean wording. Lacks `role="status"`. | Add `role="status"` to the empty message. |
| **Empty Author** | Author with 0 published stories | Author name, role, bio, and body message: *"No published stories by {author.name} yet."* | Clear, clean wording. Lacks `role="status"`. | Add `role="status"` to the empty message. |
| **Empty Search (No Query)** | Navigate to `/search` with no `?q=` parameter | Search input with placeholder *"Search stories…"*, followed by prompt: *"Enter a word or phrase to search headlines, summaries and article text."* | None. Helpful prompt. | **Fine as-is.** |
| **Empty Search (No Matches)** | Search for non-existent term (e.g. `/search?q=xyz123`) | Search input retaining term, followed by: *"No stories match “xyz123”."* | Missing `role="status"` / `aria-live="polite"`. Screen reader users are not notified that 0 results were returned unless they navigate down. | Wrap search result text in `<p role="status" aria-live="polite">`. |
| **Newsletter: Invalid Email** | Submit empty or malformed email (e.g. `test@`) | Form shows inline alert in accent gold: *"Enter a valid email address."* Input receives `aria-invalid="true"` and `aria-describedby="newsletter-error"`. | Good accessibility (`role="alert"`), but focus remains on input without visual error border. | Add red/accent border highlight to input on `aria-invalid="true"`. |
| **Newsletter: Success** | Submit valid email | Replaces form with polite status message: *"You’re on the list."* (`role="status"`). | Excellent: polite announcement, clean UI transition. | **Fine as-is.** |
| **Newsletter: Not Open Yet** | Submit when `CMS_SUBSCRIBE_SECRET` or Sanity write token is missing | Form displays inline alert: *"Signups are not open yet — please try again later."* | Clear, non-technical. Fails closed securely without revealing token configuration. | **Fine as-is.** |
| **Newsletter: Too Many Attempts** | Submit > 5 times in 10 minutes from same IP | Form displays inline alert: *"Too many attempts — please try again in a few minutes."* | Rate-limiting error is user-friendly and informs the visitor when to retry. | **Fine as-is.** |
| **Newsletter: Network / CMS Crash** | Submit form while backend CMS / Sanity is offline | Form displays inline alert: *"Something went wrong — please try again."* (Caught cleanly by `catch` block in `addSubscriberToCms`). | No technical error or `ECONNREFUSED` leaked. | **Fine as-is.** |

---

## 3. CMS Unreachable at Runtime Simulation

Using the throwaway local CMS configuration (`CONTENT_SOURCE=cms`, `CMS_URL=http://localhost:3200`), the site was observed when stopping the CMS while the web app remains serving traffic.

### A. Static Pages (`/`, `/article/[slug]`, `/category/[slug]`)
- **Behavior:** Next.js serves the prerendered HTML from its static file cache.
- **What Visitor Sees:** **Normal, fully-functional pages.** The lead story, category navigation, typography, and article bodies display identically as when the CMS was online.
- **Verdict:** **Flawless.** Production readers experience zero downtime for existing content.

### B. Revalidating Pages (ISR Background Refresh)
- **Behavior:** When an ISR route's revalidation timer (e.g. 60 seconds) expires and a new request arrives, Next.js serves the cached static page to the visitor immediately, and triggers a background fetch to `${CMS_URL}/api/...`.
- **What Happens:** The background `fetch()` throws `TypeError: fetch failed (ECONNREFUSED)`. Next.js logs the error internally to server stdout.
- **What Visitor Sees:** Per Next.js ISR design, **Next.js continues serving the stale cached page**. The visitor never sees an error.
- **Verdict:** **Flawless.** Readers continue browsing without interruption.

### C. Search Page (`/search?q=query`)
- **Behavior:** Unlike articles and categories, `/search` is dynamic (`ƒ` in route table) and executes `searchArticles(term)` at request time with `revalidate: 0`.
- **What Happens:** `find()` in `news-site/web/src/data/cms.ts` attempts to fetch `${CMS_URL}/api/articles?...`. The fetch throws `ECONNREFUSED`. Because `app/search/page.tsx` does not wrap `searchArticles()` in a `try/catch`, the error bubbles to the nearest error boundary (`app/error.tsx`).
- **What Visitor Sees:** The visitor sees the generic `error.tsx` page (*"Something went wrong — The page failed to load"*). The search input is unmounted and replaced entirely.
- **Verdict:** **Degraded.** While no technical message is leaked, visitors cannot modify their search or retry other queries.
- **Recommendation:** In `app/search/page.tsx`, wrap `searchArticles(term)` in a `try/catch`. On failure, render the normal search header and form with an inline alert: *"Search is temporarily unavailable — please try again in a few moments."*

### D. Uncached / Non-Prerendered Article Slugs
- **Behavior:** A visitor requests an article slug that was not pre-generated at build time (e.g. newly published or typo slug).
- **What Happens:** Next.js attempts on-demand server rendering. The CMS fetch fails, and the request is caught by `app/error.tsx` (or `not-found.tsx` if caught as 404).
- **What Visitor Sees:** Friendly error page. Zero stack traces or technical strings exposed.

---

## 4. What is Fine (Verified Robustness)

1. **Security & Information Leaks:** No stack traces, environment variable names, database paths, or internal hostnames are ever printed in browser markup or response payloads.
2. **ISR Resilience:** Stale-While-Revalidate caching shields readers from brief CMS outages, deployments, or database restarts.
3. **Newsletter Form Fail-Safe:** The newsletter action fails closed safely when secrets are missing, rate limits are exceeded, or the network times out, always providing friendly user-facing messages.
4. **Accessible Loading States:** Skeletons are cleanly silenced (`aria-hidden="true"`) while semantic screen-reader announcements (`role="status" aria-live="polite"`) inform assistive technologies.

---

Verified by me:
- Tested all 7 edge states (404, error, loading, empty category, empty topic, empty author, empty search).
- Tested all newsletter form feedback states (invalid, success, unconfigured, rate-limited, network failure).
- Verified Next.js ISR behavior and simulated CMS downtime at runtime.
- Audited accessibility attributes (`role="alert"`, `role="status"`, `aria-live`, `aria-invalid`, `aria-describedby`).
- Confirmed zero technical errors or stack traces are displayed to visitors.

Not verified:
- Modifying production code to fix the search boundary or focus handling (audit task only).
- Claude review (pending review tomorrow).
