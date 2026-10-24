# CS NEWS progress checklist

The living record of **what was done** and **who tested it**. Updated by whoever opens or reviews a PR (AGENTS.md workflow step 11). One row per change. Nothing is "tested" here unless a command, result or PR comment backs it.

**Last updated:** 2026-10-24 by Claude Code.

**Legend:** ✅ done and checked · ⏳ waiting · ➖ not applicable · ⚠️ gap or caution

## 1. Rules for keeping this file honest

- **Author's column**: exact checks the author ran (commands and results, not "tested").
- **Reviewer's column**: only what the *other* agent ran in its own review worktree, with the PR comment as evidence. Leave ⏳ until that exists.
- A change merged before its review gets ⚠️ and the review becomes post-merge verification; anything it finds is fixed forward in a new PR.
- Owner actions (merges, accounts, server changes) are listed with how they were verified.

## 2. Changes merged to `main`

| PR | What | Claude's checks | Gemini's checks | Notes |
|----|------|-----------------|-----------------|-------|
| #3 | Working agreement `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Docs only; CI green | ✅ Two reviews. Found 5 real problems (worktree command, `page.tsx` ownership, `@` import, review worktrees, trailer); all fixed; re-review approved | Gemini's first test of independence |
| #5 | `.gitattributes` (LF endings) | ✅ Review: 1 file; `git add --renormalize .` changes nothing; 95 files | ➖ author | Gemini authored |
| #8 | vitest and 15 helper tests | ✅ Review: lockfile 62 added, 0 removed; 15/15 pass; **found** a test failing outside UTC and fixed it | ➖ author | Gemini authored |
| #9 | CMS trial: Payload 3.92.0, roles, scheduling, images, rich-text converter, migrations, CI | ✅ 30 tests, tsc, build; clean-checkout recheck; production start; **found** missing-tables 500 and fixed it with a migration; live dry run 13/13 articles identical | ✅ 8 attack cases: 7 held, **found** writers could read others' draft versions; fix re-verified (10/10), approved | Claude then found the same leak on direct reads |
| #10 | Reader-facing dates in UK time | ✅ 19 tests in 3 time zones; fails when fix removed; route table unchanged | ✅ Approved; tested one millisecond either side of UK midnight in BST and GMT | Live site verified |
| #13 | CMS: slug from headline, review status, upload limits (25 MB, HEIC message) | ✅ 39 tests; each rule fails when disabled; migrations apply to a fresh DB; production start; CI caught one stale generated file, fixed | ✅ Approved; tried writer setting "changes", slug edge cases (emoji, punctuation, 160 chars, duplicates) | |
| #16 | CMS: schedule guard (T22), explicit lockout, sessions, CSRF origin | ✅ 48 tests; tsc; build; production smoke; guard switched off makes 2 tests fail | ⚠️ Merged before Gemini's review. ✅ Post-merge review posted: **REQUEST CHANGES**. Reproduced probe (b): a signed-in writer naming an editor in a job's `input.user` passed the guard. Passed: writer naming themselves, nonexistent or missing user, cancel by id and by `where`, REST job runner, lockout with alternating email case | Fix in PR #19 (also proved: Payload gives no REST route to create jobs, so practical exposure was low). Merged early by the owner; findings fixed forward |

## 3. Open pull requests

| PR | What | Claude's checks | Gemini's checks | Blocking |
|----|------|-----------------|-----------------|----------|
| #18 | Publish webhook (task 1.10): CMS tells the website when content goes live | ✅ CMS 57 tests, web 30 tests, both `tsc` and builds clean; **real built website over HTTP**: no secret 401, wrong secret 401, right secret 200 with the expected paths, bad JSON 400, GET 405; secret check switched to always-pass makes the test fail; **found** that autosaving a live article looks identical to unpublishing it and fixed it by reading the stored live copy. ⚠️ CMS and website not yet tested talking to each other (needs staging) | ⚠️ **Merged before Gemini's review** (merged to `main`, so it deployed). ⏳ Post-merge test (Part F of the 2026-10-24 task) | Gemini post-merge review |
| #19 | CMS: schedule guard refuses a signed-in caller naming someone else (Gemini's finding on #16) | ✅ 63 tests; tsc; build; new tests for forged editor, impersonation, and the real REST handler (job count unchanged); with the new check disabled the forged-editor and impersonation tests fail | ⏳ re-run probe (b) and the other probes against this branch | Gemini review, owner merge |
| #17 | This checklist, and corrections to `AGENTS.md` (deploy is automatic; branch protection is on) | ✅ docs only; CI | ⏳ not yet reviewed | Gemini review |
| #20 | Gemini: fix two lint errors in `TextSizeControl` and `ThemeToggle` (`useSyncExternalStore`) | ✅ Review in a worktree: tsc clean; eslint `src` 0 errors; 30 tests; build, 28 routes as on main; **ran the PR's code in a browser**: saved dark + larger restored after reload with no console errors; text size cycles and persists; theme buttons set `aria-pressed` and persist across reload; placeholder before mount means no hydration mismatch. Not tried: storage blocked (private mode), same as before | ➖ author | **Owner's visual sign-off** (screenshot sent), then merge |
| #15 | Data seam stage 1: all content reads through `src/data` | ✅ tsc; 21 tests incl. guard test; build; route table unchanged; **36 of 36 prerendered pages identical** before and after | ✅ Approved: 0 type errors, 21/21 tests, routes preserved, prerendered text of home, article, category and RSS feed identical (Gemini's PR comment) | Owner merge |
| #14 | Gemini's CMS attack-test suite (cases a–n) | ✅ Review: 46 pass; cases l and m well built; requested two fixes. ✅ **Re-check:** case n now requires exactly 400 with no fallback; case j renamed; branch contains `main`; CI green. Not re-run: the full local count | ➖ author. ✅ Addressed, rebased (reports 73 passed, 1 skipped) | Owner merge |
| #11 | Writer walkthrough checklist | ✅ Review requested 10 accuracy fixes | ✅ Revised; ⏳ my re-check | Claude re-check |
| #12 | Editor UX proposal | ✅ Review requested changes (invented colours) | ✅ Revised to the real colour tokens; ⏳ my re-check | Claude re-check |
| #4 | Backend design doc | ✅ Updated to v0.3 with research, budget gate and Gemini's points | ✅ Reviewed v0.3 earlier, and re-reviewed 2026-10-24: approve | Owner merge |
| #6 | Threat model | ✅ v0.2; statuses updated | ✅ Reviewed earlier (approve with changes, applied); re-reviewed 2026-10-24: approve | Owner merge (statuses now stale: T22 follow-up is PR #19) |
| #7 | Backend plan sheet | ✅ Written | ✅ Reviewed 2026-10-24: approve; recommends updating task 1.10 (now merged) | Update 1.10, then owner merge |

## 4. Server and repository settings (owner actions, verified by Claude)

| Item | How verified | Gemini |
|------|--------------|--------|
| Branch protection on `main` (PR required, both CI checks required, admins included, no force-push) | Read back from the GitHub API | ➖ no access to repo settings |
| Coolify dashboard on its own HTTPS address; Hetzner firewall allows only ports 22, 80, 443 | Port scan from outside: 8000, 6001, 6002, 8080 closed; site and dashboard answer 200 | ➖ no server access (S4) |
| VPS audit: 4 vCPU, 7.75 GB RAM, 50 GB disk free, no swap, Node 22.19.0 for the site | Output the owner pasted from a read-only command | ➖ |
| Backup of repo history, untracked files and Claude data to `D:\CSNEWS-Backup` | `git bundle verify` ok; file counts 264/264 | ➖ |

## 5. Backend plan progress (`docs/backend-plan.md`)

| Phase | Done | Next | Waiting on |
|-------|------|------|-----------|
| 0: trial | P0.1–P0.8, P0.10, P0.11; G0 decided | P0.9 walkthrough (PR #11, in review) | Gemini |
| 1: content backend | 1.7 data seam stage 1 (PR #15, in review); 1.10 publish webhook (PR #18, in review); security items T1, T4 partly, T5 partly, T22 (merged, #16) | Seam stage 2 (images, bodies); lint in CI (after Gemini's lint-fix PR); CMS on Postgres and staging | #15 and #18 review and merge; owner: database choice, staging go-ahead |
| 2: reader accounts and search | not started | | after G1 |
| 3: subscriptions and paywall | not started | | after G2 and the owner's legal and tax check |

## 6. Open questions for the owner

1. Database: Postgres (planned) or SQLite in production?
2. May Claude set up a staging copy on the VPS? (needs the owner's go-ahead)
3. Two-factor login or an access gate for the admin (threat T8) before any staff account goes live.
