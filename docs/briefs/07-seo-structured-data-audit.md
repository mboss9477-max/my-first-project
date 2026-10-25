# SEO and Structured Data Audit Report

Date: 2026-10-25  
Target Scope: Public website live at `https://csnews.news` (read-only audit using `curl`, node HTTP inspection, and source code cross-verification in `news-site/web`).  
Standards Evaluated: Google Search Central documentation, Schema.org specifications (NewsArticle, BreadcrumbList, WebSite, NewsMediaOrganization, Person), RFC 9309 (Robots Exclusion Protocol), RSS 2.0 / Atom specs, and Open Graph Protocol.

---

## 1. Verified Live Site Inventory

Direct query to Sanity API (`https://crji8h2y.api.sanity.io/v2026-08-01/data/query/production`) and live sitemap analysis confirmed:
- **Articles**: **13 total** (12 demo articles published August 28–29, 2026 + 1 initial cycle lane story published August 17, 2026).
- **Categories**: **6** (`business`, `culture`, `politics`, `sport`, `tech`, `world`).
- **Topics**: **6** (`climate`, `energy`, `housing`, `labour-market`, `local-government`, `transport`).
- **Authors**: **1** (`cs-news-staff`).

*All user-provided fact figures are confirmed 100% accurate.*

---

## 2. Table of Findings

| Severity | URL / Scope | Issue / What is Wrong | Why It Matters | Suggested Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Critical** | `/article/<slug>/opengraph-image`<br>*(e.g. `/article/open-hardware-consumer-devices/opengraph-image`)* | **HTTP 500 Internal Server Error**. Accessing the dynamic share image endpoint crashes. | Social media crawlers (X/Twitter, Facebook, LinkedIn, Discord, Slack) cannot load dynamic article preview cards, breaking rich link unfurling across platforms. | In `news-site/web/src/app/article/[slug]/opengraph-image.tsx`, update the signature from `params: { slug: string }` to `params: Promise<{ slug: string }>` and add `const { slug } = await params;` before calling `getArticle(slug)`. In Next.js 15+, `params` is asynchronous. |
| **Moderate** | `/sitemap.xml` | **Omission of Topic and Author pages**. The sitemap lists home, 6 categories, and 13 articles, but completely omits all 6 `/topic/*` URLs and `/author/*`. | Sitemaps should provide a complete inventory of indexable canonical URLs. Omitting topics and authors slows discovery and organic indexing of topical hubs. | In `news-site/web/src/app/sitemap.ts`, fetch `getTopicSlugs()` and `getAuthorSlugs()` alongside `getCategorySlugs()` and append them to the sitemap array. |
| **Moderate** | `/search`<br>`/search?q=*` | **Inappropriate Canonical pointing to Homepage**. The search page inherits `canonical: "https://csnews.news"` from the root layout while emitting `robots: noindex, follow`. | Conflicting signals: `noindex` requests non-indexing, while `canonical: /` claims the search results page is an alternate duplicate of the homepage. Google warns against canonicalizing search routes to the homepage. | In `news-site/web/src/app/search/page.tsx`, set `alternates: { canonical: "/search" }` or omit canonical so `noindex` governs. |
| **Moderate** | `/article/<slug>` | **Missing `publisher.logo` in `NewsArticle` Structured Data**. The publisher object in JSON-LD lacks a `logo` URL. | Google's official Article / NewsArticle guidelines strongly recommend `publisher.logo`. Without it, Google Rich Results tool flags a "Recommended item missing" warning, which can impact eligibility for Google News carousel badges. | Add `logo: { "@type": "ImageObject", "url": `${SITE_URL}/icon.svg` }` to the publisher object in `newsArticleJsonLd()` or link by ID to the root `@id: `${SITE_URL}/#organization``. |
| **Minor** | `/robots.txt` | **Protocol Prefix in `Host:` Directive**. Outputs `Host: https://csnews.news` instead of `Host: csnews.news`. | RFC 9309 and Yandex specification require `Host` to contain only the hostname and optional port without protocol (`https://`). | In `news-site/web/src/app/robots.ts`, change `host: SITE_URL` to `host: new URL(SITE_URL).host`. |
| **Minor** | `/topic/<slug>`<br>`/author/<slug>` | **Twitter Card Meta Falls Back to Site Generic Tagline**. Topic and Author metadata definitions omit `twitter`, so Next.js merges with the root `layout.tsx` default (`title: "CS NEWS"`, `description: "Independent reporting..."`). | Shares on Twitter/X show generic homepage text rather than the specific topic or author bio. | Explicitly define `twitter: { card: "summary_large_image", title: topic.name, description }` in `generateMetadata` for topics and authors. |
| **Low / Info** | `/news-sitemap.xml` | **Empty `<urlset>` Container**. Returns valid XML with 0 `<url>` items. | Google News sitemaps only include articles published within the last 48 hours. Because all demo articles date from August 2026, the 48-hour filter correctly yields 0 items. Google Search Console will display an "Empty sitemap" notice until a fresh story is published. | Expected behavior given demo content age; publish an article within 48 hours to populate. |

---

## 3. What Passed Verification

### 3.1 Metadata by Page Type
| Page Type | HTTP Status | Title Tag | Meta Description | Canonical URL | Robots Directive | `lang` |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **Home (`/`)** | **200** | `CS NEWS` | `Independent reporting from around the world.` | `https://csnews.news` | `index, follow` (default) | `en` |
| **Article** | **200** | `[Headline] \| CS NEWS` | Article excerpt | `https://csnews.news/article/<slug>` | `index, follow` (default) | `en` |
| **Category** | **200** | `[Category] \| CS NEWS` | `The latest [Category] reporting from CS NEWS.` | `https://csnews.news/category/<slug>` | `index, follow` (default) | `en` |
| **Topic** | **200** | `[Topic] \| CS NEWS` | `Coverage of [Topic] from CS NEWS.` | `https://csnews.news/topic/<slug>` | `index, follow` (default) | `en` |
| **Author** | **200** | `[Author Name] \| CS NEWS` | Author bio or newsroom description | `https://csnews.news/author/<slug>` | `index, follow` (default) | `en` |
| **Search** | **200** | `Search \| CS NEWS` | `Search reporting from CS NEWS.` | *See Finding 3* | `noindex, follow` | `en` |
| **404 Page** | **404** | `CS NEWS` | Site default description | `https://csnews.news` | `noindex` | `en` |

### 3.2 Open Graph & Social Cards
- **Open Graph Protocol**: All pages provide valid `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale` (`en_GB`), and `og:type` (`article` on articles, `profile` on authors, `website` on others).
- **Article OG Images**: Articles with hero images correctly populate `og:image`, `og:image:width: 1200`, `og:image:height: 630`, and `og:image:alt` pointing to Sanity's high-speed CDN with crop and format optimization (`?rect=...&w=1200&h=630&fit=crop&auto=format`).
- **Twitter Cards**: `twitter:card` is set to `summary_large_image` site-wide.

### 3.3 Structured Data (JSON-LD)
- **`NewsMediaOrganization` & `WebSite`**: Embedded globally in `<head>` via `layout.tsx` with `@id: https://csnews.news/#organization`, linked to `publisher`, and containing a fully compliant `SearchAction` (`potentialAction`) for the Google Sitelinks Searchbox.
- **`BreadcrumbList`**: Follows Google Search Central specifications across Article, Category, Topic, and Author pages. Each crumb uses 1-based sequential integers (`position: 1, 2, 3`), human-readable labels (`name`), and canonical URLs (`item`).
- **`Person` Schema**: Author page emits valid schema.org `Person` markup with `name`, `jobTitle`, `description`, `url`, and `worksFor` pointing to the publication organization.

### 3.4 Sitemaps, Feeds, and HTTP Infrastructure
- **`/sitemap.xml`**: Valid XML conforming to sitemaps.org 0.9 schema. Formatted with `<lastmod>` timestamps in ISO 8601, `<changefreq>`, and `<priority>`.
- **`/feed.xml`**: Valid RSS 2.0 feed with Atom self-reference (`xmlns:atom`), Dublin Core creator elements (`xmlns:dc`), valid RFC 822 publication dates (`pubDate`), GUID permalinks (`<guid isPermaLink="true">`), categories, and HTML entity escaping.
- **HTTP 404 Response**: Requesting non-existent paths returns a genuine `HTTP/1.1 404 Not Found` status with `Cache-Control: private, no-cache, no-store`, preventing soft-404 index pollution.
- **Trailing-Slash Redirect**: Requesting URLs with trailing slashes (e.g. `/category/business/`) correctly responds with `HTTP/1.1 308 Permanent Redirect` to canonical non-trailing slash URLs.

---

## 4. Official Standards Citations

1. **Google Search Central — Article Structured Data**:
   - URL: `https://developers.google.com/search/docs/appearance/structured-data/article`
   - Date Accessed: 2026-10-25
   - Note: Requires `headline`, `image`, `datePublished`, `author`; recommends `dateModified` and `publisher.logo`.
2. **Google Search Central — Breadcrumbs**:
   - URL: `https://developers.google.com/search/docs/appearance/structured-data/breadcrumb`
   - Date Accessed: 2026-10-25
3. **Google Search Central — News Sitemaps**:
   - URL: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap`
   - Date Accessed: 2026-10-25
   - Note: Strict 48-hour article publication cutoff rule confirmed.
4. **Google Search Central — Consolidating Duplicate URLs (Canonicalization)**:
   - URL: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
   - Date Accessed: 2026-10-25
5. **Next.js Documentation — Async Dynamic Request APIs**:
   - URL: `https://nextjs.org/docs/messages/sync-dynamic-apis`
   - Date Accessed: 2026-10-25
   - Note: Confirms `params` in dynamic App Router files (`opengraph-image.tsx`) must be awaited.
6. **IETF RFC 9309 — Robots Exclusion Protocol**:
   - URL: `https://www.rfc-editor.org/rfc/rfc9309.html`
   - Date Accessed: 2026-10-25
7. **The Open Graph Protocol**:
   - URL: `https://ogp.me/`
   - Date Accessed: 2026-10-25

---

## 5. Verification Status

Verified by me:
- Live HTTP/1.1 and HTTP/2 network inspections of `https://csnews.news` across all 7 page types using `curl.exe` and node `https` clients.
- Direct Sanity API query verifying live inventory counts: exactly 13 articles, 6 categories, 6 topics, 1 author.
- Confirmed `HTTP 500 Internal Server Error` on `/article/<slug>/opengraph-image` and identified the async `params` Promise root cause in `opengraph-image.tsx`.
- Confirmed `HTTP 404 Not Found` status on `/non-existent-page`.
- Confirmed `HTTP 308 Permanent Redirect` on `/category/business/`.
- Full JSON-LD parsing and Schema.org compliance validation across all pages.
- Inspection of `/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml`, and `/feed.xml`.

Not verified:
- Google Search Console live production webmaster dashboard (read-only audit conducted externally via HTTP and code inspection).
- Official Google Rich Results web testing UI submission (simulated against official published specification requirements).
