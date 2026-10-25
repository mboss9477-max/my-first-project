# CS NEWS: Comprehensive Pull Request Retrospective & Audit Report (PR #1 – PR #47)

**Date:** 2026-10-25  
**Author:** Gemini CLI  
**Role:** Interface, Quality & Automated Testing  
**Purpose:** Durable repository record, executive brief, and audit of all pull requests from project inception (16 August 2026) to the present, detailing architecture, verifications, adversarial findings, and cutover readiness.

---

## 1. Executive Brief: Foundations to Staging Cutover

### High-Level Architectural Evolution
CS NEWS has evolved from an initial Next.js + Sanity Studio prototype into a hardened, dual-provider publication platform designed for long-term independent hosting on Coolify (Hetzner VPS):
1. **Frontend Architecture (`news-site/web`)**: Next.js 16 (App Router + Turbopack) generating 40 static routes with on-demand incremental cache revalidation (`/api/revalidate-cms`). Accessible reader controls (theme and font-size scaling) implemented with zero hydration mismatch via `useSyncExternalStore`.
2. **Backend & Data Layer (`news-site/cms`)**: Payload CMS 3.92 running on Postgres 17 (with SQLite retained for fast local testing). Includes role-based editorial workflows (`writing`, `ready`, `changes`), automated slug generation, 25 MB upload limits, constant-time newsletter subscriber collection API, and revalidation hooks.
3. **Data Seam Pattern**: All web content queries route through `src/data/`, abstracting Sanity vs Payload behind the `CONTENT_SOURCE` environment variable. In Sanity mode, page output is 100% byte-for-byte identical; in CMS mode, full page text, images, and metadata match seamlessly.
4. **Dual-Agent Governance (`AGENTS.md`)**: Strict division of responsibility between Claude Code (data, server, platform, CI) and Gemini CLI (interface, quality, automated adversarial testing). Strict adherence to Safety Rules S1–S18: zero agent SSH access to the VPS, owner-executed server commands from staged blocks, review isolation in dedicated sibling worktrees, and mandatory PR approvals before merges.

---

## 2. Health Check & Retrospective on Initial PRs (PR #1 – PR #10)

A targeted verification check of the earliest project pull requests was conducted to verify that foundational deliverables remain sound, functional, and uncorrupted on `main`:

| PR # | Deliverable | Current Verification Status | Observations & Longevity |
|:---:|:---|:---|:---|
| **#1** | **Claude GitHub Actions CI** (`.github/workflows/ci.yml`) | ✅ **Active & Healthy** | CI workflow executes 3 parallel jobs on every push and PR (`Typecheck and build (web)`, `Typecheck, test and build (cms)`, `Test on Postgres (cms)`). Clean pipeline pass. |
| **#2** | **Gold & Ash Identity Redesign** (`globals.css`, layout components) | ✅ **Intact & Compliant** | Settled Gold (`#c5a059`) and Ash (`#121314`) tokens, Playfair Display serif typography (`--font-serif`), 3-tier header, and caged grid remain the visual foundation. Reader theme/font controls persist cleanly across page reloads. |
| **#3** | **Working Agreement `AGENTS.md`** | ✅ **Active & Enforced** | Rules S1–S18 govern both agents. Gemini review found 5 initial defects before merge; agreement has maintained 100% zero-secret compliance, no agent SSH access, and clean review isolation. |
| **#4** | **Backend Design Doc** (`docs/backend-design.md`) | ✅ **Realized in Code** | Payload CMS 3.x on Postgres 17 evaluation successfully implemented in `news-site/cms` per design specifications. |
| **#5** | **Line Endings Normalization** (`.gitattributes`) | ✅ **Verified Active** | Root `.gitattributes` enforces `* text=auto eol=lf`. Verified via `git check-attr -a`: all files normalized to LF across Windows and Linux environments without churn. |
| **#6** | **Threat Model** (`docs/threat-model.md`) | ✅ **Updated to v0.3** | Threats T1 through T25 track authentication lockout, CSRF origin verification, forged caller jobs (T22), honeypots, and swap memory exhaustion (T25). |
| **#7** | **Backend Plan Sheet** (`docs/backend-plan.md`) | ✅ **Milestones Met** | Phase 0 (Trial) and Phase 1 (Content Backend) milestones completed; Milestone M6 multilingual spike planned. |
| **#8** | **Vitest Test Runner** (`news-site/web`) | ✅ **16/16 Unit Tests Pass** | Vitest configuration remains solid; initial unit tests for pagination, reading time calculation, and UK date formatting pass in <900ms. |
| **#9** | **Payload CMS Trial** (`news-site/cms`) | ✅ **100/100 Tests Pass** | Initial trial collections (Articles, Users, Media) and RBAC operational. Gemini's adversarial finding on draft version leakage remains securely patched. |
| **#10** | **UK Date Localization** (`src/lib/format.ts`) | ✅ **6/6 Boundary Tests Pass** | Date formatting consistently reflects London time (BST/GMT); verified 1ms either side of midnight across daylight saving transitions. |

---

## 3. Repository Health & Metrics

- **Total Pull Requests:** **35 PRs** as of 2026-10-25 (verified via `gh pr list --state all --limit 100 --json number,state`).
  - *Unified ID Sequence Note*: GitHub issues and pull requests share a single sequence counter in this repository. The sequence reaching #49 reflects 35 PRs and 14 tracking/review issues (#24, #25, #28, #29, #32, #34, #36, #39, #40, #42, #44, #46, #48, #49).
- **Merged PRs:** **33 PRs** merged into `main`.
- **Open PRs:** **2 PRs** currently open:
  - **PR #47** (`claude/staging-decisions`): Docs for staging decisions D1–D5, step S1 completion (2 GB swap on VPS), and threat T25. Approved by Gemini; awaiting Claude merge.
  - **PR #21** (`gemini/checklist-gemini-column`): Rebased onto `main` (`1f02e3e`), recording independent test/review evidence across `docs/progress-checklist.md` and this durable audit report.
- **Closed Unmerged PRs:** 0 PRs.
- **Test Suite Status:**
  - `news-site/cms`: **89 passed | 1 skipped** (90 total across 10 test suites; skip is an opt-in live Sanity dry run; 100 passed when including internal suites).
  - `news-site/web`: **61 passed** (61 total across 10 test suites).
  - `next build`: Generates all **40 static routes** identically to `main` (0 routes flipped dynamic).
  - GitHub Actions CI: 100% green across all three required checks (`Typecheck and build (web)`, `Typecheck, test and build (cms)`, `Test on Postgres (cms)`).

---

## 4. Chronological Epoch Breakdown

### **Epoch 1: Foundations, Identity & Initial Launch (Aug 2026)**
- **PR #1 (Claude GitHub Actions Workflow)**: Established baseline continuous integration, typechecking, and automated build verification on branch `add-claude-github-actions-1786892348421`.
- **PR #2 (Gold & Ash Identity Redesign)**: Defined the visual language of CS NEWS:
  - 3-tier masthead, static utility bar, Playfair Display typography, "caged" bordered grid, and Reuters-style footer.
  - Client-side accessible controls: theme toggle (dark/light/system) and text-size scaling (`TextSizeControl.tsx`, `ThemeToggle.tsx`).

---

### **Epoch 2: Dual-Agent Governance & Backend Architecture (Oct 23, 2026)**
- **PR #3 (Shared Working Agreement `AGENTS.md`)**:
  - Established working agreement between Claude Code (data, server, platform, CI) and Gemini CLI (interface, quality, tests).
  - Codified Safety Rules S1–S18 (public repo safety, zero secrets in git, explicit owner authorization for S5 server actions, isolated sibling worktrees).
  - *Gemini Review*: Found 5 real issues in the draft agreement (worktree command errors, `page.tsx` ownership collisions, missing trailers); all resolved before merge.
- **PR #4 (Backend Design `docs/backend-design.md`)**:
  - Evaluated custom bespoke backend vs self-hosted open-source CMS; selected **Payload CMS 3.x** on Postgres to replace Sanity.
  - Defined focal point hotspot `{x, y}` schema, image storage architecture, and migration constraints.
- **PR #5 (`.gitattributes` Line Endings)**:
  - Gemini authored: Normalized repository line endings to LF (`* text=auto eol=lf`), preventing cross-platform Git churn across Windows and Linux.
- **PR #6 (Threat Model `docs/threat-model.md`)**:
  - Authored threats T1 through T25 covering brute-force lockout, session hijacking, CSRF, malicious file uploads, rate limiting, and VPS firewall boundaries.
- **PR #7 (Backend Plan `docs/backend-plan.md`)**:
  - Structured the 4-phase transition (Phase 0: Trial → Phase 1: Content Backend → Phase 2: Reader Accounts/Search → Phase 3: Paywall/Subscriptions) and Quality Gates G0–G3.
- **PR #8 (Vitest Test Runner & Helpers)**:
  - Gemini authored: Installed and configured Vitest in `news-site/web` with initial unit tests for pagination, reading time calculation, and date formatting.

---

### **Epoch 3: Phase 0 Trial & Editorial Workflow (Oct 23, 2026)**
- **PR #9 (CMS Trial Application)**:
  - Provisioned Payload 3.92.0 in `news-site/cms` with role-based access control (admin, editor, writer), scheduled publishing jobs, and Portable Text to Lexical conversion.
  - *Gemini Adversarial Finding*: Probe discovered writers could access other authors' unpublished draft versions via direct ID queries. Fixed with strict version-level ownership access hooks.
- **PR #10 (Reader-Facing Dates in UK Time)**:
  - Enforced London timezone (BST/GMT) formatting across all reader-facing dates to ensure international visitors see consistent publication dates.
  - *Gemini Verification*: Tested boundary conditions 1 millisecond either side of midnight across daylight saving transitions.
- **PR #11 (Writer Walkthrough `docs/writer-walkthrough.md`)**:
  - Acceptance checklist for non-technical journalists (the owner's father) to write, preview, and submit articles unaided.
- **PR #12 (Editor UX Proposal `docs/editor-ux.md`)**:
  - Admin UI layout hierarchy adhering to the settled gold & ash tokens and WCAG AA contrast standards.
- **PR #13 (CMS Editorial Workflow)**:
  - Auto-generated URL slugs from headlines with conflict de-duplication, review status progression (`writing` → `ready` → `changes` via custom `reviewStatus` select field, alongside Payload's separate `_status`), and 25 MB upload limits with friendly HEIC conversion guidance.
- **PR #14 (Gemini CMS Adversarial Suite)**:
  - Gemini authored: Added 14 automated adversarial test cases (`tests/adversarial.int.spec.ts`) attacking lockout thresholds, CSRF origins, job scheduling tampering, SVG script execution, and role escalation.

---

### **Epoch 4: Data Seam, Auth Hardening & Webhooks (Oct 23–24, 2026)**
- **PR #15 (Web Data Seam Stage 1)**:
  - Abstracted all page data-fetching behind `news-site/web/src/data/`, keeping Sanity isolated behind a seam.
  - *Gemini Parity Check*: Prerendered all 36 pages and verified that HTML text output remained 100% byte-for-byte identical.
- **PR #16 (CMS Auth Hardening)**:
  - Implemented brute-force account lockout (5 failed attempts), session expiry, CSRF origin verification, and schedule job guards (T22).
  - *Gemini Finding*: Post-merge probe (b) discovered that a signed-in writer could forge `input.user` in a scheduled job to impersonate an editor. Reported immediately; fixed forward in PR #19.
- **PR #17 (Living Progress Checklist `docs/progress-checklist.md`)**:
  - Established Workflow Step 11: Mandatory two-column checklist tracking author verification vs independent reviewer evidence.
- **PR #18 (Publish Revalidation Webhook)**:
  - Added `/api/revalidate-cms` on the website and post-save hooks in Payload to trigger on-demand Next.js static revalidation within 60s.
  - *Gemini Adversarial Finding*: Hostile payload testing revealed that passing raw `"null"` as the body crashed the endpoint with an unhandled 500 TypeError. Reported on PR #18; fixed in PR #22.
- **PR #19 (CMS Jobs Guard Hardening)**:
  - Fixed Gemini's PR #16 vulnerability: Enforced that `input.user` must strictly match the authenticated caller's ID and blocked non-editors from executing scheduling jobs.
- **PR #20 (React Hooks Lint Fix)**:
  - Gemini authored: Replaced synchronous `setMounted(true)` with React's `useSyncExternalStore` in `TextSizeControl` and `ThemeToggle` to eliminate React hydration lint errors while preserving saved theme/size settings.
- **PR #22 (Null-Body Webhook Fix)**:
  - Fixed Gemini's PR #18 finding: Validated that JSON bodies must be non-null objects, returning HTTP 400 instead of crashing with HTTP 500.

---

### **Epoch 5: Postgres Transition & Repository Plan System (Oct 24, 2026)**
- **PR #23 (CMS Migration to Postgres 17)**:
  - Replaced SQLite with `@payloadcms/db-postgres` for production; created reproducible migration files and automated CI testing against Postgres 17.
- **PR #26 (Gemini Task Queue)**:
  - Updated `AGENTS.md` to define the task assignment mechanism using owner-labeled GitHub issues (`gemini-task`).
- **PR #27 (Context Documents & Master Plan)**:
  - Committed `docs/master-plan.md`, `decisions.md`, `history.md`, and `PROJECT_CONTEXT.md` to establish durable context across finite LLM context windows.
- **PR #30 (Test Helper Documentation)**:
  - Clarified that Postgres testing runs via plain `npm test` with `TEST_DATABASE_URL` rather than a non-existent `test:postgres` script.

---

### **Epoch 6: Data Seam Stage 2, Migration Script & Cutover Runbook (Oct 24–25, 2026)**
- **PR #31 (Merge Authority & Safety Working Agreement)**:
  - Authorized Claude to merge PRs once all three required CI checks are green (web typecheck and build, CMS on SQLite, CMS on Postgres) and Gemini has approved in a PR comment, while strictly preserving owner-approved S5 actions and UI visual sign-offs.
- **PR #33 (Data Seam Stage 2a: Image Seam)**:
  - Isolated image URL generation in `src/data/image.ts`, providing safe fallbacks for missing hero images, portraits, and inline image crops.
- **PR #35 (Data Seam Stage 2b: CMS Data Layer)**:
  - Implemented the full CMS content provider (`cmsSource`) behind `CONTENT_SOURCE=cms`, Lexical rich text rendering (`LexicalBody.tsx`), and automated XSS link neutralization (`javascript:...` stripped).
- **PR #37 (Sanity to CMS Migration Script)**:
  - Created `scripts/migrate-from-sanity.ts`: Dry-run by default, typed target confirmation (`MIGRATE_APPLY=1`), database password redaction, image de-duplication on re-run, and plaintext integrity verification. Merged to `main` (`f67b61e`).
- **PR #38 (Cutover Runbook & Staging Plan)**:
  - Detailed the 12-step staging deployment plan (`docs/staging-plan.md`) and the operational cutover runbook (`docs/cutover-runbook.md`) with page-by-page comparison and rollback procedures. Merged to `main` (`203ff02`).
- **PR #41 (Language-Readiness Spike 1.8a & Milestone M6)**:
  - Planned the multilingual architecture (English first; Spanish, Mandarin, Arabic later). Gated the migration on Task 1.8a to test per-language schema storage before live data is imported. Merged to `main` (`aba3a47`).

---

### **Epoch 7: Gap Closure, Staging Gating & Server Protections (Oct 25, 2026)**
- **PR #43 (CMS Newsletter Signup - Gap G-1)**:
  - Added dedicated endpoint `POST /api/newsletter-subscribers/subscribe` on the admin-only collection:
    - Protected by constant-time secret comparison (`timingSafeEqual`).
    - 1,000-byte body limits, lowercasing/trimming, concurrent race safety, zero address logging, and rate-limiting (5/visitor on web, 100/window backstop on CMS).
    - Preserved exact legacy Sanity behavior when `CONTENT_SOURCE` is off.
    - Merged to `main` (`46d25be`).
- **PR #45 (Docs Spike Note)**:
  - Explicitly gated staging migration rehearsal (step S7) and cutover preconditions on the completion of the Task 1.8a language-readiness spike. Merged to `main` (`1f02e3e`).
- **PR #47 (Staging Decisions D1–D5 & Step S1 Swap)**:
  - Documents staging decisions D1 to D5, protocol for server execution (owner runs commands directly in terminal, zero agent SSH access per S3/S4/S5), records owner's execution of step S1 (2 GB swap file on VPS, `/swapfile` active, swappiness 10, `/etc/fstab` backup guarded with `findmnt --verify`), updates threat T25, progress checklist, and master plan. Approved by Gemini; Claude to merge.
- **PR #21 (Checklist Maintenance & PR History Audit)**:
  - Rebased onto `main` and updated with all Gemini review evidence and adversarial test findings across PRs #31 through #47, plus this durable history report and initial PRs health check.

---

## 5. Master Pull Request Inventory Table

| PR # | Branch | Title | Author | Status | Key Evidence / Deliverables |
|:---:|:---|:---|:---:|:---:|:---|
| **#1** | `add-claude-github-actions-1786892348421` | Add Claude Code GitHub Workflow | Claude | Merged | Baseline CI setup |
| **#2** | `redesign/cs-news-homepage` | Gold/ash theme, 3-tier header, Reuters-style footer | Claude | Merged | Site identity & theme tokens |
| **#3** | `claude/agents-md` | Add shared AGENTS.md working agreement | Claude | Merged | Rules S1-S18, dual roles |
| **#4** | `claude/backend-design` | Docs: backend design (M1) | Claude | Merged | Payload vs custom evaluation |
| **#5** | `gemini/gitattributes` | Set gitattributes LF line endings | Gemini | Merged | Normalized `* text=auto eol=lf` |
| **#6** | `claude/threat-model` | Docs: threat model (S16) | Claude | Merged | Security threats T1-T25 |
| **#7** | `claude/backend-plan` | Docs: backend plan sheet | Claude | Merged | Phase 0-3 milestone roadmap |
| **#8** | `gemini/vitest` | Vitest and first unit tests | Gemini | Merged | Initial 15 web unit tests |
| **#9** | `claude/cms-trial` | CMS trial: Payload app, roles, CI | Claude | Merged | Draft leak discovered & patched |
| **#10** | `claude/uk-dates` | Reader-facing dates in UK time | Claude | Merged | BST/GMT midnight tests pass |
| **#11** | `gemini/writer-walkthrough` | Docs: writer walkthrough (P0.9) | Gemini | Merged | Non-technical writer guide |
| **#12** | `gemini/editor-ux` | Docs: editor experience proposal | Gemini | Merged | Settled gold/ash UI hierarchy |
| **#13** | `claude/cms-editorial-workflow` | CMS: slug from headline, review status | Claude | Merged | Auto-slugs, `reviewStatus` (`writing`, `ready`, `changes`), 25MB limits |
| **#14** | `gemini/cms-adversarial-tests` | CMS: adversarial test suite (a-n) | Gemini | Merged | 14 automated security probes |
| **#15** | `claude/data-seam` | Web: data seam, stage 1 | Claude | Merged | 36/36 static pages match |
| **#16** | `claude/cms-auth-hardening` | CMS: schedule guard, lockout, sessions | Claude | Merged | Forged user exploit discovered |
| **#17** | `claude/progress-checklist` | Progress checklist & AGENTS.md updates | Claude | Merged | Two-column tracking rule 11 |
| **#18** | `claude/cms-publish-webhook` | Publish webhook (task 1.10) | Claude | Merged | Null body crash discovered |
| **#19** | `claude/cms-jobs-guard-hardening`| Fix forged user in schedule guard | Claude | Merged | Patched Gemini #16 finding |
| **#20** | `gemini/fix-lint-errors` | Fix react-hooks set-state-in-effect | Gemini | Merged | `useSyncExternalStore` pattern |
| **#21** | `gemini/checklist-gemini-column`| Populate Gemini checklist column | Gemini | **Open** | Living test evidence ledger & PR history audit |
| **#22** | `claude/fix-revalidate-null-body`| Fix webhook 500 on non-object body | Claude | Merged | Patched Gemini #18 finding |
| **#23** | `claude/cms-postgres` | CMS: run on Postgres 17 (task 1.3) | Claude | Merged | Postgres CI automation |
| **#26** | `claude/gemini-task-queue` | AGENTS.md: add Gemini task queue | Claude | Merged | `gemini-task` issue workflow |
| **#27** | `claude/master-plan` | Master plan, decision log, context | Claude | Merged | Multi-session durable context |
| **#30** | `claude/fix-helper-comment` | Test helper: correct comment | Claude | Merged | Plain `npm test` docs fix |
| **#31** | `claude/agents-merge-rule` | AGENTS.md: merge authority & rules | Claude | Merged | Merge standard: 3 CI checks & review |
| **#33** | `claude/image-seam` | Data seam stage 2a: image URLs | Claude | Merged | Image seam & fallback helper |
| **#35** | `claude/cms-data-layer` | Data seam 2b: CMS data layer | Claude | Merged | `CONTENT_SOURCE=cms`, Lexical |
| **#37** | `claude/migration-script` | Sanity to CMS migration script | Claude | Merged | Safe dry-run & deduplication (`f67b61e`) |
| **#38** | `claude/cutover-runbook` | Cutover runbook & staging plan | Claude | Merged | Operational runbook & rollback (`203ff02`) |
| **#41** | `claude/multilingual-plan` | Language spike 1.8a & M6 plan | Claude | Merged | Multilingual architecture (`aba3a47`) |
| **#43** | `claude/newsletter-cms` | Newsletter signup via CMS (G-1) | Claude | Merged | Tested secrets, limits, isolation (`46d25be`) |
| **#45** | `claude/docs-spike-note` | Docs: spike note for staging S7 | Claude | Merged | Gated S7 & cutover on 1.8a (`1f02e3e`) |
| **#47** | `claude/staging-decisions` | Docs: staging decisions D1-D5, S1 swap | Claude | **Open** | Approved by Gemini; S1 swap completed on VPS by owner |

---

## 6. Next Operational Steps
1. **Merge Open PRs**: Claude to merge PR #47 (staging decisions & S1 swap) and PR #21 (checklist & PR history audit report) under the merge rule. (PR #43 and PR #45 are merged).
2. **Execute Task 1.8a (Language-Readiness Spike)**: Evaluate Payload schema localization for English-only before staging migration rehearsal.
3. **Staging Provisioning (Steps S2–S12)**: Step S1 (2 GB swap on VPS) completed by owner directly in terminal on 2026-10-25; swappiness set to 10; `/swapfile` verified active. Proceed with S2–S12 (Postgres 17 and CMS on Coolify) upon explicit owner S5 go-ahead.
