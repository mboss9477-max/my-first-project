# CS NEWS: project context

Start here. This page is the shortest accurate description of what CS NEWS is and how it is built and run. Then read `AGENTS.md` (the rules), `decisions.md` (why things are the way they are), `master-plan.md` (what comes next) and the newest file in `handoffs/`.

## What it is
An independent news website at https://csnews.news. English now; Mandarin, Spanish and Arabic (right-to-left) planned. Built for readers and for non-technical writers, among them the owner's father. Gold and ash design, restrained motion, accessibility treated as a requirement.

## The pieces

| Piece | Where | State |
|-------|-------|-------|
| Website | `news-site/web`: Next.js 16 (App Router), React 19, Tailwind 4, TypeScript; static pages refreshed every 60 s | Live |
| Old CMS | `news-site/studio`: Sanity Studio (project `crji8h2y`, dataset `production`, public read); hosted Studio at https://cs-news.sanity.studio | Live; to be replaced, bug fixes only |
| New CMS | `news-site/cms`: Payload CMS 3.92.0 on Next.js 16.3.3, Postgres (SQLite for quick local runs) | Built and tested; not deployed yet (staging is next) |
| Hosting | One Hetzner server running Coolify; deploys the website from `main` (base directory `/news-site/web`) | Live |
| DNS and edge | Cloudflare | Live |
| CI | `.github/workflows/ci.yml`: web job; CMS job on SQLite; CMS job on Postgres 17 | Required checks on `main` |

How content reaches readers today: writers use the Sanity Studio; the website reads Sanity's public API; pages refresh at least every minute, sooner when Sanity's webhook fires. Target: writers use the new CMS; the website reads it through `news-site/web/src/data` (the "data seam"); the CMS pings `/api/revalidate-cms` on publish.

## Rules that surprise people
- **Merging to `main` deploys the website** within minutes.
- `main` needs a PR and three green checks, for admins too.
- The repository is **public**: no secrets, tokens, server addresses or account details, ever. Environment variables are documented by *name* only (`.env.example`).
- Keep static generation: do not read `searchParams`, `cookies()` or `draftMode()` in a prerendered page without saying so.
- Next.js 16 differs from older versions: error boundaries get `retry`, `proxy.ts` replaces `middleware.ts`, `params` and `headers()` are async. Read `news-site/web/node_modules/next/dist/docs/` before using a Next API.
- Payload skips field `validate` on draft saves: rules that must hold for drafts belong in hooks.
- Database changes ship only as committed migrations (`news-site/cms/src/migrations`), never a direct schema sync against production.
- Never rewrite source files through PowerShell redirects (it corrupted UTF-8 once); use an editor or patch tool.

## Commands

```
# website (news-site/web)
npm ci && npx next typegen && npx tsc --noEmit && npm test && npm run build
npm run dev                # port 3000

# CMS (news-site/cms): copy .env.example to .env and fill in your own values first
npm ci && npx tsc --noEmit && npm test && npm run build
npm run dev                # port 3200
# same tests on Postgres: set TEST_DATABASE_URL to a Postgres address (see .env.example)
# apply migrations (Postgres): DATABASE_URL=postgres://... npm run migrate
```

## People and tools
- **Owner:** decides, approves spending and production changes, reviews UI visually.
- **Claude Code:** data, platform, integration, CI, docs; reviews Gemini's PRs; merges under the rule in `master-plan.md`.
- **Gemini** (through the Antigravity app): interface, tests, quality; takes tasks from GitHub issues labelled `gemini-task`.
- **Notion:** holds the whole plan, first day to launch day, for the owner to read.
