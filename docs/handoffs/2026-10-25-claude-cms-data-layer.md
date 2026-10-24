# Handoff: Claude, 2026-10-25, CMS data layer (plan 1.9) and article bodies (stage 2b)

Start with `docs/README.md`. Previous handoff: `2026-10-25-claude-docs-merges.md`.

## Goal
Let the website read the new Payload CMS instead of Sanity, switchable, local only. No server, DNS or production data touched.

## State
- Branch `claude/cms-data-layer`, PR #35. It contains #33 (image seam) as its base; #33 must merge first, then this branch is updated. Review requested from Gemini (issue filed).
- `CONTENT_SOURCE=cms` (with `CMS_URL`) switches the site to the CMS; unset or `sanity` keeps Sanity. Names are in `news-site/web/.env.example`.
- New: `src/data/{types,sanity,cms}.ts`, `src/components/LexicalBody.tsx`, neutral body and image types, `news-site/cms/scripts/seed-local.ts` (local SQLite only; refuses anything else).

## How it was verified (all local)
- `tsc` clean in web and cms; web tests 48 pass (new: `data-cms.test.ts`, `lexical-body.test.tsx`).
- **Sanity mode unchanged:** built `main`-equivalent output and this branch; text and image URLs identical on all 27 content pages.
- **CMS mode:** seeded a throwaway SQLite CMS from the live public Sanity content (13 articles, 6 categories, 6 topics, images), built the site with `CONTENT_SOURCE=cms`: same route table (nothing flipped dynamic), feed and sitemaps keep their refresh windows (10 min, 5 min, 1 hour). Page text identical to the Sanity build on every page. Category pages differ only in where the content sits in the streamed HTML.
- Ran `next start` against the local CMS: article, search, category, feed, sitemap, author, topic all 200. In the browser the article page rendered with its hero image served through the Next image optimiser from the CMS, no console errors.

## Not verified
- Inline body images, lists, quotes, links: no live article uses them, so these are covered by unit tests only, not seen in a browser.
- Search is narrower: headline and excerpt only (body search comes with Postgres full text, plan 2.5).
- CMS authors have no portrait field, so author pages show no portrait in CMS mode.
- Draft preview (`/api/draft-mode`) and newsletter signup still use Sanity.
- Not run against Postgres, staging or production.

## Decisions and why
- "Updated" date in CMS mode = the CMS `revisedAt` (editors' decision), not `updatedAt` (changes on every save).
- CMS images come in fixed 16:9 sizes; the data layer picks the smallest wide enough and the page crops it.
- `next.config.ts` allows the CMS image host and CSP origin only when `CONTENT_SOURCE=cms`; `dangerouslyAllowLocalIP` only if that host is localhost.

## Known issues and risks
- Production needs: a staging CMS (S5), `CMS_URL`/`CMS_PUBLIC_URL`, a persistent media volume, and the real migration (plan 1.13); the seed script is a test aid, not the migration.
- If the CMS is down at build time, `CONTENT_SOURCE=cms` builds fail (static params need it). Sanity mode is unaffected.

## Next steps, in order
1. Gemini reviews #33 then #35; merge #33, update #35, merge #35 (default stays Sanity, so merging does not change the live site).
2. Plan 1.11 image config for production hosts; 1.13 real migration script; 1.15 cutover runbook with the switch-back step (`CONTENT_SOURCE` unset).
3. Staging (needs the owner's OK), then run this same comparison against staging.

## Side effects outside git
- Local only: `news-site/cms/seed-local.db` and `news-site/cms/media/` (gitignored). I deleted the old contents of `cms/media/` (test uploads, gitignored) when reseeding. No servers left running.
