# CS NEWS backend plan sheet

| | |
|---|---|
| **Scope** | Backend only. Website design and front-end features come after (Phase 4, not planned here). |
| **Owner** | The human owner decides, approves production actions, merges, and creates accounts. |
| **Agents** | Claude Code (data, platform, integration). Gemini (UI, tests, quality). Rules: root `AGENTS.md`. |
| **Companion docs** | `docs/backend-design.md` (why and what), `docs/threat-model.md` (security). This sheet is *how and in what order*. |
| **Status** | DRAFT v1. Nothing here is decided or started except where marked **done**. |
| **Estimates** | Sizes are guesses, not commitments. **S** = one short agent session. **M** = two or three sessions. **L** = several sessions and a review cycle. |

## How to read this sheet

- **Owner column**: **C** Claude, **G** Gemini, **H** the human owner.
- **S5** in the Risk column means a production-affecting action. It needs the human's explicit go-ahead in chat every time (AGENTS.md S5).
- **Acceptance** is the check a reviewer runs. A task is not done until it passes and the other agent has reviewed.
- Every task is one claimed draft PR (or a human action). Handoff file at the end of each session.
- Gates (**G0** to **G3**) are decision points. Nothing after a gate starts until the owner says so.
- **Budget rule**: build with no paid services except the VPS. Anything paid waits until gate **G1** and needs the owner's approval each time.

## Critical path

```
Node upgrade -> trial (P0) -> decision G0 -> staging + schema + data seam (P1)
  -> migration dry runs -> quality gate G1 -> production cutover -> Phase 2 -> G2 -> Phase 3 -> G3
```

The slowest links are the owner decisions (G0, G1), the trial, and the rich-text migration. UI work for the editor can run in parallel with the data seam.

## Done so far

| Item | State |
|---|---|
| Two-agent working agreement (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) | **Done**, merged (PR #3) |
| `.gitattributes` line-ending normalisation | **Done**, merged (PR #5) |
| Backend design document | Draft, PR #4, reviewed once by Gemini, v0.3 |
| Threat model | Draft, PR #6, reviewed and approved by Gemini |
| Test runner (vitest) | **Done**, merged (PR #8) |
| CMS trial (Payload, roles, converter, CI) | **Done**, merged (PR #9); editorial workflow and upload limits (#13) |
| Schedule guard, lockout, sessions, CSRF origin (T22 and others) | **Done**, merged (#16, #19) |
| Publish webhook (task 1.10) | **Done**, merged (#18, #22) |
| CMS on Postgres (task 1.3) | **Done**, merged (#23); SQLite kept for quick local runs |
| Adversarial tests | **Done**, merged (#14) |
| Data seam, stage 1 (task 1.7) | **Done**, merged (#15); stage 2 (images, bodies) still to do |
| Writer walkthrough (P0.9) and editor UX proposal (1.12) | **Done** as documents, merged (#11, #12); no UI built |
| Staging (1.4), CMS implementation of the seam (1.9) | Not started; staging needs the owner's go-ahead (S5) |

## Phase 0: Decisions and trial

Goal: prove the recommended stack (Payload, Postgres, separate CMS app) works for us before committing. Output: a go or no-go and a revised recommendation. Cost: 0.

| ID | Task | Owner | Depends on | Output | Acceptance | Risk | Size |
|---|---|---|---|---|---|---|---|
| P0.1 | Upgrade local Node to the supported range (22.23.4+ on 22, or 24.22.1+ on 24) | H | none | `node -v` in range | Claude confirms the version | none | S |
| P0.2 | Read-only audit of the VPS: RAM, free disk, Docker/Coolify version, the Node version Coolify builds with, running services | C (needs H go-ahead for SSH) | none | short report in a handoff file | numbers recorded; nothing changed | S5 (SSH access) | S |
| P0.3 | Scaffold `news-site/cms` (Payload `3.92.0` pinned, SQLite for local), own dev port | C | P0.1 | draft PR with a running empty CMS | `npm run dev` serves the admin; typecheck and build pass | none | S |
| P0.4 | Define collections: articles, categories, topics, authors, media, newsletter-subscribers, staff users | C | P0.3 | schema files | fields match the current Sanity model (`backend-design.md` section 2) | none | M |
| P0.5 | Roles and access rules: writer (own drafts, no publish), editor (publish), admin | C | P0.4 | access code plus API tests | tests prove a writer cannot publish and anonymous users read published items only | none | M |
| P0.6 | Check drafts, autosave, versions and scheduled publishing behaviours | C | P0.4 | findings list | each behaviour tested or recorded as unsupported | none | S |
| P0.7 | Check image handling: resize sizes, upload limits, alt required, focal point support **[verify Payload has it]** | C | P0.4 | findings list and, if missing, a custom field proposal | upload of a large test image works without error; focal point result recorded | none | M |
| P0.8 | Portable Text to Lexical converter prototype and report on 3 articles (read-only from the public Sanity data) | C | P0.4 | converter plus diff report | report compares plain text, links, image count, alt text per article; differences listed honestly | none | M |
| P0.9 | Writer walkthrough checklist: what a non-technical writer must do, step by step, with pass/fail rows | G | none | `docs/writer-walkthrough.md` | covers create, edit, image, draft, submit, publish, correct, unpublish | none | S |
| P0.10 | Gemini review of the trial PR and findings | G | P0.3 to P0.8 | review comment with evidence | review includes what was run and one thing tried to break | none | S |
| P0.11 | Trial report and recommendation | C | P0.2 to P0.10 | `docs/backend-trial-report.md` | each design-doc `[verify]` item resolved or still open | none | S |
| **G0** | **Owner decision**: stack (custom vs Payload, Q6/Q9), scope (Q5), cutover length (Q8), mail provider (Phase 2), backup destination | H | P0.11 | decisions recorded in `AGENTS.md` and the design doc | owner states them in chat | none | none |

**Exit criteria for Phase 0**: every `[verify]` item in the design doc resolved; the owner has chosen. If the trial fails on a blocking item (for example a writer cannot be limited to drafts), we stop and re-plan, possibly toward a custom build.

## Phase 1: Content backend and cutover

Goal: the live site reads articles from our backend, writers and editors use our editor, Sanity is read-only. Cost: 0 until the quality gate.

| ID | Task | Owner | Depends on | Output | Acceptance | Risk | Size |
|---|---|---|---|---|---|---|---|
| 1.1 | Update `AGENTS.md`: CMS path, ports, ownership, any new rules | C (G reviews) | G0 | PR | merged; both agents confirm they read it | none | S |
| 1.2 | Environment variable inventory and `.env.example` (names only) | C | G0 | committed example file | no values in repo; every variable documented (S17) | none | S |
| 1.3 | Final schema on Postgres with committed migration files | C | G0 | `migrations/` | migrations apply to an empty Postgres and reproduce the schema; no push-style sync (S18) | none | M |
| 1.4 | Staging environment: Postgres and CMS as separate Coolify services on a staging subdomain, empty database | C with H | 1.3 | running staging CMS | admin loads over HTTPS; public site unaffected | S5 (Coolify, DNS) | M |
| 1.5 | Create real staff accounts (owner, editor, a test writer) | H | 1.4 | accounts | owner sets the passwords; agents never see them (S3) | S5 | S |
| 1.6 | Media pipeline: generated sizes, blur placeholder, size and type limits, required alt, focal point, storage on a persistent volume | C | 1.3 | upload works end to end | oversized and wrong-type uploads rejected; images load through `next/image`; memory stays inside budget in the 1.17 measurement | none | M |
| 1.7 | **Data seam** `web/src/data/` with an implementation that wraps Sanity, no behaviour change | C | G0 | PR | `tsc`, build and the route table before and after are identical (no route flips static to dynamic) | none | M |
| 1.8 | Tests for the data seam and pure helpers; add `npm test` to CI | G (tests), C (CI) | 1.7 and vitest PR | tests | CI runs them on every PR | none | S |
| 1.8a | **Language-readiness spike**: decide and test Payload localization with only English filled, before any content is migrated (retrofitting is costly). Questions and pass criteria: `docs/master-plan.md`, "Task 1.8a in detail" | C | none | `docs/localization-spike.md`, go or no-go, decision-log line | the 11 questions answered with evidence on a throwaway branch and local database; existing tests unchanged | none | M |
| 1.9 | CMS implementation of the seam; public site reads from the CMS API with 60 s revalidation | C | 1.4, 1.7 | PR behind a config switch | staging site renders all existing pages from CMS data; switch off returns to Sanity | none | L |
| 1.10 | Revalidation webhook on publish, with a secret and signature check; draft preview with a secret | C | 1.9 | route handlers | a publish on staging updates the page in under 60 s; requests without the secret are rejected | none | M |
| 1.11 | Update image config: `remotePatterns`, CSP `img-src`, URL helpers (replaces `cdn.sanity.io`) | C | 1.6 | PR | no CSP violations in the browser console on staging pages | none | S |
| 1.12 | Editor experience layer: branding, clear Draft / In review / Published labels, "Saved" indicator, slug conflict handling, no raw HTML for writers | G (UI), C (data and hooks) | P0.5, P0.6 | PR | the writer walkthrough passes with a non-technical person | none | L |
| 1.13 | Migration script Sanity to CMS: categories, topics, authors, articles, images, rich text, corrections | C | 1.3, 1.6, P0.8 | script plus per-article report | dry run on staging; report shows zero unexplained differences; owner visually signs off the 13 articles | none | L |
| 1.14 | Backups: nightly encrypted Postgres dump and media copy to the chosen destination, plus a restore procedure | C with H (destination account) | 1.4, G0 | cron or Coolify job and `docs/restore.md` | restore succeeded on a clean machine and the result was compared (S16) | S5 | M |
| 1.15 | Rollback plan for cutover | C | 1.9 | `docs/cutover-runbook.md` | step-by-step, tested on staging, includes how to point back at Sanity | none | S |
| 1.16 | Threat-model items marked Phase 1 implemented and reviewed | C (G reviews) | 1.3 to 1.12 | updated `docs/threat-model.md` | each Phase 1 row has a status and evidence | none | M |
| 1.17 | Load and memory measurement on the VPS: site, CMS, Postgres together, during an image upload and a traffic burst | C | 1.9, 1.6 | numbers in a handoff | public site stays responsive; CMS does not starve it | S5 (production-adjacent) | S |
| **G1** | **Quality gate** (below). Owner reviews and decides on paid items | H | 1.1 to 1.17 | signed checklist | all gate items true | none | none |
| 1.18 | **Production cutover** | C with H | G1 | live site on the new backend | see cutover steps below | **S5** | M |
| 1.19 | After cutover: 30 days Sanity read-only, then owner decides on shutdown | H | 1.18 | shutdown decision | owner approval (Sanity is not shut down automatically) | S5 | none |

**G1 quality gate (all must be true):**
1. A non-technical writer completes create, edit, add image, save draft and submit for review without help.
2. An editor publishes and the live page updates within 60 s.
3. All 13 articles migrated with a clean report and the owner's visual sign-off.
4. A backup was restored successfully on a clean machine.
5. Typecheck, build and tests pass in CI.
6. Phase 1 threat-model items are done.
7. The site and CMS were measured together under upload load without the public site degrading.

**Cutover steps (1.18), each needs the owner's go-ahead:** verified fresh backup; announce a short content freeze; stop Sanity writes; final migration and diff report; flip the config switch to the CMS; deploy (manual, human-triggered); verify the key pages, feeds, sitemap and images; keep the rollback ready; log the commit that went out.

## Phase 2: Reader accounts, email and search

Starts only after the owner approves it following G1. Needs a mail provider (owner-created account).

| ID | Task | Owner | Depends on | Output | Acceptance | Risk | Size |
|---|---|---|---|---|---|---|---|
| 2.1 | Choose and create a transactional email provider (free tier first) | H | G1 | account, sending domain verified | test email arrives and is not marked spam | S5 | S |
| 2.2 | Separate `readers` collection with email verification and password reset | C | 2.1 | PR | a reader cannot reach the admin; verification and reset work end to end on staging | none | M |
| 2.3 | Login hardening: throttling, lockout delay, generic errors, session cookie flags, CSRF | C | 2.2 | PR plus tests | brute-force test is throttled; cookie flags verified in a browser | none | M |
| 2.4 | Sign-up, sign-in, account and reset screens | G | 2.2 | PR | owner visual sign-off; keyboard and screen reader checks | none | M |
| 2.5 | Search: Postgres full-text index, `pg_trgm` for typos, filters by date, author and category, as a migration | C | G1 | API and migration | known-answer queries return the expected articles; typo test passes | none | M |
| 2.6 | Search page UI | G | 2.5 | PR | owner visual sign-off | none | S |
| 2.7 | Privacy policy and data handling text | H (with advice) | none | page content | owner approves | legal | S |
| 2.8 | Threat-model items marked Phase 2 implemented and reviewed | C (G reviews) | 2.2 to 2.5 | updated doc | each row has evidence | none | S |
| **G2** | **Owner decision** to proceed to subscriptions | H | 2.1 to 2.8 | decision | explicit | none | none |

## Phase 3: Subscriptions and paywall

Starts only after the owner has checked legal and tax obligations. The agents do not give legal or financial advice.

| ID | Task | Owner | Depends on | Output | Acceptance | Risk | Size |
|---|---|---|---|---|---|---|---|
| 3.1 | Owner decision: pursue subscriptions; who handles tax and legal | H | G2 | decision | recorded | legal | none |
| 3.2 | Payment provider account (Stripe), test mode first | H | 3.1 | account and test keys in an untracked file | agents never see live keys (S2, S3) | S5 | S |
| 3.3 | Tier model: free and premium on the reader record, changed only by verified payment events | C | 3.2 | schema and access rules | a reader cannot edit their own tier (API test) | none | M |
| 3.4 | Checkout and customer portal (hosted by the provider) plus webhook handlers with signature verification and idempotency | C | 3.2 | PR | forged and replayed webhooks are rejected; test-mode purchase upgrades the tier | none | L |
| 3.5 | Premium body endpoint: static pages carry teaser only; full text fetched from an authenticated route that checks tier server-side | C | 3.3 | PR | premium text is absent from the static HTML, RSC payload and shared caches; verified by fetching as an anonymous user | none | L |
| 3.6 | View metering per signed-in reader | C | 3.5 | PR | counts persist; reset rules documented | none | M |
| 3.7 | Paywall, upgrade prompt and account billing UI | G | 3.4, 3.5 | PR | owner visual sign-off; design rules respected (no popup newsletter pattern, calm motion) | none | L |
| 3.8 | End-to-end test in provider test mode, plus security review of money paths | C and G | 3.4 to 3.7 | test report | success, failure, cancel, refund and expiry all tested | none | M |
| **G3** | **Owner decision** to go live with real payments | H | 3.8 | decision | explicit; live keys supplied by the owner | **S5** | none |

## Language phase (master plan M6, after launch)

Owner question ML-1 (languages at launch, or first thing after) decides when. Task 1.8a above is not optional: it makes the CMS language-ready before content is migrated. Full task list: `docs/master-plan.md`, M6.

| ID | Task | Owner | Needs | Output | Acceptance | Risk | Size |
|----|------|-------|-------|--------|------------|------|------|
| L.1 | **Translator role**: drafts translations, cannot publish; a human reviewer who reads the language approves; an editor publishes. Per-language review status on each article | C | 1.8a | access rules, hooks, tests | tests prove a translator cannot publish, a reviewer approval is recorded and cannot be forged, an editor can publish only a reviewed translation | none | M |
| L.2 | Translator desk (queue of stories needing translation, source beside draft, review queue) | G (UI), C (data) | L.1 | PR | owner visual sign-off; keyboard and screen reader checks | none | L |
| L.3 | Language editions: URL structure, pages, feeds and navigation per language, with an honest fallback to English | C, G | 1.8a, L.1 | PR | a translated story is reachable in its language; an untranslated one says so | none | L |
| L.4 | hreflang links between language versions, `x-default` to English | C | L.3 | metadata in the page files | every translated page lists all its versions and itself; validated with a checker | none | S |
| L.5 | Per-language sitemaps and feeds (and news sitemaps where Google News applies) | C | L.3 | route handlers | each sitemap lists only that language's published stories | none | M |
| L.6 | The real language switcher (replaces the `EN` placeholder); shows only languages the page exists in; no popup | G (UI), C (data) | L.3 | PR | owner visual sign-off; works without JavaScript for links | none | M |
| L.7 | Machine translation (DeepL for Spanish and Mandarin) feeding drafts only; vendor approved by the owner first; data flow added to the threat model | C | owner approval of the vendor | PR, threat-model row | no unpublished text is sent without that approval; drafts always need human review | S5 (account, credentials) | M |
| L.8 | Arabic: right-to-left site and editor, tested with an Arabic-competent human | C, G | L.3 | PR | the human reviewer signs off | none | L |

## Cross-cutting work (every phase)

| Item | Owner | Rule |
|---|---|---|
| One claimed draft PR per task, titled `[WIP] <agent>: <topic>` | C and G | AGENTS.md workflow step 3 |
| Review with evidence before merge; human squash-merges | C and G, H | workflow steps 5 and 6 |
| UI changes need the owner's visual sign-off | H | workflow step 7 |
| Handoff file at the end of each session | C and G | `docs/handoffs/` |
| Dependency changes: one per PR, with a reason | C and G | S9 |
| Secrets: never in the repo, never printed | all | S1, S2, S17 |
| Migrations as committed files; production application needs go-ahead | C | S18, S5 |
| Patch process: review dependency and image updates on a schedule | C | threat model T16 |
| Update `AGENTS.md` when decisions change | C | after each gate |

## Human action list (what only the owner can do)

1. Upgrade Node (P0.1).
2. Approve read-only SSH to the VPS for the audit (P0.2).
3. Decide at G0, G1, G2, G3.
4. Create accounts: staff passwords (1.5), backup destination (1.14), mail provider (2.1), payment account (3.2).
5. Approve each production action (S5), merge PRs, trigger deploys.
6. Turn on GitHub branch protection for `main` (recommended, still open).
7. Supply policy text and take legal and tax advice where needed.

## Cost table

| Item | Phase | Cost until G1 | After G1 (owner decides) |
|---|---|---|---|
| VPS (existing) | all | existing | possibly a larger plan if measurements show a need |
| Postgres, CMS, media volume on the VPS | 1 | 0 | none |
| Off-server backups | 1 | 0 if copied to the owner's own computer; free tiers possible | paid storage optional |
| Email provider | 2 | n/a | free tier first; paid only if volume requires |
| Payment provider | 3 | n/a | no monthly fee assumed **[verify]**; per-transaction fees apply |
| Object storage for media | later | 0 | optional swap; free tier exists at one provider, payment-method need unchecked |
| Redis or Valkey cache | later | 0 | only if load tests show database pressure or several site instances run |

## Assumptions and open risks

- Payload `3.92.0` fits our needs. Unconfirmed: focal point, autosave, scheduled publishing, outgoing mail setup. Phase 0 settles these.
- The VPS can host the site, CMS and Postgres together. Unmeasured.
- Portable Text converts to Lexical well enough for the real articles. Unproven beyond three samples.
- Neither agent can reliably see rendered UI, so UI quality depends on the owner's sign-off.
- Gemini works through Antigravity with usage limits, so its tasks should be small and well-scoped.
- Scope creep: comments and mobile apps are deferred and not planned here.

## Next three actions

1. **H**: upgrade Node and tell Claude.
2. **C**: start P0.3 to P0.8 as a draft PR; **G**: finish the vitest PR, then P0.9.
3. **H**: say yes or no to the read-only VPS audit (P0.2).
