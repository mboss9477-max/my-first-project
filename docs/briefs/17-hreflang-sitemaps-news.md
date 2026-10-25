# Brief 17: Google Search Central Hreflang, Sitemaps & News Sitemaps Guide

**Date:** 2026-10-25  
**Auditor / Researcher:** Gemini CLI  
**Source:** Google Search Central Official Documentation (`developers.google.com/search/docs`)  
**Scope:** Specification and implementation checklist for tasks 6.4 (hreflang) and 6.5 (per-language and news sitemaps)  
**Status:** Architecture Guide for CS NEWS (Plan Tasks 6.4 & 6.5)

---

## 1. Google Search Central Hreflang Rules

### Core Principles
1. **Reciprocal (Return) Links are Mandatory:**
   - If Page A points to Page B as its Spanish alternate, Page B **must** have an identical reciprocal link pointing back to Page A as its English alternate.
   - Google Search Central strictly states: *"If two pages don't both point to each other, the tags are ignored."*
2. **Self-Referential Links are Required:**
   - Every page must include an `hreflang` tag pointing directly to itself alongside its sister translations.
3. **The `x-default` Fallback:**
   - Reserved for visitors whose language/region does not match any explicitly declared translation, or for a neutral landing page (e.g. an international language selector).
   - Example: `<link rel="alternate" hreflang="x-default" href="https://csnews.news/" />`.
4. **Language & Region Code Formatting:**
   - Must use lowercase **ISO 639-1** for the language (e.g., `en`, `es`, `ar`, `tr`).
   - Region is optional and must use uppercase **ISO 3166-1 alpha-2** preceded by a hyphen (e.g., `en-GB`, `en-US`, `es-ES`).
   - **Invalid:** Region alone is strictly rejected (e.g., `hreflang="uk"` or `hreflang="latam"` are invalid).

### The Three Declaration Methods
| Method | How It Works | Pros | Cons | Recommendation for CS NEWS |
|---|---|---|---|---|
| **1. HTML `<head>` tags** | `<link rel="alternate" hreflang="..." href="..." />` | Generated automatically by Next.js `generateMetadata` (`alternates.languages`). Simple to inspect in DOM. | Bloats HTML payload when supporting 10+ languages across dozens of regional variations. | **Best for 2–4 languages (Phases 1 & 2).** |
| **2. HTTP Response Headers** | `Link: <url>; rel="alternate"; hreflang="..."` | Excellent for non-HTML assets (PDFs). | Harder to debug, complex edge server caching logic. | Not recommended for standard HTML news. |
| **3. XML Sitemaps** | `<xhtml:link rel="alternate" hreflang="..." href="..." />` inside `<url>` nodes in sitemap.xml. | Zero HTML page weight overhead. Decoupled from page rendering. | Large sitemap file generation; requires strict synchronization with database. | **Best for scaling beyond 5 languages.** |

*Recommendation:* For CS NEWS at initial multilingual launch (English + Spanish + Arabic), implementing `alternates.languages` inside Next.js `generateMetadata()` in `page.tsx` is the cleanest, most idiomatic, and lowest-maintenance approach.

---

## 2. Per-Language Sitemaps vs. Unified Sitemap

### Google Sitemaps Size Limits
- Maximum **50,000 URLs** per individual sitemap file.
- Maximum **50 MB** uncompressed file size per sitemap.

### Architecture Recommendation
- **Single Root Sitemap Index (`/sitemap.xml`):**
  A sitemap index referencing language-specific sitemaps:
  ```xml
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://csnews.news/sitemap-en.xml</loc></sitemap>
    <sitemap><loc>https://csnews.news/sitemap-es.xml</loc></sitemap>
    <sitemap><loc>https://csnews.news/sitemap-ar.xml</loc></sitemap>
  </sitemapindex>
  ```
- **Why Separate Per-Language Sitemaps:**
  In a newsroom where language desks publish at different cadences, separating sitemaps allows independent cache revalidation (`revalidate = 3600`) per language, prevents cross-edition serialization bottlenecks, and avoids hitting the 50,000 URL threshold.

---

## 3. Google News Sitemap Rules for Multilingual Publications

1. **Strict 48-Hour Recency Window:**
   - A Google News sitemap (`/news-sitemap.xml`) must only contain articles published within the previous **48 hours (2 days)**.
   - Once an article is older than 48 hours, it must be omitted from the news sitemap (it remains indexed via the regular `/sitemap.xml`).
2. **Language Specification:**
   - Every entry must specify `<news:language>` matching the article's text:
     ```xml
     <news:news>
       <news:publication>
         <news:name>CS NEWS</news:name>
         <news:language>es</news:language>
       </news:publication>
       <news:publication_date>2026-10-25T09:00:00Z</news:publication_date>
       <news:title>...</news:title>
     </news:news>
     ```
   - Must use ISO 639 language code (e.g. `en`, `es`, `ar`).
3. **Google News Sitemap Size Limit:**
   - Capped at **1,000 URLs** per news sitemap file (unlike regular sitemaps which allow 50,000).

---

## 4. Canonical URLs, `<html lang>`, `dir`, and `og:locale`

### A. The Canonical URL Rule (Critical)
- **Rule:** Each translated page **must specify itself as its own canonical URL**.
- **Common Catastrophic Error:** Pointing the canonical tag of `/es/article/title` to `/en/article/title`. If done, Google will treat the Spanish version as an exact duplicate, canonicalize the URL to English, and completely drop the Spanish version from international search results.
- **Correct Configuration:**
  - `https://csnews.news/en/article/foo` -> `canonical: https://csnews.news/en/article/foo`
  - `https://csnews.news/es/article/foo` -> `canonical: https://csnews.news/es/article/foo`

### B. HTML Language and Reading Direction
- Set dynamically on the document root:
  - English: `<html lang="en" dir="ltr">`
  - Spanish: `<html lang="es" dir="ltr">`
  - Arabic: `<html lang="ar" dir="rtl">`

### C. Open Graph (`og:locale`)
- English: `<meta property="og:locale" content="en_GB" />`
- Spanish: `<meta property="og:locale" content="es_ES" />`
- Arabic: `<meta property="og:locale" content="ar_AR" />`

---

## 5. What to Do for English-Only Stories

When an article has not been translated into Spanish or Arabic:
1. **Self-Reference Only:** Emit only `hreflang="en"` pointing to itself (and optionally `x-default`), or omit the `hreflang` block entirely.
2. **Never Emit Dead or Hallucinated Links:** Do not emit `<link rel="alternate" hreflang="es" href="/es/article/foo" />` if that URL returns a 404 or falls back to an untranslated English page.
3. **Self-Canonical:** The canonical tag points to its own English URL.

---

## 6. Implementation Checklist for Tasks 6.4 & 6.5

- [ ] **Task 6.4: Metadata & Hreflang in `page.tsx`:**
  - Configure `generateMetadata()`:
    ```typescript
    alternates: {
      canonical: `${SITE_URL}/${locale}/article/${slug}`,
      languages: {
        en: `${SITE_URL}/en/article/${slug}`,
        es: hasSpanish ? `${SITE_URL}/es/article/${spanishSlug}` : undefined,
        ar: hasArabic ? `${SITE_URL}/ar/article/${arabicSlug}` : undefined,
        "x-default": `${SITE_URL}/en/article/${slug}`,
      },
    }
    ```
  - Verify reciprocal links: Fetch both English and Spanish URLs and assert that each references the other identically.
- [ ] **Task 6.5: XML Sitemaps:**
  - Create `/sitemap.xml` as a Sitemap Index (`sitemapindex`).
  - Create route handlers `/sitemap-[locale].xml` querying CMS articles published in that locale.
  - Create `/news-sitemap.xml` filtering articles where `publishedAt >= now() - 48 hours` and emitting correct `<news:language>`.
- [ ] **Common Mistakes to Prevent:**
  - Missing reciprocal return tags.
  - Using invalid country codes as languages (e.g. `uk` instead of `en-GB`).
  - Pointing canonical tags across languages.
  - Putting articles older than 48 hours into the Google News sitemap.
  - Trailing slash discrepancies between hreflang `href` and canonical URLs.

---

## 7. Official Documentation Citations

- **Google Search Central: Managing multi-regional and multilingual sites:**  
  URL: `https://developers.google.com/search/docs/specialty/international/managing-multi-regional-and-multilingual-sites` (Read 2026-10-25)
- **Google Search Central: Tell Google about localized versions of your page (hreflang):**  
  URL: `https://developers.google.com/search/docs/specialty/international/localized-versions` (Read 2026-10-25)
- **Google Search Central: News sitemaps:**  
  URL: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap` (Read 2026-10-25)
- **Google Search Central: Sitemaps overview and limits (50,000 URLs / 50 MB):**  
  URL: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview` (Read 2026-10-25)

---

Verified by me:
- Verified all official rules from Google Search Central documentation on `hreflang`, reciprocal links, canonical handling, and sitemap limits.
- Validated Google News sitemap 48-hour recency requirement and `<news:language>` tag syntax.
- Formulated specific implementation patterns tailored to Next.js App Router and Payload CMS.

Not verified:
- Production Google Search Console live test (requires live deployment with multi-language routes).
