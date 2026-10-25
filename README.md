# CS NEWS

An independent news site: a Next.js website and a **Payload CMS** (on Postgres)
where the newsroom writes. English now; Spanish, Chinese and Arabic
(right-to-left) are planned, and the CMS is already built for them (English is
the only language filled in).

```
news-site/
├── web/      # the website: Next.js 16 (App Router), React 19, Tailwind 4
├── cms/      # the CMS: Payload 3 on Next.js, Postgres (SQLite for quick local runs)
└── studio/   # the old content tool; the live website still reads it until the
              # switch to the CMS, then this folder is deleted (docs/cutover-runbook.md)
```

**Where things stand:** the CMS is built, tested and migrated; it is not yet
deployed, so the live site at https://csnews.news still reads the old content
tool. The website has a switch (`CONTENT_SOURCE`) that moves it to the CMS in
one setting, and back. Plan, decisions and history: [docs/README.md](docs/README.md).
Rules for the AI agents that work on this repo: [AGENTS.md](AGENTS.md).

## Running it locally

Two terminals. Node 22.23.4+ (or 24.22.1+) for the CMS.

**The CMS** (port 3200). Copy `news-site/cms/.env.example` to `.env`, fill in
your own `PAYLOAD_SECRET` (any long random text), then:

```bash
cd news-site/cms && npm install && npm run dev
```

Open http://localhost:3200/admin and create the first admin account. With no
`DATABASE_URL` it uses a local SQLite file, so there is nothing to install.

**The website** (port 3000), reading from that CMS:

```bash
cd news-site/web && npm install
CONTENT_SOURCE=cms CMS_URL=http://localhost:3200 npm run dev
```

(PowerShell: set `$env:CONTENT_SOURCE="cms"` and `$env:CMS_URL="http://localhost:3200"` first.)
An empty CMS shows demo placeholder stories on the front page; write and
publish an article in the admin to replace them.

## Content model

| Collection | What it holds |
|---|---|
| Articles | headline, slug, excerpt, author, body (rich text), hero image, topics, corrections, review status, draft and scheduled publishing |
| Categories, Topics | the section an article belongs to (one); cross-cutting subjects (several) |
| Authors | byline, role, biography |
| Media | uploaded images with required alternative text, generated sizes, focal point |
| Newsletter subscribers | admin-only; the website adds to it through one secret-protected endpoint |
| Writer notes | messages from staff about a story; editors read and resolve them |
| Users | staff accounts with three roles: **writer** (own drafts, cannot publish), **editor** (publishes), **admin** |

Text fields are stored per language; a language is public only when it is
published. Details: [docs/localization-spike.md](docs/localization-spike.md).

## Website routes

| Path | Notes |
|---|---|
| `/` | Front page; featured stories lead, then newest |
| `/article/[slug]` | Prerendered, with NewsArticle structured data and a share image |
| `/category/[slug]` | Prerendered; `/page/[n]` for deeper pages |
| `/author/[slug]`, `/topic/[slug]` | Prerendered |
| `/search` | GET form, works without JavaScript |
| `/feed.xml` | RSS |
| `/sitemap.xml`, `/news-sitemap.xml` | Standard and Google News sitemaps |
| `/api/revalidate-cms` | The CMS tells the website a story was published or changed |

## Environment

Names only; values live in each environment, never in the repo. Each folder has
a `.env.example`.

| Variable | Where | Purpose |
|---|---|---|
| `CONTENT_SOURCE` | website | `cms` reads the CMS; unset reads the old content tool |
| `CMS_URL`, `CMS_PUBLIC_URL` | website | where the website (and readers' browsers, for images) reach the CMS |
| `REVALIDATE_SECRET` | website | must equal the CMS's `WEB_REVALIDATE_SECRET` |
| `CMS_SUBSCRIBE_SECRET` | website | must equal the CMS's `SUBSCRIBE_SECRET` |
| `NEXT_PUBLIC_SITE_URL` | website | overrides the production address (default `https://csnews.news`) |
| `PAYLOAD_SECRET` | CMS | signs sessions |
| `DATABASE_URL` | CMS | a `postgres://` address; anything else means local SQLite |
| `CMS_URL` | CMS | the address the CMS is served from (login origin check) |
| `SUBSCRIBE_SECRET` | CMS | lets the website add newsletter subscribers |
| `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` | CMS | where to announce a publish, and the shared secret |

## Checks

```bash
# website
cd news-site/web && npm ci && npx next typegen && npx tsc --noEmit && npm test && npm run build
# CMS (tests run on SQLite; set TEST_DATABASE_URL to a Postgres address to run them there)
cd news-site/cms && npm ci && npx tsc --noEmit && npm test
```

GitHub Actions runs three required checks on every pull request: website, CMS on
SQLite, and CMS on Postgres 17. Merging to `main` deploys the website
automatically, so a merge is a release.

## Moving content in

`news-site/cms/scripts/migrate-from-sanity.ts` copies the existing content into
the CMS. It does nothing unless told to, refuses to write until you type the
target database back, and skips what already exists. See its header for the
exact commands.

## Deploying

Not deployed yet. The steps (staging first, each one needing the owner's go) are
in [docs/staging-plan.md](docs/staging-plan.md) and the day of the switch is in
[docs/cutover-runbook.md](docs/cutover-runbook.md). Known problems and who has
them: [docs/problems.md](docs/problems.md).
