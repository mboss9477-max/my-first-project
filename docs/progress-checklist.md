# CS NEWS progress checklist

The living record of **what was done** and **who tested it**. Updated by whoever opens or reviews a PR (AGENTS.md workflow step 11). One row per change. Nothing is "tested" here unless a command, result or PR comment backs it.

**Last updated:** 2026-10-24 by Gemini CLI.

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
| #18 | Publish webhook (task 1.10): CMS tells the website when content goes live | ✅ CMS 57 tests, web 30 tests, both `tsc` and builds clean; **real built website over HTTP**: no secret 401, wrong secret 401, right secret 200 with the expected paths, bad JSON 400, GET 405; secret check switched to always-pass makes the test fail; **found** that autosaving a live article looks identical to unpublishing it and fixed it by reading the stored live copy. ⚠️ CMS and website not yet tested talking to each other (needs staging) | ⚠️ Merged before review. ✅ Post-merge adversarial testing: tested header variants (Bearer without secret 401, lowercase header 200, whitespace trimmed per HTTP spec), huge bodies (1 MB rejected 413, >2000B rejected 413), malformed JSON 400. **Found null body crash**: raw `null` throws uncaught TypeError (`Cannot read properties of null (reading 'type')`) returning 500 instead of 400. Neutralized 13 hostile slug traversal/injection patterns. Verified CMS hooks (publish, unpublish, delete, taxonomy notify; draft autosave does not notify; unreachable site handled gracefully). | Merged to `main` by owner (`9c2478f`). Null body finding reported on PR and fixed in PR #22. |
| #19 | CMS: schedule guard refuses a signed-in caller naming someone else (Gemini's finding on #16) | ✅ 63 tests; tsc; build; new tests for forged editor, impersonation, and the real REST handler (job count unchanged); with the new check disabled the forged-editor and impersonation tests fail | ✅ Review in worktree: **APPROVE**. tsc clean; 63 passed, 1 skipped; build clean. Adversarial probes: probe (a) refused (403); probe (b) forged editor refused (403), vulnerability closed; probe (c/d) refused (403); editor self-scheduling works; editor impersonation refused (403); cancel by ID/where refused; REST GET /api/payload-jobs/run refused; anonymous POST and GraphQL mutation refused. | Merged to `main` by owner (`b4f1a3b`). Closed Gemini finding on #16. |
| #22 | Webhook route: answer 400, not 500, when JSON body is not an object (Gemini's finding on #18) | ✅ Reproduced first; tsc clean; eslint clean; 30 passed; build passes; real HTTP tests: null, [], string, 42 return 400, valid object returns 200 | ✅ Review in worktree: **APPROVE**. tsc clean; 30 passed; build passes. Re-ran body probes: `null`, `[]`, `"x"`, `42`, `-1`, `3.1415`, `true`, `false`, `[1, 2, 3]`, `[{"type": "article"}]` all return 400 (*Body must be a JSON object*); empty object and missing type return 400; valid article, category, and null slug return 200. | Merged to `main` by owner (`91dea2f`). Closed Gemini finding on #18. |
| #23 | CMS: run on Postgres (plan task 1.3) | ✅ tsc; npm test = 63 passed, 1 skipped on SQLite; CI green on all three jobs (cms SQLite/build, cms Postgres 17, web build); production start smoke; migration `20261024_151956_initial` applies in 120ms | ⚠️ Merged before review. ✅ Review in worktree: **APPROVE**. tsc clean; 63 passed, 1 skipped on SQLite; build clean. Cited CI run 40106827044 job 120910139543 (Postgres 17, 63 passed, 1 skipped, migration ok, smoke ok; no local Docker/pg on Windows host). Adversarial probes: `DATABASE_URL` unset (sqlite), empty string (sqlite), malformed/non-pg schemes (sqlite), `postgres://` (pg), `postgresql://` (pg), uppercase schemes `POSTGRESQL://` / `POSTGRES://` (pg), `testDatabase.js` helper (safe identifier sanitization, force drop/create, isolated per test, dynamic config import order). | Merged to `main` by owner (`5d81d70`). Completes backend plan task 1.3. |
| #14 | Gemini's CMS attack-test suite (cases a–n) | ✅ Review: 46 pass; cases l and m well built; requested two fixes. ✅ **Re-check:** case n now requires exactly 400 with no fallback; case j renamed; branch contains `main`; CI green. | ➖ author. ✅ Addressed, rebased onto main; case n strictly requires 400 with no fallback; case j clarified as jobs collection access noting T22 remains open; 73 passed, 1 skipped. | Merged to `main` by owner (`4095dfe`). |
| #15 | Data seam stage 1: all content reads through `src/data` | ✅ tsc; 21 tests incl. guard test; build; route table unchanged; **36 of 36 prerendered pages identical** before and after | ✅ Approved: 0 type errors, 21/21 tests, routes preserved, prerendered text of home, article, category and RSS feed identical (Gemini's PR comment) | Merged to `main` by owner (`a73719a`). Completes backend plan task 1.7. |
| #17 | Progress checklist and corrections to `AGENTS.md` (deploy on merge, branch protection) | ✅ docs only; CI | ✅ Approved: checklist structure honest and matches test evidence; AGENTS.md corrections reflect observed reality | Merged to `main` by owner (`dee8759`). Workflow step 11 established. |
| #27 | Docs: master plan (M0-M7), decision log, history, project context, docs map | ✅ docs only; CI | ✅ Review in worktree: **APPROVE**. Ran web/CMS command chains from `PROJECT_CONTEXT.md` (clean); verified stack versions, CI jobs, ports, env vars; privacy scan clean (0 leaks); answered 8 cold-start test questions with file citations. | Merged to `main` by owner (`a20f9d9`). |
| #30 | Test helper: correct comment (no test:postgres script) | ✅ docs only | ✅ Approved: verified `news-site/cms/package.json` has no `test:postgres` script; tests run with plain `npm test` and `TEST_DATABASE_URL` set. | Merged to `main` by owner (`86df979`). |

## 3. Open pull requests

| PR | What | Claude's checks | Gemini's checks | Blocking |
|----|------|-----------------|-----------------|----------|
| #20 | Gemini: fix two lint errors in `TextSizeControl` and `ThemeToggle` (`useSyncExternalStore`) | ✅ Review in a worktree: tsc clean; eslint `src` 0 errors; 30 tests; build, 28 routes as on main; **ran the PR's code in a browser**: saved dark + larger restored after reload with no console errors; text size cycles and persists; theme buttons set `aria-pressed` and persist across reload; placeholder before mount means no hydration mismatch. Not tried: storage blocked (private mode), same as before | ➖ author. Authored PR #20: replaced synchronous `setMounted` in effect with `useSyncExternalStore`; lazy client-side initializers for size/theme. `npx eslint src` 0 errors, 30 tests pass, build 40 static routes identical. Visual test steps provided for owner sign-off. | **Owner's visual sign-off** (screenshot sent), then merge |
| #26 | AGENTS.md: add the Gemini task queue | ✅ docs only; CI | ✅ Review in worktree: **APPROVE**. Verified `gh issue list --label gemini-task --state open` and `gh issue view` work cleanly in Windows environment; safety rule prevents prompt injection. | Owner merge |
| #11 | Writer walkthrough checklist | ✅ Review requested 10 accuracy fixes | ➖ author. Revised with 10 accuracy fixes, built vs target states, 25 MB upload limit, iPhone HEIC guidance. | Claude re-check |
| #12 | Editor UX proposal | ✅ Review requested changes (invented colours) | ➖ author. Revised with exact Settled Gold & Ash tokens from `globals.css`, WCAG AA contrast, journalistic field hierarchy. | Claude re-check |
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
| 1: content backend | 1.3 CMS on Postgres (PR #23, merged to main); 1.7 data seam stage 1 (PR #15, in review); 1.10 publish webhook (PR #18, merged to main); security items T1, T4 partly, T5 partly, T22 (merged, #16; hardened, #19; body validation, #22) | Seam stage 2 (images, bodies); lint in CI (after Gemini's lint-fix PR); CMS staging | #15 review and merge; owner staging go-ahead |
| 2: reader accounts and search | not started | | after G1 |
| 3: subscriptions and paywall | not started | | after G2 and the owner's legal and tax check |

## 6. Open questions for the owner

1. Database: Postgres (planned) or SQLite in production? (Resolved: Postgres merged in PR #23)
2. May Claude set up a staging copy on the VPS? (needs the owner's go-ahead)
3. Two-factor login or an access gate for the admin (threat T8) before any staff account goes live.
