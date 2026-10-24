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
| 0.5 | Notion page with the whole plan | Claude | ⏳ |
| 0.6 | **Cold-start test:** a fresh Gemini session, given only the repo, answers 8 questions about decisions and rules correctly | Gemini | ⏳ |

Acceptance: `main` contains every document above; `gh pr list` shows no stale PRs; the cold-start test passes.

### M1: The new CMS goes live (backend plan Phase 1)

| ID | Task | Owner | Status |
|----|------|-------|--------|
| 1.1 | CMS built and tested (Payload 3.92.0: roles, drafts, scheduling, images, rich-text converter, review status, upload rules) | Claude | ✅ |
| 1.2 | Security items: schedule guard, lockout, sessions, CSRF origin | Claude | ✅ |
| 1.3 | Postgres: adapter, migrations, CI job on Postgres 17 | Claude | ✅ |
| 1.4 | Publish webhook (CMS tells the website to refresh) | Claude | ✅ |
| 1.5 | Data seam, stage 1 (all content reads behind one layer) | Claude | 🔄 (PR #15) |
| 1.6 | **Staging** on the server: Postgres and CMS containers on their own subdomain, memory limits, swap, env var names only | Claude with owner | ⏳ needs owner OK per step |
| 1.7 | **Cloudflare Access** in front of the CMS admin (verify free-tier limits first) | Owner with Claude | ⏳ |
| 1.8 | Data seam stage 2: images and article bodies become CMS-neutral | Claude | ⏳ |
| 1.9 | Site reads from the CMS behind a switch; migration of all content and images with a per-article report | Claude | ⏳ |
| 1.10 | Editor experience: branding and admin changes from `docs/editor-ux.md` | Gemini, owner signs off visually | ⏳ |
| 1.11 | Backups: nightly encrypted dump and media copy to off-server storage, **restore proven on a clean machine** | Claude with owner (account) | ⏳ |
| 1.12 | **Quality gate G1** (see `backend-plan.md`): a non-technical writer publishes unaided, live page updates within 60 s, all articles migrated cleanly, restore proven, CI green, site and CMS measured together | Owner decides | ⏳ |
| 1.13 | **Cutover**, with rollback plan; Sanity read-only for 30 days, shut down only on the owner's approval | Claude with owner | ⏳ |

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

### M6: Multilingual
Spanish and Mandarin through DeepL with **mandatory human review before publish**; Arabic as its own phase (right-to-left editor and site, Azure or LLM translation reviewed by an Arabic-competent human). Vendor choices are settled (see `decisions.md`).

### M7: Launch day and after
Checklist: backup restore re-proved; monitoring alerts tested; rollback rehearsed; owner's final visual pass on key pages; DNS and SSL healthy; announcement; first-week watch (errors, speed, signups). Post-launch: series and collections, curated nav, social accounts, language switcher.

## 4. Open decisions for the owner
1. Mail provider for password resets and reader accounts (needed by M4; free tier first).
2. Where off-server backups go (needs an account, or the owner's own computer).
3. Whether launch waits for M1, or happens earlier on Sanity.

## 5. Risks to watch
- Merges deploy the live site, so a bad merge is a production incident; the post-merge check and revert rule exist for this.
- Two agents can agree on something false; independent review with evidence is the control.
- One server hosts the site, CMS and database: measure memory under load before cutover.
- The context window of any agent is finite: everything durable must be in this repository.
