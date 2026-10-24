# Decision log

Every standing decision about CS NEWS, newest at the bottom of each group, with the date, the reason where it was given, and who decided. Add a line here in the same PR that acts on a decision. "Owner" means the project owner. Dates marked "late Aug" are approximate: the decision is certain, the exact day was not recorded.

Nothing private belongs here (no server addresses, account emails, tokens or passwords).

## Product and design (owner)

| Date | Decision | Why / note |
|------|----------|-----------|
| 2026-08-16 | Multilingual site: **English now**, Mandarin, Spanish and Arabic (right-to-left) later | Stated in the first brief |
| 2026-08-16 | Stack: Next.js (App Router) front end and Sanity CMS in one repo, `news-site/web` and `news-site/studio`; the Studio is standalone, not embedded | The original brief |
| 2026-08-17 | Visual identity: **gold and ash** palette, defined as tokens in `globals.css`; **Playfair Display** for headlines with Geist Sans for interface text | Owner asked for Playfair by name when a different serif had been used: never substitute a requested font without asking |
| 2026-08-17 | Header in three tiers (dark utility bar, light masthead, section nav), a bordered "caged" content grid, and a Reuters-style footer | The redesign brief |
| 2026-08-17 | When the owner asks for staged work, commit after each stage and **stop for review** at the stage they name | Owner's working style |
| 2026-08-22 | Document ids in the CMS must contain no dots | The public read grant only matches single-segment ids; dotted category ids were invisible to the site |
| 2026-08-22 | Keep all six categories in the main navigation; a "show in nav" flag is deferred | Owner chose; logged in `ISSUES.md` |
| late Aug | Category listings paginate by path (`/category/x/page/2`), not `?page=` | Reading `searchParams` would make the route dynamic and undo static generation |
| late Aug | Motion is restrained: 150 to 250 ms ease-out, no bounce or spring on feedback, masthead and utility bar static, `prefers-reduced-motion` honoured | Owner kept these rules and rejected springs, hide-on-scroll and a bottom-sheet newsletter |
| late Aug | No login button or account UI on the site for now; elements with no destination are plain text, never `href="#"` | Owner: "remove the login thingy" |
| late Aug | Theme switch lives in the CSN menu (top left), not the footer; text-size control in the utility bar | Owner's layout choice |
| late Aug | Newsletter: real signup capture on the page, **no popup** | Owner's rule |
| 2026-08-29 | Contributors: the owner's father will write articles independently; needs a restricted role (draft but not publish) and a tested loop: writer drafts, editor reviews, editor publishes | Owner |
| 2026-08-29 | Multilingual vendors: **Spanish and Mandarin through DeepL with mandatory human review before publishing**; **Arabic as its own phase** with a right-to-left editor and site, Azure or LLM translation (not DeepL alone), reviewed by an Arabic-competent human | Owner; do not re-litigate |
| 2026-10-23 | All reader-facing dates are shown in **UK time** (`Europe/London`) | Owner |
| 2026-10-23 | The admin and dashboards are never exposed unprotected; the Hetzner firewall allows only ports 22, 80 and 443 | Found a dashboard reachable over plain HTTP |

## Hosting and operations

| Date | Decision | Why / note |
|------|----------|-----------|
| 2026-08-17 | Wanted: scheduled backups to S3-compatible **off-server** storage and Hetzner automatic snapshots | Still open (master plan M1.11, M2) |
| 2026-08-29 | Host on a Hetzner VPS managed by Coolify, deploying the web app from `main` with base directory `/news-site/web`; domain `csnews.news` through Cloudflare (DNS-only while SSL is issued) | Owner chose; the server address is not recorded here |
| 2026-08-29 | `"engines": { "node": ">=20" }` lives in `package.json` rather than as a Coolify setting | Owner: fix it permanently in the repo |
| 2026-08-29 | CI: the `claude-review` job (token trouble, likely usage limits) was disabled and replaced by `ci.yml`: typecheck and build | Owner |
| 2026-10-23 | `main` is protected: a PR is required and CI must pass, for admins too; merging to `main` **deploys the website automatically** | Observed after the first merges |
| 2026-10-23 | The Coolify dashboard is served on its own HTTPS address | T24 in the threat model |
| 2026-10-24 | CI checks required on `main`: web, CMS (SQLite), CMS (Postgres) | Added with the Postgres work |

## Backend (replacing Sanity)

| Date | Decision | Why / note |
|------|----------|-----------|
| 2026-10-23 | **Replace Sanity with a backend we control.** Sanity keeps running, unchanged, until the replacement is migrated and the owner approves shutting it down (read-only for 30 days first) | Owner: "scrap Sanity for now, build our own backend" |
| 2026-10-23 | **Budget rule:** build with no paid service except the server; spending is allowed only after quality gate G1 and each purchase needs the owner's approval | Owner: will invest if the backend reaches the required quality |
| 2026-10-23 | The CMS is **Payload CMS 3.92.0**, a separate app (`news-site/cms`) | Owner approved after the trial; needs Next 16.3.3 or later while the site is on 16.3.1; isolation also protects the public site |
| 2026-10-23 | Essentials list for the backend (owner): article management and scheduling, reader accounts and tiers, paywall, content API, caching, relational database, external asset storage, full-text search | Phased in `docs/backend-plan.md`; Redis not needed until several site instances run |
| 2026-10-24 | The CMS runs on **Postgres** in staging, production and CI; SQLite only for quick local runs | Owner chose Postgres; reader accounts, view counting and search need it |
| 2026-10-24 | **Staging** on the server is approved in principle; each server step still needs the owner's explicit OK | Owner |
| 2026-10-24 | The admin login is protected by **Cloudflare Access** in front of the admin address; free-tier limits to be verified first | Owner chose the recommended option |

## How the agents work

| Date | Decision | Why / note |
|------|----------|-----------|
| 2026-08-29 | The owner relays prompts to other tools (the Claude browser, Gemini); Claude writes the prompts and the owner pastes them | How the owner works |
| 2026-10-23 | Two agents under `AGENTS.md`: Claude owns data, platform and integration; Gemini owns interface, tests and quality; each reviews the other with real evidence | Owner |
| 2026-10-23 | Separate git worktrees, claim work with a draft PR, no direct pushes to `main`, squash merges, a handoff file at the end of each session | `AGENTS.md` |
| 2026-10-23 | Secrets are never printed or committed; the repository is public | Several slips earlier in the project (a Sanity token printed, a write token leaked) were revoked and replaced |
| 2026-10-23 | **Task ordering:** when a new prompt arrives mid-task, finish the task first, weigh the new prompt's importance, and always return to the original task | Owner's rule |
| 2026-10-23 | Gemini works through the Antigravity app (the Gemini CLI hit usage limits and personal Google sign-in was refused); its commit trailer is `Co-Authored-By: Gemini <noreply@google.com>` | Owner |
| 2026-10-24 | A progress checklist (`docs/progress-checklist.md`) records, per change, what the author ran and what the other agent tested; a change merged before review is marked ⚠️ and tested afterwards | Owner asked for it |
| 2026-10-24 | **Merge authority:** Claude merges when all required checks are green and the other agent has approved; UI changes still need the owner's visual sign-off; server, DNS, settings, spending and credentials need explicit OK | Owner |
| 2026-10-24 | Tasks for Gemini are GitHub issues labelled `gemini-task` from the owner's account; Gemini ignores anyone else's | Public repository safety |
| 2026-10-24 | **Notion holds the whole plan** from the first day to launch day; **GitHub holds the context** (rules, decisions, history); GitHub wins when they disagree | Owner |
| 2026-10-25 | **Staging is approved as a plan only** (`docs/staging-plan.md`): the owner is told each server step before it is done and approves it step by step; the owner confirms the "?" checklist items (snapshots, token rotation, uptime monitoring, Coolify secrets backup) themselves | Owner |
| 2026-10-25 | **Ask before deleting** any file the owner did not ask to be deleted (including generated or ignored files) | Owner |
| 2026-10-25 | The migration from Sanity (`news-site/cms/scripts/migrate-from-sanity.ts`) is a dry run by default; writing needs `MIGRATE_APPLY=1` and the target typed back; it skips what already exists and never deletes | Safety (S5, S16) |
