# Language-readiness spike (task 1.8a)

**Date:** 2026-10-25 · **Author:** Claude Code · **Branch / PR:** `claude/localization-spike`
**Decision: GO.** Turn language support on in the CMS now, with English as the only language that has content. The same PR does it; the website does not change.

## Why this came first
In a CMS with several languages, text fields (headline, body, and so on) are stored once per language. Switching that on **after** content exists is a destructive change to the database. Measured below: applied as Payload generates it, it erased every text. Doing it before the first real migration costs a few hours; doing it later costs a careful data migration on live content.

## What was done
Payload localization switched on in `news-site/cms` on a throwaway branch: English (default), Spanish, Chinese, Arabic (right-to-left), English filled in, the others empty. Tested on SQLite and on a **local Postgres** holding the real content (13 articles, 13 images, copied from Sanity by the migration script). Nothing was run on the server.

## The eleven questions
| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Which fields are per language? | **Per language:** article headline, excerpt, body, review status, correction note; category and topic names; author role and bio; image alt text and caption. **Shared:** slug, dates, links to category, topics and author, the hero image file, `featured`, author name, the guest byline. | `Articles.ts`, `Taxonomy.ts`, `Media.ts` |
| 2 | Does an English-only article behave as today? | **Yes.** The 100 existing CMS tests pass unchanged. The website built in CMS mode against the language-ready database matches the Sanity baseline: **24 of 27 pages identical**, the other 3 differ only in where Next places streamed content (same as before). | `npm test`; page comparison |
| 3 | Can one language be published without the others? | **Yes, but only with Payload's per-language publish status, which Payload labels experimental.** Measured without it: a saved Spanish draft **became public the moment English was published** (the draft headline and body were served). With it on: the draft stays private (Not Found) before and after English is published; publishing Spanish publishes only Spanish; unpublishing Spanish leaves English up. | `localization.int.spec.ts` (3 tests) |
| 4 | What does the public API return for a language with no translation? | Only **published** languages are served. An unpublished language returns Not Found for one article, and **0 stories** in a list, **even with the English fallback switched on**. The CMS never mixes languages. What a Spanish visitor sees for an untranslated story (a notice, a link to English) is the website's decision (task L.3). With fallback on, an *unfilled field of a published language* shows the English text; asking with `fallback-locale=none` returns it empty, so "translated or not" is detectable. | tests; REST calls |
| 5 | Slugs per language? | **Decision: one shared slug** (`/es/article/<same-slug>`). A per-language slug failed in practice: the slug function keeps only a to z and 0 to 9, so an **Arabic or Chinese headline gives an empty slug** and publishing is refused. A shared slug also makes the links between language versions trivial. Localised slugs can be added later as a separate field. | tests (`slugify` of Arabic and Chinese is empty) |
| 6 | Does the rich-text body work per language? | **Yes.** Each language keeps its own body; both read back correctly. | tests |
| 7 | What does turning it on cost when data exists? | **Destructive as generated.** Applied to a copy of the database holding the 13 real articles, the generated migration left 13 article rows and **0 headlines, 0 bodies, 0 category names, 0 image alt texts**. A hand-edited migration (copy every text into the English rows before dropping the old columns) kept **all 13 headlines, bodies and statuses, 6 category names, 13 alt texts**, and a planted correction. On a **brand-new empty database** (what staging and production will be) both migrations just apply. | measured on Postgres; `20261025_124813_localization.ts` |
| 8 | Do the migration script and the website's data layer need a language argument? | **Not for English.** The migration script ran unchanged against the language-ready Postgres schema (13 articles, 13 images, no problems; a second run skipped all 26 items). The data layer needs a `locale` parameter only when a second language goes live (task L.3). | measured |
| 9 | Can a translator be limited to some languages? | **Feasible.** An access rule can see which language a save is for (`req.locale`; tested with a real save in Spanish and Arabic), and field-level access can freeze the shared fields. The role itself is not built: it needs a new role value and a languages field on users, so a migration (task L.1). | test |
| 10 | Right-to-left editing and the admin in Arabic? | **Partly.** Arabic text is stored and read back exactly (on Postgres UTF8), and Arabic is configured right-to-left. **Not verified:** how the admin screens look when editing Arabic. | test; **not looked at** |
| 11 | Committed migrations and Postgres CI? | Both migrations apply on an empty Postgres; the whole CMS suite passes on Postgres (UTF8) and SQLite: **115 passed, 1 skipped**. | `TEST_DATABASE_URL` run |

## New things the spike found
1. **The production database must be UTF-8.** On a Postgres created with Windows' legacy encoding, saving Arabic failed ("no equivalent in encoding WIN1252"). Docker's Postgres defaults to UTF-8, but this is now a required check in staging step S3 (`SHOW server_encoding;`).
2. **The writer rule needed hardening.** With a status per language, "published" can arrive as a word or as an object (`{ en: "published" }`). Payload happens to reject the object form, but our rule now understands both (`asksToPublish`), with its own direct tests, so security does not depend on an experimental feature's internals.
3. **The generated migration must not be run blindly.** It is hand-edited (documented in its header). `down()` refuses, because reversing would delete every language except English; the answer is the backup taken before any migration (S16). When the schema changes again, generate the next migration from the latest snapshot and keep this one as is.
4. **Cost of waiting is not hypothetical.** The same change after real content existed is the measured data-loss case above.

## What changes in the repo (this PR)
`payload.config.ts` (the four languages, `fallback: true`, `experimental.localizeStatus`), the four collection files, the new migration (and its snapshot), `access/roles.ts` (`asksToPublish`), regenerated `payload-types.ts`, `tests/localization.int.spec.ts` (16 tests). Nothing in `news-site/web` changes.

## Risks, plainly
- **Per-language publish status is experimental in Payload 3.92** and Payload documents it as beta. Mitigation: the Payload version is pinned; the spike tests fail loudly if its behaviour changes; re-run them on every Payload upgrade. Without it, a Spanish draft leaks, so it is not optional.
- A Payload issue report (found by search, not reproduced here) says the first edit of a document in a non-default language can show a false "document modified" warning. **Not verified.** Check in the admin before writers use it.
- Not tested: scheduled publishing per language; version history per language; a required alt text when uploading in a non-default language; performance with four languages.
- The spike used a local Postgres 18 (beta build); CI and production use Postgres 17. The migration SQL is plain DDL and the CI job runs it on 17.

## Next
Gemini reviews; then the migration rehearsal on staging (S7) is unblocked. Language features themselves stay after launch (decision ML-1): the translator role (L.1), the desk (L.2), language editions (L.3), hreflang and sitemaps (L.4, L.5), the switcher (L.6). Because of this spike they are switch-on work, not a rebuild.
