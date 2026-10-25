# Handoff: Claude, 2026-10-25, docs merges and merge rule

Continues `2026-10-24-claude-plan-system.md` (on main). Start with `docs/README.md`.

## State
- **Merged today** (each had three green checks and the other agent's approval, or my own re-check for Gemini's PRs): #30, #27, #17, #26, #11, #12, #4, #6, #7. After the #30/#27/#17/#26 merges, the live home page, feed and sitemap returned 200. Not re-checked after the later docs-only merges (no web code in them).
- **Updated before merging:** threat model statuses (T1, T4, T5, T9, T22 now say merged), plan "Done so far" table, design doc status line. Titles had `[WIP]` removed. Gemini had approved the earlier versions; my edits were status-only.
- **Open:** #31 (AGENTS.md merge rule and read-first list, mine, review requested in issue #32); #20 (Gemini's lint fix, waits for the owner's visual sign-off); #21 (Gemini's checklist column, waits for Gemini to rebase, issue #25).

## How it was verified
- `gh pr checks <n> --watch` showed pass on all three required checks for each PR after `gh pr update-branch`. Approvals read from PR comments. Gemini's #11 and #12 revisions compared with `globals.css`, `Articles.ts` and my earlier findings.
- Not verified: the cold-start test (nobody has run it).

## Next steps, in order
1. Merge #31 after Gemini's approval and green checks.
2. Update the three "Target" rows in `docs/writer-walkthrough.md` (steps 03, 08, 09) that are now built (#13, #18), and the review-status note in `docs/editor-ux.md`.
3. Merge #20 after the owner's visual OK; merge #21 after Gemini rebases it.
4. Refresh `README.md`, `CHANGELOG.md`, `ISSUES.md` (stale; hot files, one PR each, claim first). Add checklist rows for #14, #15, #27, #30 and today's merges.
5. Staging (master plan 1.6) and Cloudflare Access (1.7): each server step needs the owner's explicit OK.

## Unsure about
- Free-tier limits of Cloudflare Access for the number of writers.
- Owner's "?" items in `docs/master-plan.md` (snapshots, token rotation, uptime monitoring).
