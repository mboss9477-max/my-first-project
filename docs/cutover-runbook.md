# Cutover runbook: from Sanity to the new CMS

**Status:** a draft, to be rehearsed on staging (`docs/staging-plan.md`) before it is trusted. Nothing here has been run against production. Plan tasks 1.15 (rollback plan) and 1.18 (cutover).

**What "cutover" means:** the live website at https://csnews.news stops reading Sanity and starts reading the new CMS. Writers move to the new CMS. Sanity stays untouched and read-only for 30 days, then the owner decides whether to shut it down (Sanity is never shut down automatically).

**The switch is one setting.** The website reads its content through `news-site/web/src/data`. The environment variable `CONTENT_SOURCE` picks the source: unset or `sanity` means Sanity; `cms` means the new CMS (with `CMS_URL` giving its address). Switching, and switching back, are both "change that setting in Coolify and redeploy". No code change is needed on the day.

**Every server, DNS, settings and credentials step in this runbook needs the owner's explicit go-ahead in chat (S5).** Claude says what the step is and how to undo it before doing it.

## Words used here
- **Production CMS:** the CMS the live site will read. Per decision D5 in the staging plan it is a new, empty database and a second CMS app, so the staging test data never reaches readers.
- **Content freeze:** a short period in which nobody edits in Sanity, so the final copy is complete.
- **Rollback:** set `CONTENT_SOURCE` back and redeploy; the site reads Sanity again.

## 1. Preconditions: do not start until every box is ticked

- [ ] Quality gate G1 passed (`docs/backend-plan.md`): a writer worked unaided, a publish shows within 60 s, a clean migration report, a restore proven on a clean machine, CI green, Phase 1 threat items done, memory measured under load.
- [ ] The cutover and the rollback were **rehearsed on staging**, and the timings are written in a handoff (how long the website build takes; how long a rollback takes).
- [ ] **Known gaps are closed or accepted by the owner** (section 2).
- [ ] A verified, fresh backup of the production CMS database and its media exists, and a Hetzner snapshot of the server was taken the same day (owner confirms).
- [ ] The owner has chosen the day and time (a quiet hour), and writers have been told about the freeze.
- [ ] The owner is reachable for the whole window, and Claude has the owner's go for each server step.
- [ ] `main` is green and nothing else is queued to merge during the window (a merge deploys the website).
- [ ] The Sanity project is unchanged since the last migration rehearsal, or the rehearsal is repeated (section 3, step 3 checks this).

## 2. Known gaps to close or accept before cutover

These are things the new CMS or the website still do differently from Sanity. Each needs a decision, written in `docs/decisions.md`.

| # | Gap | What happens at cutover if left | Options |
|---|-----|--------------------------------|---------|
| G-1 | **Newsletter signup** (`app/actions/subscribe.ts`) still writes to Sanity | New signups keep going into Sanity, which is meant to be read-only; the CMS list stays empty | Port the signup to the CMS before cutover (recommended), or accept it for the 30 days and import the subscribers afterwards. Check first how many subscribers exist in Sanity (the public API showed none on 2026-10-25). |
| G-2 | **Draft preview** (`/api/draft-mode`) is Sanity-only | Writers cannot preview an unpublished story on the live site | Accept (the admin shows the draft), or build preview for the CMS later. |
| G-3 | **Author portraits**: Sanity authors can have a portrait, the CMS authors collection has no portrait field | The migration report marks any author with a portrait as a problem; none has one today | Add the field (a database migration, S18) if any author gets a portrait before cutover. |
| G-4 | **Search** covers headline and excerpt only in CMS mode | Searching for a word that only appears in an article's body finds nothing | Accept until full-text search (plan task 2.5). |
| G-5 | Inline body images, lists, quotes and links are covered by tests but no live article uses them | A real article may reveal a rendering problem | Before cutover, publish one test article with each feature on staging and look at it. |
| G-6 | Image hosts and the content security policy must name the production CMS host | Images fail to load in browsers | `CMS_PUBLIC_URL` (or `CMS_URL`) is read by `next.config.ts` at build time; confirm in the rehearsal that no CSP errors appear. |
| G-7 | Sanity's `/api/revalidate` route and `SANITY_*` settings remain on the website | Harmless; they simply stop mattering | Remove later, in a separate cleanup PR, after the 30 days. |

## 3. The cutover, step by step

Times are the owner's local time. Fill in the **Log** (section 8) as you go.

| Step | Action | Who | Check |
|------|--------|-----|-------|
| 1 | Final health check: live site answers (home, one article, feed); production CMS answers; CI on `main` green | Claude | Write the commit hash that is currently live. |
| 2 | **Announce the content freeze** to writers: no edits or publishes in Sanity until told | Owner | Writers confirmed. |
| 3 | **Prove nothing changes in Sanity:** record the most recent edit time (`*[_type == "article"] \| order(_updatedAt desc)[0]._updatedAt`, via Sanity's public query API) now and again after step 5 | Claude | The two times are equal. If not, repeat the migration (step 5). |
| 4 | Back up the production CMS database and media (or confirm the last backup is minutes old) | Claude, owner OK | Backup file exists and its size is plausible. |
| 5 | **Final migration:** dry run, read the report, then apply to the **production** database (type the target name the dry run printed) | Claude, owner OK for the apply | Report: "No problems"; 13 articles (or the current count), the same categories, topics, authors, images. Second run skips everything. |
| 6 | **Compare pages** (section 4) between the live Sanity-backed site and a build in CMS mode against the production CMS | Claude | Zero unexplained differences. |
| 7 | **Set the switch** in Coolify for the live website: `CONTENT_SOURCE=cms`, `CMS_URL=<production CMS address>`, `CMS_PUBLIC_URL` if different, `REVALIDATE_SECRET` set; mark them available at **build time** (the pages are built statically, so the build must see them) | Claude with the owner, owner OK | Variables listed by name in the log; no values written down. |
| 8 | **Point the CMS's publish notification at the live site:** on the production CMS set `WEB_REVALIDATE_URL` (the live site's `/api/revalidate-cms`) and `WEB_REVALIDATE_SECRET` (same value as the site's `REVALIDATE_SECRET`) | Claude, owner OK | Both set; restart the CMS if Coolify needs it. |
| 9 | **Deploy the website** (manual, owner triggers or says go) | Owner/Claude | Build succeeds. If a build fails, Coolify normally keeps the old version serving; confirm that in the rehearsal rather than assume it. |
| 10 | **Verify** the live site (section 5) | Claude, then the owner | Every check passes. Note the time. |
| 11 | **Publish test:** the owner (or an editor) makes a small real edit in the new CMS, for example fixing a typo in an existing story; check the live page shows it within 60 seconds | Owner | Time recorded. |
| 12 | **Lift the freeze:** tell writers to use the new CMS from now on, and not to edit in Sanity | Owner | Announced. |
| 13 | Write the handoff: the commit that went out, timings, anything surprising | Claude | File committed. |

## 4. Comparing pages

Goal: the CMS-backed site shows what the live site shows. The method already used locally (1 build against Sanity, 1 against the CMS, same code):
1. Build the website twice from the same commit: once without `CONTENT_SOURCE`, once with `CONTENT_SOURCE=cms` and the production CMS address (use a clean `.next` each time; Next's fetch cache can serve stale data).
2. For every prerendered page, strip scripts and tags and compare the visible text; compare the set of image addresses (the hosts differ, the pictures should match by name or content).
3. Two known, harmless differences from the local rehearsal: category pages place their content in a different part of the streamed HTML, and the CMS's "Updated" date is the editors' revision date (`revisedAt`), which the migration copies from Sanity's `updatedAt`.

On staging the same comparison can be done over HTTP between the live site and the staging website.

## 5. Verification list (after the deploy)

Run all of these against https://csnews.news, in a normal browser and a private window.
- [ ] Home page loads; lead story and cards show images.
- [ ] One article from each section loads; its hero image shows; the byline, date and reading time are right; a story with a correction shows it.
- [ ] A category page, a topic page, the author page.
- [ ] Search for a word in a headline.
- [ ] `/feed.xml`, `/sitemap.xml`, `/news-sitemap.xml` and `/robots.txt` load and list the stories.
- [ ] Every image on the home page loads (no broken pictures); no errors in the browser console (open developer tools); no content-security-policy messages.
- [ ] The share image (`/article/<slug>/opengraph-image`) loads for one article.
- [ ] Response times look normal (a page should load in well under a second; static pages).
- [ ] Server memory and swap are normal (`free -h`).
- [ ] The CMS admin is behind the access gate; a private window cannot reach it without logging in.
- [ ] Publish test (step 11) done.

## 6. Rollback

**When to roll back:** any verification failure that is not understood within about 15 minutes, a site error that readers can see, or the owner asks.

**How (about the time of one website build, measured in the rehearsal):**
1. In Coolify, set `CONTENT_SOURCE` back to `sanity` (or delete it) for the live website.
2. Redeploy the website.
3. Run the verification list again; the site reads Sanity.
4. Leave the new CMS running and untouched so the problem can be examined.
5. Tell writers to use Sanity again.

**What a rollback loses:** anything written in the new CMS after cutover is **not** in Sanity. If edits were made, they must be re-entered in Sanity by hand (the CMS keeps them, nothing is deleted). This is why the verification is done immediately and the freeze is lifted only after step 10 passes.

**Not a rollback:** rolling back the website code (`git revert`) is not needed for this; the switch makes the code safe to leave in place.

## 7. After cutover

- Keep Sanity running and read-only for 30 days (the owner's rule). Writers do not edit there.
- First week: watch the site daily (errors, speed, images), and the CMS's memory.
- At 30 days the owner decides whether to shut Sanity down (S5). Until then nothing in Sanity is deleted.
- Cleanup PRs afterwards: remove the Sanity read path and settings (`G-7`), update `docs/PROJECT_CONTEXT.md` and `README.md`, close the plan task.

## 8. Log (fill in during the cutover)

| Step | Time | Result | Notes |
|------|------|--------|-------|
| Commit live before | | | |
| Freeze announced | | | |
| Sanity latest edit before / after | | | |
| Backup taken | | | |
| Migration dry run / apply | | | |
| Page comparison | | | |
| Switch set (names only) | | | |
| Deploy start / end | | | |
| Verification | | | |
| Publish test (seconds) | | | |
| Freeze lifted | | | |
| Rollback needed? | | | |
