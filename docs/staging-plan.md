# Staging plan: the new CMS on the server

**Status:** a plan. Nothing in this file has been done. Approved by the owner on 2026-10-25 *as a plan only*: every server step below needs the owner's explicit "go" in chat, and Claude says what the step is, why, how to undo it and how to check it **before** doing it (AGENTS.md S5). One approval covers one step.

**Purpose:** run the CMS and its Postgres on the server, with no production data, so we can (1) rehearse the migration, (2) run the writer walkthrough with a real person (quality gate G1 in `backend-plan.md`), (3) measure memory with everything running, and (4) rehearse the cutover and its rollback. Staging is also where `docs/cutover-runbook.md` gets tested.

Plan task numbers: 1.4 (staging), 1.7 (Cloudflare Access), 1.11 (backups), 1.13 (migration), 1.17 (measurement). Facts about the server come from `docs/handoffs/2026-10-23-claude-backend-phase0-1.md`: 4 vCPU, 7.75 GB RAM (about 6.3 GB free), 50 GB free disk, **no swap**, the website builds on Node 22.19.0, firewall allows only ports 22, 80 and 443.

## What staging is made of

| Piece | What | Notes |
|-------|------|-------|
| Postgres 17 | A Coolify database resource, internal network only | CI tests on 17. No public port (threat T17). Own persistent volume. |
| CMS | A Coolify application from this repo, base directory `/news-site/cms`, own subdomain | Needs **Node 24** (Payload wants 22.23.4+ or 24.22.1+; the server builds with 22.19.0). Own persistent volume for uploaded images. Memory limit set. |
| Staging website | A second Coolify application from `main`, base directory `/news-site/web`, own subdomain, `CONTENT_SOURCE=cms` | Needed to test the publish webhook (a publish shows within 60 s) and to compare pages. The live website is not touched. |
| Access gate | Cloudflare Access in front of the CMS admin | Owner decision 2026-10-24. |

Subdomain names are the owner's choice; this plan uses `cms-staging` and `site-staging` under `csnews.news` as placeholders.

## Decisions the owner must make first

| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | Subdomain names for staging CMS and staging website | `cms-staging.csnews.news` and `site-staging.csnews.news` |
| D2 | Memory budget: how much RAM the CMS and Postgres may use | CMS 1.5 GB, Postgres 0.75 GB as limits to start, then measure (task 1.17). These are estimates, not measurements. |
| D3 | Swap size | 2 GB swap file (protects the public site if something spikes; see threat T25) |
| D4 | Where off-server backups go (task 1.11) | The owner's own computer as a start, or Cloudflare's R2 free tier (whether it needs a payment method was not checked). No paid service before the quality gate. |
| D5 | Production CMS after G1: a **new empty database and a second CMS app**, or **reset and reuse staging** | New empty database in the same Postgres, second CMS app, staging app stopped after cutover (no reset of anything). Reusing staging would mean wiping test accounts and articles, which is destructive and needs its own backup first. |

## Before any server change (owner)

These are the owner's own checks, listed so nothing is assumed:
- [ ] A recent Hetzner snapshot of the server exists (the owner marked this "?").
- [ ] The Coolify dashboard's secrets file is backed up off the server ("?").
- [ ] The owner can reach the Coolify panel at its HTTPS address and the server over SSH.

## The steps

Each step: **what**, **who**, **check**, **undo**. "Owner OK" means a go in chat for that one step.

### S1. Add a swap file (task: threat T25)
- **What:** on the server, create a 2 GB swap file, turn it on, make it permanent, set a low swappiness.
- **Who:** Claude over SSH, after the owner's OK (and the owner must grant the SSH access: Gemini never uses it, S4).
- **Check:** `free -h` shows the swap; the website still answers (home page, an article).
- **Undo:** `swapoff` and delete the file; remove its line from `/etc/fstab`.

### S2. DNS records
- **What:** two records in Cloudflare for the staging names. They start as **DNS only** so the server can obtain its HTTPS certificates. The CMS record is switched to **proxied** later (S6), because Cloudflare Access only works on proxied names.
- **Who:** the owner in Cloudflare, or Claude if the owner grants it per step.
- **Check:** the names resolve to the server; the live site is unaffected.
- **Undo:** delete the records.

### S3. Postgres
- **What:** create a Postgres 17 database in Coolify, internal network only, with a persistent volume and a memory limit. Coolify generates the password; it is never typed into chat or the repo.
- **Who:** owner and Claude together in the Coolify panel; owner OK.
- **Check:** the database encoding is UTF-8: run `SHOW server_encoding;` and expect `UTF8` (Arabic and Chinese text cannot be stored otherwise; found by the language spike); from the CMS container later (S4) a migration succeeds; from outside, the database port is closed.
- **Undo:** delete the resource (it is empty).

### S4. The CMS application
- **What:** create the CMS app in Coolify: repository `main`, base directory `/news-site/cms`, Node 24, build `npm ci && npm run build`, a step that runs `npm run migrate` before each start, start `npm run start`, port 3200, memory limit, a persistent volume for uploaded images (Payload stores them in the `media` folder next to the app; to be confirmed on the first deploy), the subdomain, and **automatic deploy switched off** so a merge to `main` does not redeploy the CMS by itself.
- **Environment variable names to set** (values only in Coolify, never in the repo, S17): `PAYLOAD_SECRET`, `DATABASE_URL`, `CMS_URL`, `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` (optional: `WEB_REVALIDATE_DELAY_MS`).
- **Important:** do not make the hostname reachable by anyone before S6. A fresh Payload shows a "create the first user" screen to whoever opens it first. Either set the access gate first, or have the owner create the first admin immediately (S5) while the address is still unknown to others.
- **Who:** Claude with the owner in Coolify; owner OK.
- **Check:** the admin loads over HTTPS; `GET /api/articles` returns an empty list; `GET /api/users` answers 403; the GraphQL playground answers 404 (threat T23).
- **Undo:** stop and delete the app; the volume holds only test uploads.

### S5. First accounts
- **What:** the owner creates the first admin account on the CMS login screen, choosing their own password (S3: agents never see or choose it). The owner then creates an editor and a test writer.
- **Who:** the owner.
- **Check:** each role signs in; a writer cannot see the user list or publish (the automated tests cover this; this is the human check).

### S6. Cloudflare Access in front of the admin (task 1.7)
- **What:** switch the CMS record to proxied; create an Access application for the admin (`/admin` and the login endpoint `/api/users/login`) with a policy that allows only the named staff emails, with a one-time code or the owner's chosen login method.
- **Must stay open:** the public read paths the website and readers need (`/api/articles`, `/api/media/file/...`, the other collection reads), otherwise the website cannot build and images break. Access applies to the paths we list; the CMS's own login and its lockout still apply behind it.
- **Verify before relying on it:** Cloudflare's pricing page says Zero Trust is free for up to 50 users; whether **path-scoped** applications are available on the free plan was not confirmed, and one recent community post reported being asked to consent to charges. **The owner must not accept any payment or consent prompt**; if one appears, stop and tell Claude. If path scoping is not free, the fallback is to protect the whole CMS hostname and serve images and public reads from a second hostname.
- **Check:** from a private browser window, `/admin` shows the Access login, not the CMS login; the website's build can still read `/api/articles`; an image URL loads without logging in.
- **Undo:** delete the Access application (the CMS then relies on its own login only, with lockout).

### S7. Migration rehearsal (task 1.13)
- **Wait for task 1.8a first** (the language-readiness spike, `docs/master-plan.md`): if the CMS turns out to need per-language storage, content migrated before that has to be moved afterwards. The migration script and the website's data layer may then need a language argument.
- **What:** run `news-site/cms/scripts/migrate-from-sanity.ts` against the staging database. First a **dry run** (writes nothing), then, after the owner reads the report, an **apply** (writes to the staging database only, after typing the target name shown by the dry run).
- **Who:** Claude runs it (from a place that can reach the database); owner OK for the apply.
- **Check:** the report shows no problems; 13 articles, 6 categories, 6 topics, 1 author, 13 images; a second run skips everything.
- **Undo:** the staging database is disposable. The script never deletes anything.

### S8. Staging website against staging CMS
- **What:** create the staging website app in Coolify (`main`, `/news-site/web`, own subdomain) with `CONTENT_SOURCE=cms` and `CMS_URL`/`CMS_PUBLIC_URL`; add `REVALIDATE_SECRET` (same value as the CMS's `WEB_REVALIDATE_SECRET`). Its build must be able to reach the CMS over the network.
- **Check:** compare every page's text and images with the live site (the method is in the cutover runbook, "Comparing pages"); same routes static, no console or CSP errors.
- **Undo:** delete the app.

### S9. Publish test and webhook
- **What:** as an editor, publish an edit and check the staging website shows it within 60 seconds; check a request to the refresh route without the secret is refused (401).
- **Check:** timings written down; both results in the handoff.

### S10. Measurement (task 1.17)
- **What:** with the live site, staging CMS, Postgres and the staging site all running, upload a few large photos and fetch pages in a burst while watching memory and swap (`free -h`, `docker stats`).
- **Check:** the public site stays responsive; memory stays under the limits. If not, change the limits or the plan **before** go-live.

### S11. Backups and a restore on a clean machine (task 1.11)
- **What:** a nightly encrypted Postgres dump plus a copy of the media folder to the place chosen in D4; then restore into an empty Postgres on another machine and confirm the articles and images are intact.
- **Who:** Claude writes the job and `docs/restore.md`; the owner provides the destination account (S5: creating credentials).
- **Check:** the restore works; the time it took is written down.

### S12. The writer test (gate G1, item 1)
- **What:** a non-technical writer follows `docs/writer-walkthrough.md` on staging without help. The owner watches and notes where they stall.
- **Check:** every row passes or becomes a fix.

## What this plan does not do
No production data is touched. The live website keeps reading Sanity throughout. No paid service is signed up for (the quality gate comes first). The server addresses and every secret stay out of the repo: this file names variables, never values.

## Open risks
- Memory: building the CMS (Next and Payload) and the website at the same time on a server with 6.3 GB free and no swap could be killed. Do S1 first; deploy one app at a time.
- Coolify may need extra settings for a second app from the same repository; the first deploy will show.
- Access path-scoping on the free plan is unconfirmed (S6).
- Node 24 on Coolify must be available as a build setting; if not, a Dockerfile in `news-site/cms` is the fallback (Claude's area, a normal PR).
