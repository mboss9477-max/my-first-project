# CS NEWS master plan: from day one to launch day

| | |
|---|---|
| **Owner** | The project owner decides, approves spending and production changes. |
| **Agents** | Claude Code (data, platform, integration) and Gemini (interface, tests, quality). Rules: `AGENTS.md`. |
| **Where things live** | **GitHub** holds the context (rules, decisions, history, task detail). **Notion** holds this whole plan, first day to launch day, for the owner to read. |
| **Last updated** | 2026-10-24 |

## 1. The goal, in the owner's words

> "Live" and "launch-ready" are different bars. **Live** = the site works at the domain. **Launch-ready** = live + backups + real content + the owner's father can publish independently. (Owner's pre-launch checklist, 2026-08-29.)

CS NEWS is an independent, multilingual news site at https://csnews.news: English now; Mandarin, Spanish and Arabic (right-to-left) later. The owner decided on 2026-10-23 to replace Sanity with a backend we control (self-hosted Payload CMS on Postgres), spending nothing beyond the server until a quality gate is passed.

## 2. How this plan runs (the plan system)

1. **This file** lists milestones **M0 to M7** with owners, dependencies, acceptance checks and gates. Detail for the backend lives in `docs/backend-plan.md`.
2. **Every task is a GitHub issue** in the milestone for its phase. Issues for Gemini carry the label `gemini-task` and are created by the owner's account (rule in `AGENTS.md`, "Task queue"); Claude's carry `claude-task`.
3. **Every change is a PR** with its checks recorded in `docs/progress-checklist.md`: what the author ran, what the other agent tested.
4. **Every decision** gets a dated line in `docs/decisions.md` in the same PR that acts on it.
5. **Every session ends with a handoff** file in `docs/handoffs/` (`AGENTS.md`, Handoff).
6. **Notion mirrors this plan.** GitHub wins when they disagree. Claude updates the Notion page at each milestone and handoff.

### Merge rule (set by the owner on 2026-10-24)
Claude merges a PR when **all three required CI checks are green AND the other agent has approved it in a PR comment** (for Gemini's PRs, Claude is that reviewer). Then, every time: confirm CI on `main`, confirm the live site answers (home, an article, the feed), and revert at once if it does not. Still needing the owner's explicit OK each time: server, DNS and repository-settings changes, spending, creating credentials, and **visual sign-off on UI changes** (the owner may waive that for a given PR). Merging to `main` deploys the website, so merges are production releases.

## 3. Milestones

Status: ✅ done, 🔄 in progress, ⏳ not started, ❓ must be checked.

### M0: Context and plan on GitHub and Notion (now)

| ID | Task | Owner | Status |
|----|------|-------|--------|
| 0.1 | Land the open PRs in a safe order (docs first, then code), under the merge rule | Claude | 🔄 |
| 0.2 | `docs/PROJECT_CONTEXT.md`, `decisions.md`, `history.md`, `README.md` (docs map) covering 16 Aug onward | Claude, Gemini reviews | 🔄 |
| 0.3 | Refresh stale `README.md`, `CHANGELOG.md`, `ISSUES.md` | Claude, Gemini reviews | ⏳ |
| 0.4 | Update `AGENTS.md`: merge rule, owner's working rules, "read first" list | Claude, Gemini reviews | ⏳ |
| 0.5 | Notion page with the whole plan (created 2026-10-24, private to the owner; Claude re-syncs it at each milestone and handoff) | Claude | ✅ |
| 0.6 | **Cold-start test:** a fresh Gemini session, given only the repo, answers 8 questions about decisions and rules correctly | Gemini | ⏳ |

Acceptance: `main` contains every document above; `gh pr list` shows no stale PRs; the cold-start test passes.

### M1: The new CMS goes live (backend plan Phase 1)

| ID | Task | Owner | Status |
|----|------|-------|--------|
| 1.1 | CMS built and tested (Payload 3.92.0: roles, drafts, scheduling, images, rich-text converter, review status, upload rules) | Claude | ✅ |
| 1.2 | Security items: schedule guard, lockout, sessions, CSRF origin | Claude | ✅ |
| 1.3 | Postgres: adapter, migrations, CI job on Postgres 17 | Claude | ✅ |
| 1.4 | Publish webhook (CMS tells the website to refresh) | Claude | ✅ |
| 1.5 | Data seam, stage 1 (all content reads behind one layer) | Claude | ✅ (merged, PR #15) |
| 1.6 | **Staging** on the server: Postgres and CMS containers on their own subdomain, memory limits, swap, env var names only | Claude with owner | ⏳ needs owner OK per step |
| 1.7 | **Cloudflare Access** in front of the CMS admin (verify free-tier limits first) | Owner with Claude | ⏳ |
| 1.8 | Data seam stage 2: images and article bodies become CMS-neutral | Claude | ✅ (merged, PRs #33 and #35) |
| 1.8a | **Language-readiness spike (before any content is migrated):** decide and test whether the new CMS is ready for several languages with only English filled in (Payload localization). Retrofitting languages after content is migrated is costly, so this comes first. Output: `docs/localization-spike.md` with a go / no-go, the list of fields that become per-language, and a decision-log line. Test list in the section below | Claude | ⏳ (ML-1 decided: languages after launch; this spike still comes first) |
| 1.9 | Site reads from the CMS behind a switch; migration of all content and images with a per-article report | Claude | 🔄 switch, CMS data layer and migration script merged (#35, #37); newsletter signup in review (#43); the migration rehearsal on staging waits for 1.8a and staging |
| 1.10 | Editor experience: branding and admin changes from `docs/editor-ux.md` | Gemini, owner signs off visually | ⏳ |
| 1.11 | Backups: nightly encrypted dump and media copy to off-server storage, **restore proven on a clean machine** | Claude with owner (account) | ⏳ |
| 1.12 | **Quality gate G1** (see `backend-plan.md`): a non-technical writer publishes unaided, live page updates within 60 s, all articles migrated cleanly, restore proven, CI green, site and CMS measured together | Owner decides | ⏳ |
| 1.13 | **Cutover**, with rollback plan; Sanity read-only for 7 days (owner, 2026-10-25), then removed from the repo; the Sanity project is shut down only on the owner's approval | Claude with owner | ⏳ |

#### Task 1.8a in detail: is the CMS language-ready?
**Why now:** in a CMS with several languages, text fields such as the headline and body are stored once per language. Turning that on after hundreds of articles exist means moving every stored value into new per-language storage, with the live site reading it. Doing it before the first migration costs a few days; doing it after costs a data migration on live content.

**What is tested (a throwaway branch and a local database, never the server):** Payload localization switched on with English as the only language that has content, and the other languages (Spanish, Mandarin, Arabic) configured but empty.

| # | Question | Pass when |
|---|----------|-----------|
| 1 | Which fields are per-language? (headline, slug, excerpt, body, image alt text and caption, category, topic and author names and bios) | A written list with a reason for each; shared fields (dates, featured, relations) stay shared |
| 2 | Does an English-only article behave exactly as today in the admin and the public API? | The existing CMS tests pass unchanged; the website in CMS mode builds with identical page text |
| 3 | Can a language be **published separately** from English? (Payload's per-language publish status is labelled beta) | Publishing English leaves an unfinished Spanish draft unpublished; unpublishing one language leaves the others up. If not reliable, record the workaround |
| 4 | What does the public API return for a language with no translation? | Fallback to English is switchable per request; the data layer can tell "translated" from "fallen back" (needed for hreflang and the switcher) |
| 5 | Are slugs unique per language, and can a translated article have its own address? | Two languages may share or differ in slug without a clash; a duplicate within one language is refused |
| 6 | Does the rich-text body localize per language, including images inside it? | A Lexical body saved per language reads back per language |
| 7 | **The retrofit question:** with data already stored the old way, what does turning localization on cost? | Measured: either Payload moves it safely, or a data migration is needed. This is the reason the spike precedes the migration |
| 8 | Do the **migration script** and the **data layer** (`news-site/web/src/data`) need a language argument, and how big is the change? | A list of changes and an estimate; ideally the default language keeps today's calls unchanged |
| 9 | Does the **translator** role work: can it save a draft translation but not publish, and can it be limited to some languages? | Tests like the existing writer tests: a translator cannot publish; a reviewer approval is recorded; an editor publishes |
| 10 | Does the admin work for right-to-left editing (Arabic text in the editor, and the admin in Arabic)? | Arabic text can be typed and saved correctly; the result and any gaps are recorded (full Arabic support remains its own phase, task 6.8) |
| 11 | Do the database migrations stay committed and reviewable (S18) with localization on, and does CI on Postgres pass? | `npm run migrate` on an empty Postgres reproduces the schema |

**Output:** `docs/localization-spike.md` (what was tested, results, a go or no-go, and if go the exact config), a decision-log line, and, if go, a PR turning localization on with English only, behind the existing tests. The owner decides after reading it; no content is migrated until then.

### M2: Launch-ready essentials (from the owner's 2026-08-29 checklist)

| Item | Status |
|------|--------|
| Site live on the domain with SSL, admin dashboards secured, firewall (ports 22, 80, 443 only) | ✅ |
| Scheduled off-server backups, including the dashboard's own secrets file; Hetzner automatic snapshots enabled | ⏳ / ❓ (owner confirms snapshots) |
| Uptime monitoring hosted somewhere other than the CS NEWS server | ⏳ |
| Real content: enough genuine articles (12 of 13 are demos); remove the placeholder fallback (`placeholder-articles.ts`, picsum entry) once real content flows | ⏳ |
| Privacy-friendly analytics; Web Vitals reporting; Lighthouse pass (aim 85+ on mobile) | ⏳ |
| Security headers, custom error pages, reading time, PWA manifest, icons, real newsletter capture | ✅ |
| Refresh `README.md` | ⏳ (task 0.3) |
| Rotate the Claude Code login token that was pasted into chat on 2026-08-29 | ❓ owner |

### M3: Contributors live

| ID | Task | Owner | Status |
|----|------|-------|--------|
| 3.1 | Writer walkthrough (`docs/writer-walkthrough.md`) run with a real writer, the owner's father | Owner, Gemini | ⏳ after 1.9 |
| 3.2 | Create real writer and editor accounts (owner sets the passwords) | Owner | ⏳ |
| 3.3 | Test the loop: writer drafts, marks "Ready for review", editor publishes | Owner | ⏳ |

### Launch gate L1
**Launch = M0, M1, M2, M3 complete.** The owner may reorder; a launch before M1 would mean the family writes in Sanity.

### M4: Reader accounts and search (backend plan Phase 2)
Needs a mail provider (owner account). Postgres full-text search with typo tolerance. Threat-model items for logins done first. Gate G2.

### M5: Subscriptions and paywall (backend plan Phase 3)
Only after the owner has taken legal and tax advice. Payment test mode first. Premium text never appears in static pages. Gate G3.

### M6: Multilingual (language editions and a translator desk, in the style of Anadolu Agency)
Spanish and Mandarin through DeepL with **mandatory human review before publish**; Arabic as its own phase (right-to-left editor and site, Azure or LLM translation reviewed by an Arabic-competent human). Vendor choices are settled (see `decisions.md`).

**When:** after launch, by the owner's earlier decision, but the CMS is made language-ready **before** content is migrated (task 1.8a). The owner is asked whether languages are wanted at launch or first thing after (question ML-1 below); the answer may move M6, but not 1.8a.

| ID | Task | Owner | Status |
|----|------|-------|--------|
| 6.1 | **Translator role** and workflow in the CMS: a translator drafts translations and **cannot publish**; a human reviewer who reads the language approves; an editor publishes. Per-language review status on each article (machine draft, translated, reviewed, published). Who the reviewer is for each language is the owner's choice | Claude (roles, hooks), Gemini (desk UI) | ⏳ after 1.8a |
| 6.2 | Translator desk: a view of English stories waiting for a translation into a language, the translation draft beside the source, and the review queue | Gemini (UI), Claude (data) | ⏳ |
| 6.3 | Language editions: the URL structure (for example `/es/...`), pages, feeds and navigation per language; falling back to English only where a story is not translated, and saying so | Claude (routes, data), Gemini (UI) | ⏳ |
| 6.4 | **hreflang:** every translated page links to its other-language versions (and to itself) so search engines show the right edition; `x-default` points to English | Claude | ⏳ |
| 6.5 | **Per-language sitemaps** (and a news sitemap per language where Google News applies); the feed per language | Claude | ⏳ |
| 6.6 | **The real language switcher:** replaces today's `EN` placeholder in the utility bar; shows only languages the current page exists in, and remembers the choice without a popup (owner rule) | Gemini (UI), Claude (data) | ⏳ |
| 6.7 | Machine translation hookup (DeepL for Spanish and Mandarin) feeding drafts only; no unpublished text goes to a vendor without the owner's approval of that vendor, and the data flow is added to the threat model | Claude | ⏳ |
| 6.8 | Arabic: right-to-left site and editor, tested with an Arabic-competent human; Arabic ships as its own phase | Claude, Gemini | ⏳ |
| 6.9 | Fonts, dates, numbers and reading time per language (the site formats dates in UK time today) | Gemini, Claude | ⏳ |

**Decided by the owner (ML-1, 2026-10-25): languages come first thing after launch.** Backend first, in this plan's order; features and extra languages come after the backend is live. Because 1.8a makes the CMS language-ready now, adding a language later means turning it on and filling content, not rebuilding.

### M7: Launch day and after
Checklist: backup restore re-proved; monitoring alerts tested; rollback rehearsed; owner's final visual pass on key pages; DNS and SSL healthy; announcement; first-week watch (errors, speed, signups). Post-launch: series and collections, curated nav, social accounts (the language switcher is now task 6.6 in M6).

## 4. Open decisions for the owner
1. Mail provider for password resets and reader accounts (needed by M4; free tier first).
2. Where off-server backups go (needs an account, or the owner's own computer).
3. Whether launch waits for M1, or happens earlier on Sanity.

## 5. Risks to watch
- Merges deploy the live site, so a bad merge is a production incident; the post-merge check and revert rule exist for this.
- Two agents can agree on something false; independent review with evidence is the control.
- One server hosts the site, CMS and database: measure memory under load before cutover.
- The context window of any agent is finite: everything durable must be in this repository.
