# Brief 16: Multilingual Newsroom Architectures (Anadolu Agency & Peers)

**Date:** 2026-10-25  
**Auditor / Researcher:** Gemini CLI  
**Scope:** Architecture, URL patterns, language switchers, hreflang, RTL, and translation workflows across global newsrooms  
**Peers Examined:** Anadolu Agency (`aa.com.tr`), BBC World Service (`bbc.com`), Deutsche Welle (`dw.com`), Al Jazeera (`aljazeera.com` / `aljazeera.net`), Reuters (`reuters.com`)  
**Status:** Research & Architecture Recommendations for CS NEWS (Plan Task M6)

---

## 1. What "Anadolu-Style" Means: Our Reading

Anadolu Agency (AA, *Anadolu Ajansı*, Ankara) is the state news agency of Türkiye, broadcasting in **13 language editions** (Turkish, English, Arabic, Russian, French, Spanish, Bosnian/Croatian/Serbian, Kurmanji Kurdish, Sorani Kurdish, Persian, Albanian, Macedonian, and Indonesian).

In newsroom software architecture, an "Anadolu-style" multilingual setup signifies:
1. **Edition-Driven, Not Translation-Mirrored:** Each language is treated as an autonomous *editorial edition* with its own homepage curation, headlines, and regional priorities, rather than a robotic 1:1 mirror of the home-country edition.
2. **Dedicated Language Desks:** Stories are produced, translated, adapted, or localized by specialized language desks (e.g. English News Desk, Arabic News Desk) where bilingual journalists adapt context rather than performing literal machine substitution.
3. **Subfolder URL Architecture:** All editions live on the single apex domain under two-letter ISO language path prefixes (`aa.com.tr/en/`, `aa.com.tr/ar/`, `aa.com.tr/fr/`), retaining consolidated SEO domain authority while maintaining clear content boundaries.
4. **Independent Article Lifecycles:** An article written by the Turkish desk may be translated by the English and Arabic desks with different headlines, localized excerpts, and independent publication timestamps. Articles that lack translation simply exist only in their native edition.

---

## 2. Peer Comparison Matrix

| Dimension | Anadolu Agency (`aa.com.tr`) | BBC World Service (`bbc.com`) | Deutsche Welle (`dw.com`) | Al Jazeera (`aljazeera.com`) | Reuters (`reuters.com`) |
|---|---|---|---|---|---|
| **URL Pattern** | **Path prefix:** `/en/`, `/tr/`, `/ar/`, `/ru/`, `/fr/`, `/es/`, `/fa/`, etc. | **Path prefix / Slug:** `/news` (EN), `/arabic`, `/persian`, `/mundo` (ES), `/zhongwen/simp` | **Path prefix (ISO 639-1):** `/en/`, `/de/`, `/es/`, `/ar/`, `/pl/`, etc. | **Separate apex domains:** `aljazeera.com` (English), `aljazeera.net` (Arabic), `balkans.aljazeera.net` | **Root domain + Subdomains:** `reuters.com` (EN), `jp.reuters.com` (Japanese), subpaths for regions |
| **Language Switcher UI** | Persistent horizontal bar in top utility strip listing all active language abbreviations/names. | Global drawer / modal menu from header globus icon listing ~40 services. | Prominent dropdown in top header navigation labeled with current language code. | Header text toggle in utility bar (`العربية` on English site, `English` on Arabic site). | Region/Edition dropdown selector in top navigation bar. |
| **Untranslated Stories** | **No translation fallback:** The language switcher links directly to the target language's **edition homepage**, not the article, unless an explicit syndicate match exists. | Each language operates as a separate vertical service with unique article URLs. No direct 1:1 article switcher. | Attempts 1:1 translation link if registered in CMS; falls back to target language section or homepage. | Separate editorial newsrooms; stories are independently reported and do not cross-link 1:1. | No 1:1 article link; switcher routes to the target region's index or financial feed. |
| **Hreflang in Page Source** | Full reciprocal `<link rel="alternate" hreflang="..." href="...">` tags on edition homepages (14 entries). | Present on homepages and matching global syndicate stories; absent on localized niche reporting. | Employs reciprocal `hreflang` tags on paired translations and homepage roots. | Minimal cross-domain hreflang between `aljazeera.com` and `aljazeera.net` due to editorial divergence. | Used on regional English editions (e.g. `en-US`, `en-GB`, `en-IN`), not cross-lingual. |
| **Right-to-Left (RTL)** | Arabic (`/ar/`), Persian (`/fa/`), and Sorani Kurdish (`/ks/`) use `<html dir="rtl">` with mirrored navigation and layout. | Fully mirrored bespoke RTL layouts for `/arabic`, `/persian`, `/pashto`, `/urdu` using specific webfonts. | Employs `<html dir="rtl">` on `/ar/` and `/fa/` with CSS logical properties and mirrored widgets. | `aljazeera.net` is a native RTL platform; `aljazeera.com` is native LTR. | Subdomains like Japanese retain LTR layout; no native RTL edition currently hosted on core Reuters. |
| **Homepage Composition** | **Heavily localized:** Arabic edition leads with Middle East affairs; French edition leads with Francophone Africa/Europe; Turkish leads with national politics. | **Completely localized:** BBC Mundo leads on Latin America; BBC Arabic leads on Middle East. | **Independent running order:** German leads on European politics; foreign desks curate their own lead story. | Completely separate editorial priorities and running orders between English and Arabic newsrooms. | Regional editions lead on regional markets and economic breaking news. |
| **Publicly Stated Workflow** | Central news pool in Ankara wires breaking reports; regional desks translate, verify facts, and adjust cultural context before publishing. | Language desks staffed by native speakers who adapt central reports and produce original vernacular journalism. | Central editorial team in Bonn/Berlin distributes wire; 32 language desks adapt, translate, and verify independently. | Independent editorial boards with dedicated bureau networks in Doha, London, and Washington. | Global wire reporting routed through regional editing hubs (Singapore, Gdynia, London, New York). |

*Sources: Examined live on 2026-10-25 from `https://www.aa.com.tr/en`, `https://www.aa.com.tr/tr`, `https://www.aa.com.tr/ar`, `https://www.dw.com/en`, `https://www.aljazeera.com`, `https://www.aljazeera.net`, `https://www.bbc.com/arabic`, `https://www.reuters.com`.*

---

## 3. Patterns Worth Copying for CS NEWS

1. **Path-Prefix URL Namespaces (`/es/`, `/ar/`):**
   - Storing all language editions under `csnews.news/[locale]/` retains 100% of domain authority on a single domain and avoids multi-domain SSL / CORS complexities.
2. **Autonomous Edition Running Orders:**
   - Rather than forcing an English headline order onto an international reader, allow editors for a given language to curate their own lead stories and category hierarchies.
3. **Top Utility Bar Switcher:**
   - Anadolu’s placement of clean, non-intrusive language links in the top utility bar perfectly matches CS NEWS's existing ash utility band (`--utility-bg: #1c1c19`).
4. **Graceful Fallback for Untranslated Articles:**
   - When a reader views an English-only article and clicks "Español", routing them to `/es/` (or the corresponding category `/es/category/tech`) with a polite notice is significantly better than a 404 or a machine-translated garble.
5. **Strict Reciprocal Hreflang Tags:**
   - Only declare `hreflang` alternates when a human-approved or certified translation exists for that exact piece. Never emit one-way `hreflang` tags.

---

## 4. Patterns to Avoid

1. **Separate Apex Domains (The Al Jazeera Pattern):**
   - Running `csnews.news` and `csnews.es` as separate domains doubles hosting configuration, requires separate Let's Encrypt certificates, divides search engine equity, and breaks single-session preferences.
2. **Subdomains (The Reuters Pattern):**
   - Subdomains (`es.csnews.news`, `ar.csnews.news`) require wildcard DNS, complicated Cloudflare Access origin certificates, and cookie sharing across subdomains.
3. **Automated Machine Translation without Human Gate (Raw DeepL/Google API):**
   - Serving unverified machine translations harms editorial credibility and violates Google Search quality guidelines against automatically generated spammy content.
4. **Intrusive IP/Geo Redirection Popups:**
   - Automatically redirecting visitors based on IP or displaying blocking modal dialogs ruins user experience, confuses search engine crawlers, and frustrates expatriate readers.
5. **Forced 1:1 Translation Mirrors:**
   - Demanding that every single English story be translated before a language edition can publish paralyzes smaller translation desks. Editions must be able to publish asynchronously.

---

## 5. Architectural Recommendation for CS NEWS

### Recommended URL Structure: Path Prefix (`csnews.news/[lang]/...`)
- Default English: `https://csnews.news/` (or `https://csnews.news/en/` with root redirection)
- Spanish edition: `https://csnews.news/es/...`
- Arabic edition: `https://csnews.news/ar/...`

### Justification:
1. **Single Production Deployment:** Next.js App Router natively supports localized folder routing using dynamic segments `app/[locale]/(site)/layout.tsx`. A single Coolify container and a single Let's Encrypt origin certificate serve all languages.
2. **Cloudflare Zero Trust Scoping:** The admin remain centralized at `/admin` behind Cloudflare Access without needing multi-host policy definitions.
3. **Shared Design Tokens & Asset Caching:** All locales share `globals.css`, static fonts, and Next.js image optimization routes (`/_next/image`).
4. **SEO Consolidation:** Backlinks to Spanish or Arabic investigative reports strengthen the apex domain's global rank.

---

Verified by me:
- Inspected live page sources, DOM attributes, `<html lang/dir>`, and `hreflang` structures on `aa.com.tr`, `dw.com`, `aljazeera.com`, `aljazeera.net`, `bbc.com`, and `reuters.com`.
- Confirmed Anadolu Agency's 13-language subfolder architecture and top-bar edition switcher.
- Evaluated technical trade-offs between path-prefixes and subdomains for Next.js App Router and Cloudflare proxying.

Not verified:
- Internal proprietary CMS tooling inside Anadolu Agency (only public interfaces and public statements were analyzed).
- Implementation in CS NEWS codebase (pending owner approval of M6 roadmap).
