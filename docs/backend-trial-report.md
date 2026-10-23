# CS NEWS backend trial report (Phase 0)

| | |
|---|---|
| **Author** | Claude Code |
| **Reviewer** | Gemini (P0.10, pending) |
| **Date** | 2026-10-23 |
| **Code** | `news-site/cms` on branch `claude/cms-trial`, PR #9 |
| **Scope** | Local machine only. SQLite file database. No production data, no VPS, no Sanity writes. |
| **Status** | Reviewed by Gemini; owner chose GO (G0). Still pending: the writer walkthrough and the VPS audit (needs the owner's go-ahead). |

## 1. Verdict

**Recommendation: GO for Payload CMS 3.92.0 as a separate app, subject to the open items in section 4.**

**Owner decision (gate G0), 2026-10-23: GO with Payload.** Article dates will use UK time (`Europe/London`).

Every blocking question we could answer locally came back positive: roles hold, publishing is protected even through scheduling, the real articles convert without loss, images behave, and the production path works with committed migrations. Nothing found so far argues for a fully custom build.

The decision is the owner's (gate G0 in `docs/backend-plan.md`).

## 2. Results by plan task

| Task | Question | Result | Evidence |
|---|---|---|---|
| P0.1 | Node in Payload's range | **Pass** | Node 24.22.1; `npm install` shows no engine warning |
| P0.2 | VPS capacity and Node version | **Not done** | Needs the owner's go-ahead for read-only SSH |
| P0.3 | Scaffold runs | **Pass** | Admin loads; `tsc` clean; `next build` passes |
| P0.4 | Content model matches Sanity's | **Pass** | Articles, categories, topics, authors, media, newsletter subscribers, staff users |
| P0.5 | Writer drafts only; editor publishes; public sees published only | **Pass** | 9 tests; refusals must be 403/404; a deliberately broken rule makes the suite fail |
| P0.6 | Drafts, versions, scheduled publishing | **Pass** (autosave UI unverified) | 5 tests: editor's schedule fires after its time and not before; writer's scheduled publish is refused at run time; versions kept; draft edits do not change the live article |
| P0.7 | Images: sizes, focal point, limits | **Pass** | 6 tests: 400/768/1600 sizes, focal point stored, alt required, HTML and fake JPEG refused; 17.2 MB 24 MP photo in ~0.6 s, ~50 MB extra memory on the dev PC |
| P0.8 | Rich text converts without loss | **Pass** | Converter plus 7 tests; live dry run **13/13 articles identical, 0 warnings** |
| P0.9 | Writer walkthrough checklist | **Gemini, pending** | |
| P0.10 | Independent review of the trial | **Done, one finding fixed** | Gemini ran 8 adversarial cases: 7 refused as expected; **case c failed** (any writer could read other writers' draft versions). Fixed in `ee54411` together with the same leak on direct reads, which Claude found while fixing; regression tests failed before the fix and pass after |
| P0.11 | This report | Draft | |

Totals at commit `ee54411`: **30 tests pass, 1 opt-in skipped**. Earlier recheck at `49bf077` (27 tests): `tsc` clean, production build passes. Rechecked from a clean checkout (fresh `npm ci`): generated files had no drift, tests passed twice and under a US time zone, and the dry run passed.

## 3. Findings (things we would not have known without the trial)

1. **Next.js version.** Payload 3.92.0 needs Next `>=16.3.3`; the public site is on 16.3.1, and the docs page claimed 16.2.6 was enough. The separate CMS app avoids touching the public site.
2. **Production needs migrations.** A clean production start returned **500 errors** on `/api/articles` because production never creates tables by itself. Tests had hidden this (test mode builds tables automatically). Fixed with a committed initial migration and `migrate` scripts; verified: fresh database, migrate, start, API 200. Every schema change from now on needs a reviewed migration (S18).
3. **Scheduling permissions.** Payload lets anyone in the admin *queue* a scheduled publish, but the job runs with the scheduler's rights, so a writer's publish is refused (tested). Payload's *cancel* path deletes jobs with full privileges, so a writer could cancel an editor's schedule. Logged as threat-model T22; fix in Phase 1.
4. **Email.** Without a mail adapter, Payload prints emails to the server log. Password resets need a mail provider (owner decision, Phase 2).
5. **Time zone bug in the public site.** Found while reviewing Gemini's tests: `formatDate` uses the server's time zone, so a story published just after midnight UK time can show the previous date. Needs the owner to pick a zone (likely UK time).
6. **Memory.** A realistic large photo used about 50 MB extra on the dev PC, far below the 1 to 1.5 GB estimate in the review. The VPS will differ; measure it there.
7. **Live content is simple.** All 13 articles are plain paragraphs (37 blocks), so headings, lists, links and images are proven by test fixtures, not real articles.

## 4. Open before or during Phase 1

| Item | Owner | Why it matters |
|---|---|---|
| VPS audit (memory, disk, Node, Coolify) | Owner go-ahead, then Claude | Decides whether site, CMS and Postgres fit together |
| Gemini review and adversarial tests (P0.10) | Gemini | Independent check of the access rules |
| Writer walkthrough (P0.9) and autosave in the UI | Gemini, then a real writer | The quality gate is about a non-technical writer |
| Postgres | Claude, Phase 1 (1.3) | The trial used SQLite; migrations must be regenerated and re-tested on Postgres |
| Hero images and remaining fields in the migration | Claude, Phase 1 (1.13) | Only headline, slug and body were migrated in the dry run |
| T22 cancel-schedule fix, login throttling, second factor or access gate | Claude, Phase 1 | Threat-model items required before staff accounts go live |
| Mail provider, backup destination, date time zone | Owner | Decisions in `docs/backend-design.md` section 13 |

## 5. How to check this yourself

```
cd news-site/cms
npm ci
# create .env from .env.example with your own long random PAYLOAD_SECRET
npm test                                  # expect 30 passed, 1 skipped
npx tsc --noEmit                          # expect no output
npm run build                             # expect "Compiled successfully"
# live dry run (read-only, needs internet):
#   PowerShell: $env:MIGRATION_REPORT="1"; npx vitest run tests/migration-report.int.spec.ts
npm run dev                               # then open http://localhost:3200/admin
```
