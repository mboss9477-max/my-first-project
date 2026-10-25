# Handoff: Claude, 2026-10-25, multilingual plan changes

Docs only. Start with `docs/README.md`.

## What changed (PR on branch `claude/multilingual-plan`)
- `docs/master-plan.md`: new task **1.8a** (language-readiness spike, before any content is migrated) with an 11-question test list; M6 rewritten as a task table (translator role, translator desk, language editions, hreflang, per-language sitemaps and feeds, the real language switcher, machine translation, Arabic, per-language formats); the switcher moved out of M7; open question **ML-1** (multilingual at launch, or first thing after).
- `docs/backend-plan.md`: row 1.8a and a "Language phase" table (L.1 to L.8), including the translator role flow.
- `docs/decisions.md`: four lines (spike first, translator role, M6 scope, ML-1 open).

## How it was checked
- Payload's localization facts came from a web search of its docs and issue tracker (2026-10-25): fallback is on by default and switchable per request; **per-language publish status is experimental/beta** (`experimental.localizeStatus` plus a per-collection flag); one recent issue reports a false "document modified" warning when first editing a non-default language. **Not found:** whether unique slugs work per language. These are test questions in 1.8a, not assumptions.
- Nothing was built or run for this change.

## Not verified
Everything in the 1.8a test list; whether the existing migration script and data layer need a language argument (question 8).

## Dependencies
- The migration rehearsal on staging (staging plan S7) must wait for 1.8a. The migration script (#37) and the data layer (#35) are built and do not change the answer; they may need a language argument afterwards.
- PR #38 (staging plan, cutover runbook) does not yet mention 1.8a; add one line to staging step S7 and runbook step 5 after #38 merges.

## Next steps, in order
1. ML-1 is decided (owner, 2026-10-25): languages first thing after launch; backend first. Gemini reviews this PR.
2. Run the 1.8a spike (a throwaway branch and a local database; no server). Output `docs/localization-spike.md`.
3. If go: a PR that turns localization on with English only; then the migration script and data layer get the language argument.
