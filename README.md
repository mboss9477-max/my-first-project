# CS NEWS

An editorial news site built on Sanity and Next.js. English only for now;
Mandarin, Spanish and Arabic (RTL) are planned.

```
news-site/
├── studio/   # Sanity Studio (standalone, not embedded in the app)
└── web/      # Next.js 16 App Router front end
```

## Running it locally

Two terminals. Studio first:

```bash
cd news-site/studio && npm install && npm run dev
```

Then the site:

```bash
cd news-site/web && npm install && npm run dev
```

| | URL |
|---|---|
| Studio | http://localhost:3333 |
| Site | http://localhost:3000 |

The Studio asks you to sign in with your Sanity account on first load. That is
separate from the CLI login (`npx sanity login`), which the seed imports need.

## Seeding

Categories, topics and an author are checked in as NDJSON. From `news-site/studio`:

```bash
npx sanity dataset import seed/categories.ndjson --dataset production --replace
npx sanity dataset import seed/topics.ndjson --dataset production --replace
npx sanity dataset import seed/authors.ndjson --dataset production --replace
```

Document ids must not contain dots — see `news-site/studio/seed/README.md` for
why, it is a real trap.

## Content model

| Type | Purpose |
|---|---|
| `article` | headline, slug, excerpt, author, body, hero image, corrections |
| `category` | the section an article belongs to — exactly one |
| `topic` | cross-cutting subjects; an article can carry several |
| `author` | byline, role, biography, portrait |

An article's `byline` field is an override, used only when no `author` document
is set — for guest contributors.

## Routes

| Path | Notes |
|---|---|
| `/` | Front page; featured stories lead, then newest |
| `/article/[slug]` | Prerendered, with NewsArticle structured data |
| `/category/[slug]` | Prerendered; `/page/[n]` for deeper pages |
| `/author/[slug]` | Prerendered |
| `/topic/[slug]` | Prerendered |
| `/search` | GET form, works without JavaScript |
| `/feed.xml` | RSS |
| `/sitemap.xml`, `/news-sitemap.xml` | Standard and Google News sitemaps |
| `/api/revalidate` | Sanity webhook target |
| `/api/draft-mode` | Preview mode toggle |

## Environment

Everything works locally with no environment file. For deployment:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Overrides the production origin. Defaults to `https://csnews.news` |
| `SANITY_REVALIDATE_SECRET` | Must match the Sanity webhook secret |
| `SANITY_VIEWER_TOKEN` | Server-only Viewer token, for draft preview |
| `SANITY_PREVIEW_SECRET` | Guards `/api/draft-mode` |

The Sanity project id and dataset are plain constants — one per package, in
`web/src/sanity/env.ts` and `studio/env.ts`.

## Before deploying

See [ISSUES.md](ISSUES.md). The short version: add the production domain as a
CORS origin in Sanity, deploy the Studio, set the environment variables above,
and add a CI check — nothing currently verifies the build on a pull request.
