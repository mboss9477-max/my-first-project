# Handoff: Claude, 2026-10-23, backend Phase 0 to early Phase 1

## Goal
Replace Sanity with a self-hosted Payload CMS (owner decision G0: GO; dates in UK time). Plan: `docs/backend-plan.md` (PR #7). Design: `docs/backend-design.md` (PR #4). Threat model: `docs/threat-model.md` (PR #6).

## State
**Merged to main:** #3 AGENTS.md, #5 .gitattributes, #8 vitest, #9 CMS trial (`news-site/cms`, Payload 3.92.0, SQLite for local), #10 UK dates.

**Open, mine:**
- #13 `claude/cms-editorial-workflow`: slug from headline, reviewStatus, friendly upload limits (25 MB, HEIC message), second migration. Waiting for Gemini's review (it has a review worktree for this open).
- #15 `claude/data-seam`: data seam stage 1; all reads through `news-site/web/src/data`. Needs Gemini review (touches its components).
- #4, #6, #7: docs drafts (design, threat model, plan), kept current; can be marked ready and merged.

**Open, Gemini's:** #11 walkthrough, #12 editor UX (both revised after my review; re-check), #14 adversarial tests (I asked for a fix: case n must require exactly 400; j does not cover T22).

**Repo settings:** branch protection on `main`: PR required, checks `Typecheck and build (web)` and `Typecheck, test and build (cms)` required, applies to admins, no force-push. **Merging to main auto-deploys** via Coolify.

**Server (done with the owner):** Coolify panel at `https://coolify.csnews.news`; Hetzner Cloud Firewall allows only TCP 22/80/443 (verified from outside). VPS: 4 vCPU, 7.75 GB RAM (~6.3 GB free), 50 GB free disk, **no swap**, site builds on Node 22.19.0.

## How it was verified
- CMS: 39 tests on #13 (46 with Gemini's suite on #14), tsc, build, migrate on a fresh DB, then `next start` smoke test (articles 200, users/subscribers 403, playground 404). The CI job repeats this.
- Live dry run: 13/13 Sanity articles convert to Lexical with identical text (`MIGRATION_REPORT=1`).
- Data seam: all 36 prerendered pages identical before/after; route table unchanged.

## Decisions and why
- Payload runs as its **own app/container** (needs Next >=16.3.3; the site is on 16.3.1; isolation also protects the public site).
- Upload limit 25 MB (15 MB rejected an ordinary 17 MB camera JPEG).
- Payload **skips field `validate` on draft saves**: rules that must hold for drafts go in hooks.
- Writers see only published articles plus their own drafts (Gemini found the version leak; Claude found the same leak on direct reads).

## Known issues and risks
- T22: Payload's schedule-cancel path deletes jobs with full privileges (open, Phase 1).
- T25: no swap on the VPS (owner action, S5).
- Pre-existing eslint errors in `TextSizeControl.tsx` and `ThemeToggle.tsx`; CI does not lint.
- Images and article bodies still use Sanity shapes (data seam stage 2).

## Side effects outside git
- Local untracked `news-site/cms/.env` (random secret) and SQLite test files in `news-site/cms/` (gitignored).
- No production data touched. No staging environment exists yet.

## Next steps, in order
1. Merge #13 and #15 after Gemini's reviews; Gemini fixes #14.
2. Postgres decision: the plan says Postgres, but there is no local Postgres or Docker on the dev machine. Options: Postgres test job in CI using a service container; or reconsider SQLite in production (simpler backups, fine for a small newsroom). Owner decision.
3. Staging on the VPS (needs owner go-ahead, S5): CMS container with pinned Node 24, its own database, persistent media volume, memory limit; add swap.
4. Data seam stage 2 (images, bodies), then the CMS implementation behind it (1.9) and the publish webhook (1.10).
5. Threat-model Phase 1 items: login throttling, second factor or access gate for the admin, T22 fix.

## Unsure about
- Whether Payload's built-in focal-point picker and autosave indicator meet the walkthrough without custom UI; check in the admin with the owner.
