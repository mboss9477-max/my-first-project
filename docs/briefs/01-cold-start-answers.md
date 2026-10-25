# Cold-Start Repository Answers & Analysis

**Date:** 2026-10-25  
**Author:** Gemini CLI  
**Branch:** `gemini/overnight-briefs`  
**Base:** `origin/main` (`1f02e3e`)  
**Scope:** Direct evidence-backed answers to the 8 repository questions based exclusively on repository documents on `origin/main`, followed by an analysis of hard-to-find details, ambiguities, and contradictions.

---

## 1. Who merges a pull request, and under exactly which conditions?

### Answer:
**Claude Code** merges pull requests, using **squash merge** (one commit per task). The human owner is the final authority and the sole authority for production-affecting actions.

### Conditions for Merge:
1. **GitHub Branch Protection**: Every change must go through a pull request; direct pushes to `main` are blocked.
2. **All Three Required CI Checks Green**: GitHub Actions checks must all pass:
   - `Typecheck and build (web)`
   - `Typecheck, test and build (cms)` (SQLite integration tests)
   - `Test on Postgres (cms)` (Postgres 17 integration tests)
3. **Independent Agent Review & Approval**: The other agent (Gemini CLI) must review the PR in an isolated review worktree and post an approval with concrete evidence in a PR comment. "LGTM" without evidence does not count; any objection blocks merge until resolved or overruled by the owner.
4. **Owner Visual Sign-off for UI Changes**: Any change modifying UI/rendering requires explicit visual sign-off from the human owner (via screenshots or a running preview) prior to merge, as neither AI agent can visually inspect rendered pages.
5. **Owner Explicit "Go-ahead" for Sensitive Areas (Rule S5)**: Deploying, server changes, DNS, settings, spending, credentials, or production database migrations require explicit authorization in chat from the owner.
6. **Attribution Trailers & Clean Handoff**: The PR description and squash commit must carry proper attribution trailers (e.g. `Co-Authored-By: Gemini <noreply@google.com>`).
7. **Post-Merge Site Health Check**: Immediately after merging, the author/merger must verify the live site and revert if unhealthy.

### Citations:
- `AGENTS.md` lines 3, 57, 69–72, 103 (Safety Rule S5).
- `docs/decisions.md` line 38, line 58, line 63 (Owner decision of 2026-10-24: "Merge authority").

**Files opened for Question 1:** 2 (`AGENTS.md`, `docs/decisions.md`).

---

## 2. What happens when something is merged to main, and what must happen right after?

### Answer:
1. **What Happens**:
   - **Automatic Production Deployment**: Merging to `main` automatically triggers a Coolify webhook/build that deploys the web app (`news-site/web`) to production on the VPS. Thus, every merge to `main` is an immediate production release.
2. **What Must Happen Right After**:
   - **Live Site Verification & Revert Guard**: The agent must check the live production website (`https://csnews.news`) immediately. If the site is unhealthy or errors occur, the change must be reverted immediately.
   - **Update the Living Progress Checklist**: Update `docs/progress-checklist.md` with the exact commands and verification evidence. If a PR was fast-tracked/merged prior to review, it must be marked with `⚠️`, tested post-merge, and any defects fixed forward in a new PR.
   - **Delete Task Branch**: The short-lived task branch (`claude/<topic>` or `gemini/<topic>`) must be deleted after merge.
   - **Session Handoff**: If the session concludes with unmerged work, or if task ownership changes, a durable handoff file must be written to `docs/handoffs/YYYY-MM-DD-<agent>-<topic>.md`.

### Citations:
- `AGENTS.md` line 15, line 58, line 69, line 72, line 75, lines 80–83.
- `docs/decisions.md` line 36.
- `docs/cutover-runbook.md` line 25.

**Files opened for Question 2:** 3 (`AGENTS.md`, `docs/decisions.md`, `docs/cutover-runbook.md`).

---

## 3. Which areas does Claude own and which does Gemini own? Name three paths each.

### Answer:
- **Claude Code** owns **data, platform, and integration** (data models, database queries, server route handlers, server actions, metadata, feeds, sitemaps, CI/CD configuration, and CMS backend).
  - *Three paths owned by Claude:*
    1. `news-site/studio/**` (Legacy Sanity content model)
    2. `news-site/web/src/sanity/**` (Legacy Sanity data layer)
    3. `web/src/app/api/**` (Server API route handlers; e.g. revalidate webhooks)
    *(Also: `web/src/app/actions/**`, `web/next.config.ts`, `.github/**`, `.claude/**`, `.gitattributes`, thin `page.tsx` data wrappers).*
- **Gemini CLI** owns **interface and quality** (UI presentation components, page markup/layout, loading/error states, design tokens, styling passes, automated testing, and editor experience).
  - *Three paths owned by Gemini:*
    1. `web/src/components/**` (UI components and presentation rendering)
    2. `web/src/app/globals.css` (CSS styling and Settled Gold & Ash design tokens)
    3. `web/tests/**` (Unit and automated test suites, `**/*.test.ts(x)`, `vitest.config.*`)
    *(Also: `loading.tsx`, `error.tsx`, `not-found.tsx` under `web/src/app/**`, and the CMS editor UI).*

### Citations:
- `AGENTS.md` lines 30–31, lines 39–53.

**Files opened for Question 3:** 1 (`AGENTS.md`).

---

## 4. Who runs commands on the server, and what must happen before each server step?

### Answer:
1. **Who Runs Server Commands**:
   - The **human owner** executes commands on the server directly in their own terminal from pre-staged command blocks, or grants scoped access to Claude over SSH.
   - **Gemini never runs server commands and never uses the SSH key** (Rule S4: "Gemini does not use the SSH key...").
   - The owner is the sole authority for any infrastructure modification (Rule S3, Rule S5).
2. **What Must Happen Before Each Server Step**:
   - **Explicit Owner Authorization**: Every server, VPS, Coolify, DNS, or credential change requires the human owner's explicit "go-ahead" in chat beforehand (Rule S5). One approval strictly covers one step.
   - **Safety Briefing by Agent**: Claude must state in plain language what the step is, why it is needed, how to verify it, and the exact step-by-step undo/rollback procedure *before* running it.
   - **Infrastructure Preconditions & Backups**:
     - A recent Hetzner snapshot of the server must exist.
     - Coolify dashboard secrets file must be backed up off-server.
     - The owner must confirm accessibility to the Coolify panel over HTTPS and the server over SSH.
     - Any production database modification requires a verified, fresh backup first (Rule S5, S18).

### Citations:
- `AGENTS.md` line 7, lines 101–103 (Safety Rules S3, S4, S5), line 128 (Rule S18).
- `docs/staging-plan.md` lines 3, 30–36, line 43.
- `docs/cutover-runbook.md` lines 9, 22.
- `docs/decisions.md` line 70.

**Files opened for Question 4:** 4 (`AGENTS.md`, `docs/staging-plan.md`, `docs/cutover-runbook.md`, `docs/decisions.md`).

---

## 5. What is CONTENT_SOURCE, and how is the switch undone at cutover?

### Answer:
1. **What is CONTENT_SOURCE**:
   - `CONTENT_SOURCE` is the environment variable that governs the data seam (`news-site/web/src/data/index.ts`).
   - When **unset** or set to `sanity`, the website routes all data fetching to the legacy Sanity Studio (`sanitySource`).
   - When set to `cms`, the website routes data queries to the new self-hosted Payload CMS (`cmsSource`, connecting to `CMS_URL`).
2. **How the Switch is Undone at Cutover (Rollback)**:
   - In Coolify, change `CONTENT_SOURCE` back to `sanity` (or remove the variable) on the live website application.
   - Trigger a redeploy of the website in Coolify.
   - Run the verification checklist against `https://csnews.news` to confirm the site is serving content from Sanity.
   - Leave the new CMS running and untouched to inspect logs and diagnose the fault without data loss.
   - Instruct writers to resume using Sanity Studio.
   - No code edits or repository commits are required on cutover day to switch or roll back.

### Citations:
- `news-site/web/src/data/index.ts` lines 2–5, lines 34–35.
- `docs/cutover-runbook.md` line 7, line 14, lines 90–95.

**Files opened for Question 5:** 2 (`news-site/web/src/data/index.ts`, `docs/cutover-runbook.md`).

---

## 6. What is task 1.8a, and why does it come before the first migration?

### Answer:
1. **What is Task 1.8a**:
   - It is the **Language-readiness spike** (`docs/master-plan.md` lines 57, 64–69).
   - An architectural spike conducted entirely in a local throwaway branch with a disposable database (never on the server) to evaluate Payload CMS 3.x schema localization.
   - It tests whether the CMS can operate with localization enabled where English is the only populated language and future languages (Spanish, Mandarin, Arabic) remain configured but empty.
   - Deliverable: `docs/localization-spike.md` containing a go/no-go determination, the exact list of localized fields (headlines, article bodies), and a decision-log entry.
2. **Why It Comes Before the First Migration**:
   - In a multilingual CMS, text fields are stored partitioned per-language. If content from Sanity is migrated into non-localized database tables first, enabling localization later requires migrating live database records and refactoring schemas while the site is active in production.
   - Doing it before the first migration costs a few days of schema planning; doing it after costs a risky, complex live data migration on production content.
   - Staging step S7 (migration rehearsal) and cutover preconditions are gated on task 1.8a: if localization is activated, both the migration script (`scripts/migrate-from-sanity.ts`) and the web data seam must accept a language parameter before importing real content.

### Citations:
- `docs/master-plan.md` lines 57, 64–69.
- `docs/decisions.md` line 66.
- `docs/staging-plan.md` line 80.
- `docs/cutover-runbook.md` line 18.

**Files opened for Question 6:** 4 (`docs/master-plan.md`, `docs/decisions.md`, `docs/staging-plan.md`, `docs/cutover-runbook.md`).

---

## 7. When do extra languages come, and which decision records that?

### Answer:
1. **When Extra Languages Come**:
   - Extra languages come **first thing after launch** as Milestone M6.
   - The backend transition and cutover come first in the plan's order; everything the backend needs (including the task 1.8a spike) is part of making the platform ready. Feature additions and foreign-language editions (Spanish, Mandarin, Arabic) will be implemented immediately after the backend is live.
2. **Which Decision Records That**:
   - Decision **ML-1**, dated 2026-10-25, recorded in `docs/decisions.md` line 69:
     `| 2026-10-25 | ML-1 decided: languages come first thing after launch. Backend first, in the plan's order; everything the backend needs (including task 1.8a) is part of making it ready; features and extra languages come after the backend is live | Owner |`
   - Cross-referenced in `docs/decisions.md` line 66 and `docs/master-plan.md` lines 57, 118, 144.

### Citations:
- `docs/decisions.md` line 66, line 69 (Decision ML-1).
- `docs/master-plan.md` lines 57, 118, 144.

**Files opened for Question 7:** 2 (`docs/decisions.md`, `docs/master-plan.md`).

---

## 8. Name three things that must never be committed to this public repo, and the rule about deleting files the owner did not ask to be deleted.

### Answer:
1. **Three Things That Must Never Be Committed**:
   - **Secrets, tokens, and private keys**: API keys, database credentials, Sanity tokens, session secrets, or private SSH keys (Rule S1, S2).
   - **Environment configuration files containing values**: `.env*` or `.env.local` files (only `.env.example` templates with variable names may be committed) (Rule S1, S17).
   - **Server IP addresses, internal hostnames, personal email addresses, or account numbers** (Rule S1).
2. **Rule About Deleting Files**:
   - "**Ask before deleting any file the owner did not ask to be deleted (including generated or ignored files).**"
   - In addition, Rule S5 prohibits "deleting branches you did not create" without explicit owner authorization.

### Citations:
- `AGENTS.md` line 99 (Rule S1), line 100 (Rule S2), line 103 (Rule S5), line 127 (Rule S17).
- `docs/decisions.md` line 71 (Decision of 2026-10-25).

**Files opened for Question 8:** 2 (`AGENTS.md`, `docs/decisions.md`).

---

## 9. Things Hard to Find, Ambiguous, or Contradicted Between Documents

This section highlights discrepancies, ambiguities, and potential hazards identified across repository documentation on `origin/main`:

### A. Contradictions

1. **Required CI Checks Count (Two vs. Three)**:
   - `AGENTS.md` line 57 states: *"GitHub branch protection enforces it: a PR is required, both CI checks (web and cms) must pass..."*
   - In contrast, `AGENTS.md` line 69 states: *"Claude merges, using squash, once all three required checks are green..."*
   - `docs/decisions.md` line 38 explicitly records: *"2026-10-24 | CI checks required on main: web, CMS (SQLite), CMS (Postgres)"*. Line 57 in `AGENTS.md` is outdated and should be updated from "both" to "all three".

2. **Server Access Execution (SSH by Claude vs. Terminal by Owner)**:
   - `docs/staging-plan.md` line 43 (Step S1) states: *"Who: Claude over SSH, after the owner's OK (and the owner must grant the SSH access: Gemini never uses it, S4)"*, and line 49 (Step S2) states: *"Claude if the owner grants it per step"*.
   - However, `AGENTS.md` Safety Rules S3, S4, and S5 emphasize that neither agent has ongoing SSH credentials, and `docs/decisions.md` line 70 (and the execution of S1 in PR #47) established that the owner executes command blocks directly in their own terminal. The phrasing in `staging-plan.md` creates ambiguity over whether Claude logs in or the owner pastes commands.

3. **Backend Root Directory Path (`news-site/api` vs. `news-site/cms`)**:
   - `AGENTS.md` line 50 (Ownership Table) lists the new backend path as `news-site/api/** (proposed; confirm in the design doc)`.
   - In the actual codebase, CI configurations, and later documentation, the backend is strictly located at `news-site/cms/**` (`AGENTS.md` line 15 also notes `news-site/cms`). The table in `AGENTS.md` line 50 should be updated to `news-site/cms/**`.

4. **Migration Script Task Numbering (Task 1.9 vs. Task 1.13)**:
   - In `docs/master-plan.md` line 58, the migration script and content transfer is labeled **Task 1.9**, while **Task 1.13** is labeled "Cutover, with rollback plan" (line 62).
   - In `docs/staging-plan.md` line 7 and line 79 (Step S7), the migration script rehearsal is labeled **Task 1.13**.

---

### B. Ambiguities & Stale Information

1. **File Deletion Restriction Missing from `AGENTS.md`**:
   - The critical safety rule *"Ask before deleting any file the owner did not ask to be deleted (including generated or ignored files)"* is recorded in `docs/decisions.md` line 71 (dated 2026-10-25).
   - However, it has not yet been added into `AGENTS.md` under Safety Rules S1–S18. A fresh agent reading only `AGENTS.md` would only see the prohibition against deleting branches (S5).

2. **Database Choice Open Question Status**:
   - In `docs/progress-checklist.md` section 6 (Open Questions), Question 1 asks: *"Database: Postgres (planned) or SQLite in production?"*
   - However, `docs/master-plan.md` task 1.3 was completed and merged in PR #23 with `@payloadcms/db-postgres`, and `docs/staging-plan.md` line 13 specifies Postgres 17. The question in `progress-checklist.md` is stale and resolved.

3. **Global Unified PR and Issue Sequence Counter**:
   - GitHub shares a unified sequence counter across issues and pull requests. When review issues reach numbers like #48 or #49, it creates an ambiguity where an agent or observer might assume there are 49 PRs. In reality, there are only 35 PRs (33 merged, 2 open), with 14 interleaved tracking issues (`gemini-task`).

4. **Third-Party Provider Assumptions**:
   - `docs/staging-plan.md` line 27 notes that whether Cloudflare R2 requires an active payment method on the free tier was not verified against official terms.
   - `docs/cutover-runbook.md` line 34 notes that Cloudflare Access's 50-user free allowance and URL path scoping behavior remain unverified through live configuration.

---

## Verification & Guard Rails

### Verified by me:
- Every line citation in this document was verified by direct inspection of repository files on `origin/main` (`1f02e3e`) at `C:\Users\mboss\Projects\my-first-project-gemini`.
- Confirmed zero server IP addresses, internal hostnames, secrets, or personal credentials appear in this document.
- Verified that this change introduces strictly a single new file in `docs/briefs/` without modifying any existing documentation, configuration, lockfiles, or code.

### Not verified:
- Live Coolify or VPS dashboard configuration settings (requires S5 owner authorization; not accessible by Gemini per Rule S4).
- Third-party cloud vendor payment rules or plan changes for Cloudflare R2 and Backblaze B2.
