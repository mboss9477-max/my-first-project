# CS NEWS backend design (M1)

| | |
|---|---|
| **Author** | Claude Code (v0.3) |
| **Reviewer** | Gemini (review of v0.1 incorporated; re-review of v0.3 requested) |
| **Decider** | The human owner |
| **Status** | DRAFT for decision. Nothing here is built or decided. |
| **Evidence** | Third-party facts were checked against official docs and repos on 2026-10-23. Items marked **[verify]** could not be confirmed. Payload's `main` is a 4.0 beta; the docs pages read were the 3.x docs. |

## 1. Owner requirements and constraints

**Essentials the owner listed**
1. Article management: create, update, delete, schedule; text, media, tags.
2. User accounts: registration, secure login, subscriber tiers (free vs premium).
3. Paywall: count article views and restrict content by subscription.
4. Content delivery API: structured article data for the website and mobile apps.
5. In-memory caching so breaking-news spikes do not crash the database.
6. Relational database: authors, articles, categories, comments.
7. External asset storage for high-resolution images and videos.
8. Full-text search by keyword, date, author.

**Constraint: build first with no paid subscriptions except the VPS. Spending is conditional.** The owner will invest money if the backend reaches the required quality, so paid items (object storage, a mail provider, managed backups, a bigger VPS) are not ruled out; they are *gated*. Nothing is bought until the Phase 1 quality gate in section 10 is passed and the owner approves each item. Everything below is chosen to cost nothing beyond the VPS until then, unless it is explicitly marked as a decision. Payment processing necessarily takes per-transaction fees when real money moves; see 6.

**Standing requirements**: the live site keeps working throughout and Sanity runs until the human approves its shutdown; static generation and 60 s revalidation stay (AGENTS.md S7); verified restorable backup before any migration (S16); migrations are committed files (S18); no secrets in the repo (S1); passwords hashed with a vetted algorithm (S16).

## 2. What Sanity gives us today

| Capability | Where it lives today |
|---|---|
| Editing UI, drafts, publish | `news-site/studio` (hosted Studio) |
| Content schema | `news-site/studio/schemaTypes/*` |
| Queries | GROQ in `news-site/web/src/sanity/queries.ts` |
| Image storage, CDN, resize, crop and focal point (hotspot), blur placeholder | Sanity CDN; `cdn.sanity.io` is in `next.config.ts` `remotePatterns` and the CSP `img-src` |
| Instant refresh on publish | Webhook to `web/src/app/api/revalidate` (`SANITY_REVALIDATE_SECRET`) |
| Draft preview | `web/src/app/api/draft-mode` (`SANITY_PREVIEW_SECRET`) |
| Roles and logins | Sanity's accounts (contributor role never built) |
| Backups, uptime | Sanity's responsibility |

**Current data model**: *article* (headline, slug, excerpt, author ref, byline override, publishedAt, updatedAt, category ref, topics refs, featured, heroImage with alt, caption and hotspot/crop, body, corrections list); *category*; *topic* (trending flag); *author*; *newsletterSubscriber*. Rules to preserve: alt text required once an image is set, and no dangling reference to an unpublished document. Volume: 13 articles (12 demos), 6 categories, 6 topics, 1 author.

## 3. Options

- **A. Fully custom backend.** Our own API, database and editor UI. Full control; we build and secure auth, roles, drafts, scheduling, editor integration, uploads, media library and admin UI. Months of work; the largest security surface.
- **B. Self-host Payload CMS** (code-first, Next.js, Postgres). Gives admin, roles, drafts, scheduling and uploads out of the box; we write schema, access rules and the reader-facing parts.
- **C. Self-host Strapi or Directus** as a separate service. Strapi puts Review Workflows and Audit Logs behind Enterprise and Releases and Content History behind a paid plan; Directus's licence is source-available, not MIT. Both weaker on cost and licensing than B.

**Verified facts, Payload** ([installation](https://payloadcms.com/docs/getting-started/installation), [database](https://payloadcms.com/docs/database/overview), [migrations](https://payloadcms.com/docs/database/migrations), [rich text](https://payloadcms.com/docs/rich-text/overview), [drafts](https://payloadcms.com/docs/versions/drafts), [uploads](https://payloadcms.com/docs/upload/overview), [auth](https://payloadcms.com/docs/authentication/overview), [admin](https://payloadcms.com/docs/admin/overview), [stripe plugin](https://payloadcms.com/docs/plugins/stripe), [search plugin](https://payloadcms.com/docs/plugins/search)):
- MIT licence. Next.js 16 supported from **16.2.6**; this repo is on 16.3.1. **Node requirement inconsistent** (docs `^22.23.4 || >=24.22.1`, package engines `>=24.22.1`; our repo says >=20), so the VPS build's Node version must be checked.
- Postgres via Drizzle. Migrations are committed SQL files; dev uses push mode, which we ban against production (S18).
- Lexical rich text stored as JSON. Slate deprecated, removed in 4.0.
- Per-operation access functions; a role can create drafts but be blocked from publishing; scheduled publishing exists (`schedulePublish`) but needs a running Jobs queue.
- A **separate auth-enabled collection for readers** is supported, with the admin limited to one collection (`admin.user`). Email verification and password reset are built in. How mail is sent (SMTP or adapter) was not confirmed **[verify]**.
- Official Stripe plugin: customer and product sync plus webhook handlers; it does not decide entitlements, our handlers do. Official search plugin: a synced `search` collection in our own database; whether it uses Postgres full-text was not confirmed **[verify]**.
- Uploads: local disk by default, `sharp` for resizing, S3 adapter available. Concurrent uploads multiply memory use; no sizing guidance found **[verify]**.
- Beta warning: choose a stable release and check what 4.0 changes before building.

**Verified facts, infrastructure**
- **Hetzner Object Storage** is S3-compatible but a paid subscription (about 6.49 EUR per month excl. VAT per its page). **Cloudflare R2** has a free tier (10 GB-month, no egress charges per its docs); whether an account needs a payment method on file was not checked. **MinIO's community repo is archived and unmaintained as of 2026-04-25**, so we should not self-host it. Garage not evaluated.
- **Postgres full-text search** is built in (tsvector, GIN indexes, ranking, language configs) and combines with ordinary SQL filters for date and author. No typo tolerance natively; `pg_trgm` helps but needs extra setup. **Meilisearch** Community is MIT and typo-tolerant by default; RAM need not found **[verify]**.
- **Next.js self-hosting**: a single `next start` instance with persistent disk needs no Redis; the ISR cache lives on local disk. A shared cache handler (Redis or S3) is needed only for multiple instances. On Coolify, redeploying can lose that disk cache unless a volume is mounted (inference, not docs). **Redis 8+** is AGPL (or RSAL/SSPL); **Valkey** is BSD under the Linux Foundation.

## 4. Architecture

```
Readers --> csnews.news (Next.js, static + ISR, as today)
                |  HTTP, internal network, cached 60 s, webhook revalidation
                v
          cms.csnews.news (Payload as its OWN Next app/container)  --> Postgres (own volume)
                |                                                        ^
          editors, writers (admin UI)              nightly dump --> off-server backup
                v
           media on a persistent volume (images; no video hosting)
```

**Process isolation (accepted from Gemini's review).** The CMS runs as a separate container and Next app, not inside the public site. An admin-side crash, memory spike or vulnerability must not take the reader site down. The public site reads through the CMS REST API (or a read-only database role), never the admin. Gemini's figure of "1 to 1.5 GB" memory for image processing is **unverified**; the VPS capacity must be measured (see 9).

**Data seam.** Pages call functions in `web/src/data/`, not Sanity directly. First implementation wraps Sanity with no behaviour change; the second reads the CMS. This keeps UI work unaffected by cutover.

## 5. Essentials: design and verdict

| # | Essential | Design | Cost | Phase |
|---|---|---|---|---|
| 1 | Article management, scheduling, media, tags | Payload collections (articles, categories, topics, authors, media), drafts plus `schedulePublish` with a Jobs worker | 0 | 1 |
| 4 | Content API for site and mobile apps | Payload REST (GraphQL optional) with documented access rules; the public site and any future app use the same API | 0 | 1 |
| 7 | External asset storage | **Images**: persistent volume on the VPS, off-server backup. **Video**: embed from YouTube or Vimeo, do not host. Object storage (R2 free tier, or paid) is a later swap through Payload's S3 adapter | 0 | 1 |
| 6 | Relational database | Postgres on the VPS, committed migrations. Comments: see deferred | 0 | 1 |
| 2 | Reader accounts, tiers | Separate `readers` auth collection (verified supported), tier stored on the reader, set only by payment webhooks. Needs transactional email (free-tier provider or SMTP, **decision**) | 0 to low | 2 |
| 8 | Full-text search | Postgres full-text search plus `pg_trgm` for typos, filter by date, author and category. Meilisearch only if this proves inadequate | 0 | 2 |
| 3 | Paywall and view metering | See 6. Needs readers and payments first | per-transaction fees only | 3 |
| 5 | In-memory caching | **Not needed yet.** One Next instance uses its disk cache, and ISR already absorbs traffic spikes for static pages. Mount a volume for the cache on Coolify. Add Valkey (BSD) only when running several instances or after load tests show database pressure | 0 | later |

**Verdict.** Option B, staged, self-hosted, with the CMS isolated. It is the only path that gives a real editor and the full essentials list at zero recurring cost beyond the VPS and with the least code we must secure ourselves. Option A is possible but would take far longer for the same result. This is a recommendation; the stack decision is the human's.

**Deferred or declined, and why**
- **Comments**: the owner's list mentions them in the data model. They need moderation, spam control and legal handling. Recommend after Phase 3, or never.
- **Redis**: see row 5.
- **Hosted video, paid cloud storage, managed search**: conflict with the budget.
- **Mobile apps**: out of scope; the API is the only commitment.

## 6. Paywall, in more detail (Phase 3)

- **Problem**: our pages are statically generated, so everyone gets the same HTML. Reading `cookies()` in a page makes the route dynamic (Next docs).
- **Design**: static pages carry only the headline, excerpt and a teaser. The full premium body is fetched on demand from an authenticated endpoint that checks the session and tier on the server. The body is never in the static HTML or the public cache. Enforcement is server-side; hiding content in the browser alone is not access control.
- **Metering**: count views per signed-in reader on the server; anonymous metering by cookie is bypassable and is accepted as soft.
- **Billing**: Stripe Checkout (hosted) and the customer portal keep card data off our servers; tier changes come only from verified webhook events. Stripe's pricing and the events we need were not fully verified **[verify]**. Stripe has no monthly fee by itself but charges per transaction; the owner must accept that, and no money moves until a legal and tax check is done (not an agent decision).
- **Not before**: reader accounts (Phase 2) and the threat model (7).

## 7. Security: threat model first (S16)

Required before any login goes live: `docs/threat-model.md` (Claude drafts, Gemini reviews). Must cover: password hashing and login throttling, session cookies (HttpOnly, SameSite), CSRF, account recovery, reader versus staff separation, admin exposure (restrict by network or path, strong staff passwords, 2FA if available), upload validation and size limits, webhook signature verification, rate limiting, secrets handling (S17), backups and restore, patching process.

## 8. Rich text, images, editing UX

**Rich text.** Payload's Lexical, stored as JSON. Rendering on the site goes through a mapper onto our Tailwind tokens. **Migration risk (accepted from Gemini)**: Portable Text uses spans with `markDefs`; Lexical uses nested nodes and formatting bitmasks. Inline images with captions and links do not map automatically, and a plain text hash will differ. The migration script therefore needs its own transformer, with a per-article report comparing plain text, link targets, image count and alt text, plus a visual check by the human.

**Images.** Replace Sanity's resize and blur placeholder with generated sizes (`sharp`) and a stored blur placeholder. **Focal point (accepted from Gemini)**: store `{x, y}` per image and add an editor control; the current hotspot/crop behaviour is something editors rely on and must not silently disappear. Enforce upload size limits and keep alt required when an image is set.

**Editing safety (accepted from Gemini)**: autosave with a visible "saved" indicator, optimistic-concurrency check so two people do not silently overwrite each other, slug generated from the headline with conflict detection and a confirmation before changing a published slug, no raw HTML entry for writers. Payload's drafts and versions provide part of this; what it does not cover must be tested in the trial.

## 9. Trial (one day, before the decision)

1. Check the Node version Coolify builds with; compare with Payload's requirement.
2. Pick a stable Payload release; list what 4.0 changes.
3. Stand up Payload plus Postgres as its own container on a **staging** subdomain, empty database, no production data.
4. Test: writer draft-only role; scheduled publishing with the Jobs worker; email verification (needs a mail provider decision); focal point control; autosave and conflicts.
5. Convert 3 of the 13 articles Portable Text to Lexical and diff them.
6. Measure memory and disk on the VPS with CMS, Postgres and the site running together, and under an image upload.
7. Report: pass or fail per item, and a revised recommendation.

## 10. Roadmap

| Phase | Content | Exit criteria |
|---|---|---|
| 0 | Owner decisions, trial (9), threat model | Stack accepted by the human |
| 1 | CMS service, schema, roles, media, data seam, migration to staging, visual sign-off, backup and restore proof, production cutover (S5) | **Quality gate** (below), then live site reads from the new backend; Sanity read-only |
| 2 | Reader accounts, email, search | Threat model reviewed; login tested |
| 3 | Subscription tiers, paywall, metering, Stripe | Legal and tax check by the owner; webhook tests |

**Phase 1 quality gate (the point at which the owner may invest).** All must be true on staging: (1) a non-technical writer completes create, edit, add image, save draft and submit for review without help; (2) an editor publishes and the live page updates within 60 s; (3) the 13 articles migrated with a clean per-article report and the owner's visual sign-off; (4) a backup was restored successfully on a clean machine; (5) typecheck, build and tests pass in CI; (6) the threat model items marked for Phase 1 are done; (7) the CMS and the public site were measured together on the VPS under an image upload without the public site degrading. Only after this gate does the owner decide on paid items.

## 11. API contract (from Gemini's section 9, kept as a starting point)

Applies to custom UIs or app clients. If Payload is chosen, its REST API replaces most of this; the *behaviours* below remain requirements.
- Auth: login sets an HttpOnly, SameSite session cookie; `GET /api/auth/me` returns role.
- Articles: list with status, page, limit, search and category filters; create draft; update with `If-Match` version (409 on conflict); publish and unpublish for editors and admins only; publish validates alt text, category and hero image.
- Media: multipart upload with `alt`, `caption`, `focalPoint`; returns dimensions, blur placeholder and sizes.
- Errors: RFC 7807 problem details with field-level messages.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Payload main is a 4.0 beta; Node requirement may exceed the VPS build | Trial step 1 and 2 |
| Running our own auth, sessions and uploads | Threat model, vetted libraries, backups, restore test |
| Single VPS capacity (site, CMS, Postgres, uploads) | Measure in trial; admin and public site isolated |
| Single VPS is a single point of failure | Off-server backups, tested restore |
| Rich-text conversion loses content | Own transformer, per-article report, human check, migrate while volume is small |
| Paywall in a static site | Server-enforced body fetch (6) |
| Money, tax and legal exposure from subscriptions | Owner decision before Phase 3 |
| Scope creep (comments, mobile apps) | Deferred in 5 |

## 13. Decisions needed from the human

| ID | Decision | Recommendation |
|---|---|---|
| Q6/Q9 | Stack: custom or self-hosted CMS | Option B, staged, after the trial |
| Q5 | Scope | Phases 1 to 3 as in 10; comments deferred |
| New | Transactional email for password resets and invites | A free-tier provider or SMTP: needs an owner-created account; not chosen yet |
| New | Off-server backup destination | Needs an account or your own computer; Cloudflare R2's free tier is one option, payment-method need unchecked |
| Q8 | Cutover length; how long Sanity stays read-only | Parallel run, then read-only for 30 days |
| New | Subscriptions: pursue, and who handles tax and legal | Decide before Phase 3 |
