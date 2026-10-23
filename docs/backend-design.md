# CS NEWS backend design (M1)

| | |
|---|---|
| **Author** | Claude Code (draft v0.1) |
| **Reviewer** | Gemini (adds section 9: editor UI, rich text, API contract) |
| **Decider** | The human owner |
| **Status** | DRAFT for review. Nothing here is built or decided. |
| **Evidence quality** | Section 3 facts were checked against each project's official docs and repos on 2026-10-23 (v0.2). Items still marked **[verify]** could not be confirmed and must be checked before a decision rests on them. Payload's `main` branch is a 4.0 beta, while the docs pages read were the 3.x docs, so behaviour may differ in 4.0. |

## 1. Goal and scope

Replace Sanity with a backend we control, without taking the live site down.

**In scope (v1, per the owner's default)**: content storage (articles, categories, topics, authors, corrections, newsletter signups, images); an editing UI for non-technical writers; access control (writers draft, editors publish); the data layer the web app reads from.

**Out of scope (v1)**: reader accounts, comments, paid subscriptions, multilingual (later phase; the vendor choices already made still apply).

**Hard requirements**
- The live site keeps working throughout; Sanity runs until cutover is verified and the human approves shutdown.
- Static generation and 60 s revalidation keep working (AGENTS.md S7).
- A verified, restorable backup before any migration (S16). Migrations are committed files (S18).
- No secrets in the repo (S1). Passwords hashed with a vetted algorithm, never our own scheme (S16).

## 2. What Sanity gives us today (what we must replace)

| Capability | Where it lives today |
|---|---|
| Editing UI, drafts, publish | `news-site/studio` (hosted Studio) |
| Content schema | `news-site/studio/schemaTypes/*` |
| Queries | GROQ in `news-site/web/src/sanity/queries.ts` |
| Image storage, CDN, resize and crop, blur placeholder | Sanity CDN; `cdn.sanity.io` is in `next.config.ts` `remotePatterns` and in the CSP `img-src` |
| Instant refresh on publish | Webhook to `web/src/app/api/revalidate` using `SANITY_REVALIDATE_SECRET` |
| Draft preview | `web/src/app/api/draft-mode` with `SANITY_PREVIEW_SECRET` |
| Roles and logins | Sanity's own accounts (the contributor role was never built) |
| Backups, uptime | Sanity's responsibility |

The last two rows are the main reason this is a risk increase: today someone else runs authentication, storage and backups.

### Current data model

- **article**: headline, slug, excerpt (max 280 recommended), author (ref), byline override (guest writers), publishedAt, updatedAt, category (ref, exactly one), topics (refs, many), featured (bool), heroImage (with alt, caption, hotspot/crop), body (rich text: paragraphs plus inline images with alt and caption), corrections (list of {correctedAt, note}).
- **category**, **topic** (has a "trending" flag), **author** (name, slug, role, bio), **newsletterSubscriber**.
- Rules to preserve: alt text required once an image is set; warning when a reference points at an unpublished document (in Sanity a published article can reference a draft and the value silently vanishes on the live site; a new system should prevent that).
- Volume: 13 articles (12 are fictional demos), 6 categories, 6 topics, 1 author, a handful of images. Migration is small today and gets more expensive with every real article.

## 3. Options

### A. Fully custom backend
Our own API and database plus our own editor UI.
- Control over everything, no CMS lock-in.
- We build and maintain: auth, roles, drafts and publishing workflow, rich-text editor integration, image upload and processing, media library, admin UI, validation, backups. This is months of work for two agents with one human reviewer, and the highest security risk.

### B. Self-host Payload CMS (code-first, embedded in Next.js)
Verified in official docs ([installation](https://payloadcms.com/docs/getting-started/installation), [database](https://payloadcms.com/docs/database/overview), [migrations](https://payloadcms.com/docs/database/migrations), [rich text](https://payloadcms.com/docs/rich-text/overview), [drafts](https://payloadcms.com/docs/versions/drafts), [uploads](https://payloadcms.com/docs/upload/overview)):
- MIT licence (package.json; the root LICENSE URL returned 404).
- Installs into an existing Next.js app. Supported Next versions include **16.2.6 and later**; this repo is on 16.3.1.
- **Node requirement is stated inconsistently**: docs say `^22.23.4 || >=24.22.1`, `packages/payload` engines say `>=24.22.1`. Our repo says Node >= 20. The server's Node version must be checked.
- Postgres via Drizzle (`@payloadcms/db-postgres`). Migrations are committed SQL files in `src/migrations`; development uses push mode by default, so we must forbid push against production (S18).
- Rich text: Lexical by default, stored as Lexical JSON. Slate is deprecated and removed in 4.0.
- Access functions per operation. A role can create drafts and be blocked from publishing (docs example restricts updates to `_status: draft`). Scheduled publishing exists (`schedulePublish`) but needs a Jobs queue running.
- Uploads: local disk by default, `sharp` for resizing, S3-compatible adapter available and recommended for Node hosts.
- Separate admin deployment: **not stated in the docs read [verify]**. A remote REST/GraphQL API and a beta SDK exist, but the admin is served by `@payloadcms/next` inside a Next app, so the admin sharing a process with the public site is the likely default.
- Memory sizing guidance was not found [verify]. Concurrent uploads multiply memory use.
- The `main` branch is a **4.0 beta**. We must choose a stable version and check what 4.0 changes before building.

Fits our stack. Gives an admin panel with roles and drafts, so we write schema and access rules instead of an editor. Learning curve is reported as steeper than UI-first tools (reviewer opinion, not verified).

### C. Self-host Directus or Strapi
Verified in official sources ([Strapi LICENSE](https://github.com/strapi/strapi/blob/main/LICENSE), [Strapi docs](https://docs.strapi.io/cms/intro), [Directus licence](https://github.com/directus/directus/blob/main/license), [Directus pricing](https://directus.com/pricing)):
- **Strapi**: Community Edition is MIT, but code in `ee/` directories is under a separate Enterprise licence. Postgres supported (14+). Per-action permissions including publish exist on the free tier (RBAC page, **confirm on the Draft & Publish page [verify]**). **Review Workflows and Audit Logs require an Enterprise plan; Releases and Content History require a paid Growth plan.** Scheduled publishing not confirmed. Rich-text format not confirmed [verify].
- **Directus**: **not MIT.** It uses the Monospace Sustainable Core License 1.0, which allows internal use and bars "Competing Use", and converts to GPL-3.0 four years after release. The free core tier needs no licence key, and organisations under $5M revenue and 50 employees can get a free "Open Innovation Grant". The free tier lists "Advanced RBAC", but whether a draft-only writer role works is **not verified**. Rich text is stored as HTML. Minimum 512 MB, recommended 2 vCPU / 2 GB. Docker required. Postgres supported.
- Both run as separate services, which isolates the admin from the public site. We would still write the data layer and migration and deal with a second service in Coolify. Claims that their admin UIs are friendlier for non-technical users are reviewer opinion only.

### Comparison

| Criterion | A. Custom | B. Payload | C. Directus/Strapi |
|---|---|---|---|
| Time to a usable editor for the family writer | Slowest | Fast | Fast |
| Fits current Next.js code | Yes | Best | Via REST/GraphQL |
| Admin isolated from public site | Yes | Only if deployed separately | Yes |
| Security surface we own | Largest | Medium | Medium |
| Lock-in | None | Low (MIT, Postgres) | Low to medium (Directus licence is source-available; Strapi Enterprise features are paid) |
| Needs human-created third-party accounts | None | None if self-hosted | None if self-hosted |
| Ongoing patching burden | Ours | Ours (upstream releases) | Ours (upstream releases) |

### Recommendation (for the human to accept or reject)
Lean **B (Payload, self-hosted on the existing VPS with Postgres)**, pending the remaining [verify] items and a one-day spike. It keeps our stack, is plain MIT, and gives a real editor without us writing one, which is the largest single cost in option A. The checked facts weaken C: Strapi puts review workflows behind Enterprise, and Directus's licence is source-available rather than MIT. Spike goals: confirm the Node version and stable Payload release that work with our Next 16.3.1 on Coolify, test the writer draft-only role, test Portable Text to Lexical conversion on the 13 articles, and measure memory on the VPS. **If the owner's intent is a fully bespoke backend regardless of cost, A is possible but should be built in stages on top of this same design** (data seam, migration scripts, API contract).

## 4. Hosting and data

- Postgres on the existing Hetzner VPS under Coolify, with scheduled dumps to storage off that server. Managed Postgres (Neon, Supabase) was suggested; it adds an account, recurring cost and lock-in, and is not needed to start. Decision needed (Q6).
- **Backups**: nightly encrypted dump to off-server storage, plus a documented, *tested* restore. No migration to production until a restore has been proven once.
- **Capacity check needed**: confirm VPS RAM and disk can host the site, Postgres and a CMS together. Not yet measured.

## 5. Images

- Store uploads on a Coolify persistent volume or S3-compatible bucket. A bucket survives server loss; a volume is simpler. Decision needed.
- Replace Sanity's on-the-fly resize and blur placeholder with `next/image` plus generated sizes and a stored blur hash. Update `remotePatterns` and CSP `img-src` accordingly.
- Preserve alt text and caption; keep alt required when an image is set.

## 6. Rich text and migration

- Sanity stores Portable Text (JSON blocks). Options: keep Portable Text as the stored format via an editor that supports it, or convert to the new editor's format (Lexical JSON for Payload **[verify]**).
- Body content in the 13 articles is paragraphs and inline images, which are straightforward to convert. A one-off script with a diff report (block count, text hash per article) proves nothing was lost.
- Do this migration early. Cost grows per real article.

## 7. Auth and roles

- Roles: **writer** (create and edit own drafts, cannot publish), **editor** (review and publish), **admin** (users, settings). Matches the planned moderation loop: writer drafts, editor reviews, editor publishes.
- Threat model required before any login goes live (S16): password hashing, session storage, rate limiting, admin URL exposure, upload validation, CSRF, account recovery. To be written as `docs/threat-model.md` by Claude and reviewed by Gemini.

## 8. Cutover (proposal, for human decision)

1. Build the new backend beside Sanity, deployed to a staging subdomain, no production changes.
2. Add the data seam `web/src/data/` so pages call our functions, not Sanity directly. First with a Sanity implementation (no behaviour change), then a second implementation for the new backend.
3. Migration script runs against staging, with a verified diff against Sanity.
4. Human reviews the staging site visually (AGENTS.md visual sign-off).
5. Production cutover is an S5 action: backup first, human go-ahead, point production at the new data source, keep Sanity read-only for a fixed period, then shut it down only on human approval.
6. Webhook-based revalidation and draft preview get new equivalents. Never leave endpoints unauthenticated.

## 9. For Gemini: editor UI, rich text, API contract (to be written by the reviewer)

Please add:
- Your view of the editor needs for a non-technical writer (what must be effortless, what is dangerous).
- Which rich-text editor and stored format you would choose and why.
- The proposed API contract between backend and any custom UI (resources, fields, errors), if option A or a custom editor on top of B/C is chosen.
- Anything in sections 1 to 8 you think is wrong. State it with evidence.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Some third-party facts remain unverified; Payload main is a 4.0 beta | Resolve [verify] items and run the spike before deciding |
| Payload's stated Node requirement may exceed what the VPS builds with | Check the Node version in Coolify first |
| Running our own auth and storage | Threat model, vetted libraries, backups, restore test |
| Admin and public site share a process (Payload embedded) | Separate deployment, or accept with the threat model |
| Rich-text conversion loses content | Diff report, migrate while volume is small |
| Single VPS is a single point of failure | Off-server backups, documented restore, later replica |
| Scope creep (reader accounts, comments) | Out of scope for v1 |

## 11. Decisions needed from the human

| ID | Decision |
|---|---|
| Q6 | Stack and hosting: accept the recommendation (B on the VPS), choose another option, or ask for a spike first |
| Q9 | Custom build (A) or self-hosted CMS (B or C) |
| Q8 | Cutover length and how long Sanity stays read-only |
| New | Image storage: volume or S3-compatible bucket (needs an account) |
| New | Where off-server backups go (needs an account) |
