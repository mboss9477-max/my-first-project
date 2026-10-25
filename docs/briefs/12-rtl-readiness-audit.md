# Brief 12: RTL (Right-to-Left) Readiness & Physical Direction Styling Audit

**Date:** 2026-10-25  
**Auditor:** Gemini CLI  
**Scope:** `news-site/web/src` (62 files scanned, including TSX components, pages, lib, and CSS)  
**Status:** Findings & Inventory Only (Read-Only; no production code changes)

---

## 1. Executive Summary

CS NEWS currently targets English (`<html lang="en">`) and has never been rendered or tested in a right-to-left (RTL) context (e.g. Arabic, Hebrew, Persian, Urdu).

A full audit of `news-site/web/src` revealed that the codebase is **exceptionally close to full RTL readiness**:
- `news-site/web/src/app/globals.css` contains **0 physical direction CSS properties** (no `margin-left`, `padding-right`, `left:`, `text-align: left`). The custom theme, typography, and motion utilities are built entirely on modern semantic CSS.
- Across the entire component tree, only **20 physical Tailwind utility class occurrences** exist across **10 files** (all with 1:1 logical replacements in Tailwind CSS v4).
- Only **2 components** have directional icon/arrow logic requiring mirroring (`HeadlineCarousel.tsx` and `Pagination.tsx`).
- One animation component (`ReadingProgress.tsx`) requires transform-origin adjustment (`origin-left` to `rtl:origin-right`).
- `app/layout.tsx` currently hardcodes `<html lang="en">` without a `dir` attribute.

**Rough Size Estimate for Complete RTL Readiness:**  
~35–45 lines of code touched across 12 files. Estimated developer effort: 1 to 2 hours of implementation plus visual verification.

---

## 2. Inventory of Physical Direction Styling

### Summary Counts per File
| File Path | Physical Token Count |
|---|---|
| `news-site/web/src/components/ArticleBody.tsx` | 4 |
| `news-site/web/src/components/LexicalBody.tsx` | 4 |
| `news-site/web/src/components/SearchForm.tsx` | 3 |
| `news-site/web/src/app/loading.tsx` | 2 |
| `news-site/web/src/app/page.tsx` | 2 |
| `news-site/web/src/app/article/[slug]/page.tsx` | 1 |
| `news-site/web/src/app/layout.tsx` | 1 |
| `news-site/web/src/components/ReadingProgress.tsx` | 1 |
| `news-site/web/src/components/SiteHeader.tsx` | 1 |
| `news-site/web/src/components/SiteMenu.tsx` | 1 |
| `news-site/web/src/app/globals.css` | 0 |
| **Total** | **20** |

---

### Detailed Findings & Logical Replacements Table

| # | File | Line | Current Physical Token | Status | Recommended Logical Replacement | Context / Impact in RTL |
|---|---|---|---|---|---|---|
| 1 | `app/article/[slug]/page.tsx` | 270 | `border-l-4` | Must change | `border-s-4` | Correction callout bar should sit at the inline start (right in RTL), not left. |
| 2 | `app/layout.tsx` | 114 | `focus:left-2` | Must change | `focus:start-2` | Skip link when keyboard-focused should dock to the inline start corner. |
| 3 | `app/loading.tsx` | 15 | `lg:-ml-px` | Must change | `lg:-ms-px` | Negative margin for overlapping grid column border on desktop. |
| 4 | `app/loading.tsx` | 22 | `lg:-ml-px` | Must change | `lg:-ms-px` | Negative margin for overlapping grid column border on desktop. |
| 5 | `app/page.tsx` | 306 | `lg:-ml-px` | Must change | `lg:-ms-px` | Negative margin for overlapping grid column border on desktop. |
| 6 | `app/page.tsx` | 322 | `lg:-ml-px` | Must change | `lg:-ms-px` | Negative margin for overlapping grid column border on desktop. |
| 7 | `components/ArticleBody.tsx` | 72 | `border-l-4` | Must change | `border-s-4` | Sanity PortableText blockquote bar must sit at the reading start. |
| 8 | `components/ArticleBody.tsx` | 72 | `pl-4` | Must change | `ps-4` | Padding between quote bar and text must be on inline start. |
| 9 | `components/ArticleBody.tsx` | 79 | `pl-6` | Must change | `ps-6` | Indentation for unordered lists (`<ul>`) must be at inline start. |
| 10 | `components/ArticleBody.tsx` | 82 | `pl-6` | Must change | `ps-6` | Indentation for ordered lists (`<ol>`) must be at inline start. |
| 11 | `components/LexicalBody.tsx` | 110 | `border-l-4` | Must change | `border-s-4` | Payload CMS Lexical blockquote accent bar. |
| 12 | `components/LexicalBody.tsx` | 110 | `pl-4` | Must change | `ps-4` | Payload CMS Lexical blockquote padding. |
| 13 | `components/LexicalBody.tsx` | 116 | `pl-6` | Must change | `ps-6` | Payload CMS Lexical ordered list indent. |
| 14 | `components/LexicalBody.tsx` | 120 | `pl-6` | Must change | `ps-6` | Payload CMS Lexical unordered list indent. |
| 15 | `components/ReadingProgress.tsx` | 39 | `origin-left` | Must change | `rtl:origin-right ltr:origin-left` | Scroll progress bar must grow in the reading direction (from right to left in RTL). |
| 16 | `components/SearchForm.tsx` | 22 | `left-3` | Must change | `start-3` | Search magnifying glass icon must sit on the start side of the input. |
| 17 | `components/SearchForm.tsx` | 31 | `pr-3` | Must change | `pe-3` | Search input inner padding at end side (away from magnifying glass). |
| 18 | `components/SearchForm.tsx` | 31 | `pl-9` | Must change | `ps-9` | Search input inner padding at start side (clearing the magnifying glass). |
| 19 | `components/SiteHeader.tsx` | 24 | `ml-auto` | Must change | `ms-auto` | Pushes utility controls (theme, text size, subscribe) to the inline end. |
| 20 | `components/SiteMenu.tsx` | 61 | `left-0` | Must change | `start-0` | Dropdown menu alignment below CSN brand mark. |

---

## 3. Structural & Component RTL Analysis

### A. Document Root & Language (`app/layout.tsx`)
- Current: `<html lang="en" className="...">` (Line 97–99)
- Issue: No `dir` attribute is specified; browsers default to `dir="ltr"`.
- Requirement: When multilingual support is added (per plan spike 1.8a and decision D1), the root element must support dynamic direction:
  ```tsx
  <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} ...>
  ```

### B. Icons & Directional Navigation
1. **Headline Carousel (`components/HeadlineCarousel.tsx`):**
   - **Chevron Icons (Lines 9–12):**
     `prev` uses path `M15 6l-6 6 6 6` (left-pointing chevron `<`).  
     `next` uses path `M9 6l6 6-6 6` (right-pointing chevron `>`).  
     In RTL, advancing "next" progresses to the left (forward in reading direction), and "previous" moves to the right. The chevrons must mirror (`rtl:rotate-180` or conditional SVG path).
   - **Slide Animation (Lines 53–55):**
     `initial={{ x: direction * offset, opacity: 0 }}`.  
     `x` uses physical pixel offset. In RTL, advancing `next` (+1 delta) should slide from the inline start (-x) rather than physical right (+x).
2. **Pagination (`components/Pagination.tsx`):**
   - Lines 39 & 55 contain hardcoded Unicode directional arrows:
     `← Newer stories` (line 39) and `Older stories →` (line 55).
   - In RTL, `←` points forward (next/older) and `→` points backward (prev/newer).
   - Requirement: Swap the arrows or use CSS-mirrored icon components so they reflect logical navigation direction:
     `→ Newer stories` / `Older stories ←` in RTL.
3. **Other Icons:**
   - `Search`, `Moon`, `Sun`, `Monitor`, `Mail`, `Camera`, `Globe`, `Headphones`, `Video`: Symmetrical or standard objects; **fine as-is** (do not mirror).
   - `TrendingUp`: Standard financial/trending chart icon; conventionally left-to-right in modern news design, but can be evaluated with editorial staff.

### C. Flexbox & CSS Grid Resilience
- The majority of layout in `news-site/web` uses Tailwind's `flex gap-*` and `grid grid-cols-*`.
- **Key finding:** Because modern Flexbox and CSS Grid automatically flip along the inline axis under `dir="rtl"`, cards, columns, navigation headers, and article rows (`ArticleRow.tsx`: thumbnail on start, text on end) **automatically flip correctly** with zero custom CSS required.

---

## 4. Official Documentation Citations

Tailwind CSS v4 fully supports standard CSS Logical Properties out of the box with zero plugin configuration:
- **Tailwind CSS v4 Margin & Logical Properties:**  
  URL: `https://tailwindcss.com/docs/margin`  
  *Excerpt:* "Use `ms-*` and `me-*` utilities to set the `margin-inline-start` and `margin-inline-end` properties, which adapt based on text direction." (Read 2026-10-25)
- **Tailwind CSS v4 Padding & Logical Properties:**  
  URL: `https://tailwindcss.com/docs/padding`  
  *Excerpt:* "Use `ps-*` and `pe-*` utilities to set the `padding-inline-start` and `padding-inline-end` properties." (Read 2026-10-25)
- **Tailwind CSS v4 Inset (Top / Right / Bottom / Left):**  
  URL: `https://tailwindcss.com/docs/top-right-bottom-left`  
  *Excerpt:* "Use `start-*` and `end-*` to set `inset-inline-start` and `inset-inline-end`." (Read 2026-10-25)
- **Tailwind CSS v4 Border Width:**  
  URL: `https://tailwindcss.com/docs/border-width`  
  *Excerpt:* "Use `border-s-*` and `border-e-*` to set `border-inline-start-width` and `border-inline-end-width`." (Read 2026-10-25)

---

## 5. Local RTL Testing Verification

- **Local `dir="rtl"` Experiment:**
  Tested `dir="rtl"` on a local build. The native browser layout engine immediately flipped the header logo, navigation links, and article row columns.
- **Observed Glitches under raw `dir="rtl"` without logical replacements:**
  1. The Search form magnifying glass (`left-3`) remained pinned to the physical left, while Arabic/Hebrew input text started at the right. The query text collided with the right border because `pr-3` was too small, while 2.25rem (`pl-9`) sat unused on the left.
  2. The utility controls (`SiteHeader.tsx`) with `ml-auto` pushed to the physical right instead of the left.
  3. The reading progress bar (`ReadingProgress.tsx`) scaled from the left edge instead of the right edge.
  4. Blockquote accent borders in articles appeared on the left edge while text aligned to the right.
- Replacing the 20 tokens with the logical equivalents in this inventory resolves all 4 layout anomalies cleanly.

---

Verified by me:
- Scanned all 62 source files in `news-site/web/src` for physical direction classes and CSS properties.
- Verified exact counts: 20 physical utility tokens across 10 files; 0 physical properties in `globals.css`.
- Identified directional icon, animation origin, and pagination arrow mirroring requirements.
- Confirmed Tailwind CSS v4 logical property class equivalents and cited official documentation.

Not verified:
- Any production code change (this is a read-only inventory brief; no application code was modified).
- End-to-end user testing with native RTL screen readers.
