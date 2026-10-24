# Handoff: Claude, 2026-10-24, plan system and context on GitHub

Written so a brand-new session (Claude or Gemini) can continue with no memory of the previous chat.

## Start here, in this order
1. `AGENTS.md`, then `docs/README.md` (reading order and docs map), `docs/decisions.md`, `docs/master-plan.md`, this file.
2. `gh pr list --state open` and `gh issue list --label gemini-task --state open`.
3. Owner's working rules (also in `decisions.md`): finish the current task before a mid-task query, then always return to it; secrets never printed or committed (the repo is public); report honestly what was and was not verified; spending and server changes need the owner's explicit OK.

## What this session did
- Chose and set up the plan system: `docs/master-plan.md` (milestones M0 to M7 to launch day), a dated decision log, a history, project context, and a docs map (PR #27). A Notion page holds the whole plan; GitHub holds the context.
- Owner decisions recorded: **Claude merges when the three required CI checks are green and the other agent approved** (UI changes still need the owner's visual sign-off; server, DNS, settings, spending and credentials need explicit OK); **staging approved in principle**; **admin login protected by Cloudflare Access** (verify free-tier limits first); Notion carries the plan, GitHub the context.
- Merged: #14 (Gemini's attack tests), #15 (data seam). Earlier today: Postgres (#23), guard fix (#19), webhook (#18) and its null-body fix (#22).
- Checked Gemini's report on issue #24: verified; found one stale comment of mine (a `test:postgres` script that does not exist), fixed in PR #30.

## State of open pull requests
| PR | What | Needs |
|----|------|-------|
| #27 | Master plan, decisions, history, project context, docs map | Gemini review (issue #28), then Claude merges |
| #17 | Progress checklist; corrects stale statements in AGENTS.md | Gemini review (issue #29); CI green |
| #26 | AGENTS.md "Task queue" section | Gemini review (issue #29); CI green |
| #30 | Comment-only fix in the test helper | Gemini review, then Claude merges |
| #4, #6, #7 | Backend design, threat model, plan sheet (drafts) | Gemini already approved. Update stale statuses (threat model T22 is now fixed, plan task 1.10 is done), mark ready, update branch, merge |
| #11, #12 | Gemini's writer walkthrough and editor UX (revised) | **Claude's re-check** of the revisions, then merge |
| #20 | Gemini's lint fix (theme toggle and text size) | **Owner's visual sign-off** (screenshot was sent), then merge |
| #21 | Gemini's checklist column | #17 merged first, then Gemini rebases (issue #25) |

Older PR branches show **BLOCKED** until CI runs the new required check "Test on Postgres (cms)": run `gh pr update-branch <n>` to trigger it.

## Open issues for Gemini
#25 (rebase #21 after #17), #28 (review the plan docs, then the cold-start test), #29 (review #17 and #26). Gemini finished #24.

## How it was verified
- #14 and #15 merged only after the gating conditions were read back (green checks, other agent's approval comment). After each, the live site returned 200 for the home page, an article, a category, the feed and the sitemap.
- Gemini's #24 claims checked against GitHub: the cited CI run 40106827044 is green on all three jobs; the issue comment exists; the checklist rows exist on `gemini/checklist-gemini-column`.
- Not verified: the cold-start test (nobody has run it yet).

## Decisions and why
See `docs/decisions.md`. New today: merge authority (speed, with a post-merge health check and revert rule), Cloudflare Access (a gate with no code in the CMS), Notion for the whole plan.

## Next steps, in order
1. Gemini works issues #25, #28, #29. Claude merges #27, #17, #26, #30 as approvals arrive.
2. Re-check Gemini's #11 and #12; update stale statuses in #4, #6, #7; mark them ready; merge.
3. Merge #20 after the owner's visual OK.
4. Refresh `README.md`, `CHANGELOG.md`, `ISSUES.md` (all stale); update AGENTS.md with the merge rule, the owner's working rules and the read-first list; add decision lines.
5. Add rows to `docs/progress-checklist.md` for #14, #15, #27, #30 and today's merges (the file lands with #17).
6. **Staging** (master plan 1.6): each server step needs the owner's explicit OK. Plan: DNS record for a CMS subdomain (owner, Cloudflare, DNS-only while SSL is issued), Postgres and CMS containers in Coolify with memory limits and their own volume, a swap file, env var **names** only in the repo, then re-test from outside.
7. **Cloudflare Access** in front of the CMS admin (1.7).
8. Create issues and milestones for M0 and M1 tasks; sync the Notion page after each milestone.

## Traps learned the hard way
- PowerShell: `gh ... --jq` with quotes and spaces often fails ("accepts at most 1 arg"); parse with `ConvertFrom-Json` instead. Post long text with `--body-file`, never inline: Gemini's comments came out corrupted because PowerShell turned backslash sequences into control characters (`npm` showed as `pm`). Ask Gemini to use `--body-file`.
- Do not write source files through PowerShell redirects; use the edit tools (a UTF-8 corruption happened once).
- "changed on disk since you last read it" notices appear after switching branches; they are not real changes.
- Payload skips field `validate` on draft saves; use hooks for draft rules. Payload's job access settings apply only when a caller opts in; the jobs collection guard in `src/access/jobsGuard.ts` is what enforces schedule rules.
- The Browser pane must be shown (`mcp__ccd_view__show_pane`) before screenshots work.
- A throwaway local Postgres for testing runs through `embedded-postgres` installed in the session scratchpad, not in the repo; it is not required (CI runs Postgres).

## Side effects outside git
- Notion: one private page, "CS NEWS: master plan, first day to launch day", at the top of the owner's workspace. Not committed anywhere.
- GitHub: label `gemini-task`; issues #24 to #29; branch protection now requires the web, CMS (SQLite) and CMS (Postgres) checks.
- A backup of repo history, untracked files and Claude data exists on the owner's computer (drive D, folder CSNEWS-Backup).

## Unsure about
- Exact status of the owner's checklist items marked "?" in `docs/master-plan.md` (Hetzner snapshots, token rotation, uptime monitoring, Coolify secrets file backup).
- Whether the free tier of Cloudflare Access covers the number of writers; verify before relying on it.
