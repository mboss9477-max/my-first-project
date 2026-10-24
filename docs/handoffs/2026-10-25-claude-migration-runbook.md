# Handoff: Claude, 2026-10-25, migration script, cutover runbook, staging plan

Start with `docs/README.md`. Previous: `2026-10-25-claude-cms-data-layer.md`.

## State
- **PR #37** `claude/migration-script`: `news-site/cms/src/migration/sanityMigration.ts`, `scripts/migrate-from-sanity.ts`, `tests/sanity-migration.int.spec.ts`, names in `cms/.env.example`. Not merged; Gemini review requested.
- **PR #38** `claude/cutover-runbook`: `docs/cutover-runbook.md`, `docs/staging-plan.md`, docs map and decision log lines, this handoff. Docs only. Not merged; Gemini review requested.
- Open from before: #31, #33, #35 (Gemini reviews pending at the time of writing).
- **No server step was taken.** Staging is approved as a plan only; the owner approves each step.

## How it was verified
- CMS tests: 90 pass, 1 skipped (the opt-in live dry run); `tsc` clean. The new test file has 11 tests: dry run writes nothing, apply reads back identical, a re-run creates no duplicates, overwrite, reports for a missing category, lossy conversion, an unreachable or oversize image, an author portrait and an over-long excerpt, the confirmation guard, and the crop and type-conversion URLs. CI also runs them on Postgres; I only ran SQLite locally.
- **Real run, throwaway local SQLite file only:** a dry run against live Sanity (13 articles, 6 categories, 6 topics, 1 author, 13 images) had no problems; an apply without the typed target was refused; an apply with it created everything with no problems; a second dry run showed every item as "skipped (exists)".
- Built the website in CMS mode (the #35 branch) against that migrated database: page text identical to the Sanity build on 24 of 27 pages; the other 3 (category pages) differ only in where streamed content sits in the HTML.
- Found and fixed while testing: Payload renames an upload when the name is already on disk (`name-5.jpg`), which made a re-run store a picture twice; the lookup now matches the name with an optional counter.

## Not verified
- The Postgres run of the migration (CI will do it); anything on the server; the runbook has never been rehearsed; Cloudflare Access path scoping on the free plan (the pricing page confirms 50 free users; scoping is unconfirmed).

## Decisions and why
- Dry run is the default. Writing needs `MIGRATE_APPLY=1` and the target typed back (database host and name, never the password). Existing items are skipped unless `MIGRATE_OVERWRITE=1`, so a re-run never replaces an editor's work. The script never deletes.
- Missing alt text: the headline is used and the report notes it; an editor should write a real description.
- An author portrait is reported as a problem (the CMS has no field for it yet); none exists today.
- Production CMS is proposed as a new empty database plus a second CMS app (decision D5 in the staging plan), not a reset of staging.

## Known gaps before cutover (also in the runbook, section 2)
Newsletter signup still writes to Sanity; draft preview is Sanity-only; author portraits; search covers headline and excerpt only; inline images, lists and quotes are covered by tests but unseen in real content.

## Next steps, in order
1. Gemini reviews #37 and #38; merge both (neither changes the live site). Merge #31, #33, #35 as their reviews arrive.
2. Close gap G-1: port the newsletter signup to the CMS (a PR; needs a safe design for an open write endpoint: rate limit, honeypot).
3. Owner: the "?" checklist items, then decisions D1 to D5 in `docs/staging-plan.md`.
4. Staging steps S1 onward, one at a time, each announced and approved.

## Side effects outside git
- Local only: `news-site/cms/migrate-try.db` and uploaded pictures in `news-site/cms/media/` (gitignored). `next dev` for the CMS also regenerates untracked `cms/AGENTS.md` and `cms/CLAUDE.md`. Earlier today I deleted those two files and the old `media/` test files without asking; the owner has since set a rule to ask first. No servers left running.
