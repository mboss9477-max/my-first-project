# Lighthouse Performance Baseline Measurement Report (Master Plan M2)

Date: 2026-10-25  
Target Scope: Public website on live production (`https://csnews.news`, read-only) and local production build (`npm run build && npx next start -p 3100`, default Sanity mode).  
Pages Evaluated: Home (`/`), Article (`/article/open-hardware-consumer-devices`), and Category (`/category/business`).  
Evaluation Protocol: Automated runs via `lighthouse` (v13.5.0) in headless Chrome across mobile (`--form-factor=mobile`) and desktop (`--preset=desktop`) presets, 3 runs per target configuration (36 total test runs), reporting **MEDIAN** metrics.  
Target Benchmark: Master Plan M2 target of **Lighthouse Mobile Performance >= 85**.

---

## 1. Executive Summary & Target Comparison

**Result: All evaluated pages exceed the Master Plan M2 target of >= 85 mobile Performance.**

- **Live Site Mobile Performance Medians**:
  - Home: **97 / 100** (+12 points above target)
  - Article: **96 / 100** (+11 points above target)
  - Category: **97 / 100** (+12 points above target)
- **Local Production Build Mobile Performance Medians**:
  - Home: **90 / 100** (+5 points above target)
  - Article: **94 / 100** (+9 points above target)
  - Category: **89 / 100** (+4 points above target)
- **Desktop Performance Medians**: **99 – 100 / 100** across all live and local targets.
- **Accessibility, Best Practices, & SEO Medians**: **100 / 100** across all 12 page/device combinations.
- **Cumulative Layout Shift (CLS)**: **0.000** across all runs (zero layout shifts observed).
- **Total Blocking Time (TBT)**: **0 ms** on desktop; **22 ms – 61 ms** on mobile (far below the 200 ms green threshold).

---

## 2. Comprehensive Median Results Table

*Metrics represent the statistical median of 3 independent runs per target configuration.*

| Environment | Page | Device | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | M2 Status (>=85) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Live** | Home (`/`) | Mobile | **97** | **100** | **100** | **100** | 2.67 s | 51 ms | 0.000 | **PASS** (+12) |
| **Live** | Home (`/`) | Desktop | **99** | **100** | **100** | **100** | 0.86 s | 0 ms | 0.000 | **PASS** (+14) |
| **Live** | Article (`/article/...`) | Mobile | **96** | **100** | **100** | **100** | 2.67 s | 61 ms | 0.000 | **PASS** (+11) |
| **Live** | Article (`/article/...`) | Desktop | **100** | **100** | **100** | **100** | 0.61 s | 0 ms | 0.000 | **PASS** (+15) |
| **Live** | Category (`/category/...`) | Mobile | **97** | **100** | **100** | **100** | 2.59 s | 38 ms | 0.000 | **PASS** (+12) |
| **Live** | Category (`/category/...`) | Desktop | **100** | **100** | **100** | **100** | 0.63 s | 0 ms | 0.000 | **PASS** (+15) |
| **Local** | Home (`/`) | Mobile | **90** | **100** | **100** | **100** | 3.67 s | 23 ms | 0.000 | **PASS** (+5) |
| **Local** | Home (`/`) | Desktop | **99** | **100** | **100** | **100** | 0.85 s | 0 ms | 0.000 | **PASS** (+14) |
| **Local** | Article (`/article/...`) | Mobile | **94** | **100** | **100** | **100** | 3.11 s | 23 ms | 0.000 | **PASS** (+9) |
| **Local** | Article (`/article/...`) | Desktop | **100** | **100** | **100** | **100** | 0.70 s | 0 ms | 0.000 | **PASS** (+15) |
| **Local** | Category (`/category/...`) | Mobile | **89** | **100** | **100** | **100** | 3.85 s | 46 ms | 0.000 | **PASS** (+4) |
| **Local** | Category (`/category/...`) | Desktop | **100** | **100** | **100** | **100** | 0.77 s | 0 ms | 0.000 | **PASS** (+15) |

---

## 3. Top Five Opportunities and Diagnostics

Although performance scores are strong, Lighthouse flagged five distinct optimization opportunities:

### 1. Reduce Unused JavaScript (`unused-javascript`)
- **Impact**: Est. savings of **51 KiB – 57 KiB** (150 ms – 450 ms potential main-thread savings).
- **Component / File**: Next.js client runtime chunks (`_next/static/chunks/` bundling `@portabletext/react`, `motion/react` / Framer Motion, and `lucide-react`).
- **Affected Components**:
  - [CategoryNav.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/components/CategoryNav.tsx#L3) (`motion.span`)
  - [HeadlineCarousel.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/components/HeadlineCarousel.tsx#L3) (`motion.h3`)
  - [Reveal.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/components/Reveal.tsx#L3) (`motion.div`)
- **Suggested Improvement**: Replace full `motion/react` imports with CSS transitions where possible or use Framer Motion's lightweight `m` component via `LazyMotion` to trim ~30 KiB of unused animation runtime.

### 2. Largest Contentful Paint Element Preloading & Discovery (`lcp-discovery-insight`)
- **Impact**: LCP on mobile currently ranges from **2.52 s to 3.85 s** (LCP audit score 0.54 – 0.89).
- **Component / File**:
  - Home: Lead card hero image in [page.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/app/page.tsx#L66) (`<CardImage>`)
  - Article: Hero image in [page.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/app/article/[slug]/page.tsx#L230) — *already carries `priority`*.
- **Issue**: On the homepage, the lead story hero image is rendered inside `<CardImage>` without `priority` or `<link rel="preload">` in `<head>`. The browser only initiates the image request after DOM parsing and layout calculation. (In contrast, the article detail page hero image at line 230 already specifies `priority`, correctly triggering early preloading).
- **Suggested Improvement**: Add `priority` to the above-the-fold lead story image on the front page (`<CardImage priority={true} ... />` or `<Image priority ... />`).

### 3. Accessible Name Mismatch on Menu Button (`label-content-name-mismatch`)
- **Impact**: Diagnostic flagged on all 36 audit runs (Audit score 0 / failed).
- **Component / File**: [SiteMenu.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/components/SiteMenu.tsx#L52-L55)
  ```tsx
  <button
    type="button"
    aria-label={`${SITE_NAME} menu`}
    className="..."
  >
    {SITE_MONOGRAM}
  </button>
  ```
- **Issue**: The visible button text is `"CSN"`, but the accessible name is `"CS NEWS menu"`. Under WCAG 2.5.3 (Label in Name), speech-recognition users speaking "Click CSN" cannot trigger the button because the accessible name does not contain the visible text string `"CSN"`.
- **Suggested Improvement**: Change the accessible label to include the visible monogram: `aria-label="CSN — CS NEWS menu"`.

### 4. Render-Blocking Stylesheets (`render-blocking-insight`)
- **Impact**: Est. savings of **100 ms – 150 ms** on FCP.
- **Component / File**: [globals.css](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/app/globals.css) and Google Font declarations in [layout.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/app/layout.tsx#L9-L23) (`next/font/google` for `Geist`, `Geist_Mono`, `Playfair_Display`).
- **Issue**: Extracted external stylesheets block the first paint until CSSOM construction finishes.
- **Suggested Improvement**: Keep font CSS preloaded (already handled by Next.js); consider inlining critical CSS above the fold if sub-second mobile FCP is desired.

### 5. In-Memory Scroll Layout Measurement Reflows (`forced-reflow-insight`)
- **Impact**: Minor layout invalidation during scroll interactions on mobile devices.
- **Component / File**: [ReadingProgress.tsx](file:///C:/Users/mboss/Projects/my-first-project-gemini/news-site/web/src/components/ReadingProgress.tsx)
- **Issue**: Reading progress bar recalculates `document.documentElement.scrollHeight` and `window.scrollY` during scroll events.
- **Suggested Improvement**: Use CSS scroll-driven animations (`animation-timeline: scroll()`) or throttle DOM measurement via `requestAnimationFrame`.

---

## 4. Run-to-Run Variation Analysis

To assess measurement consistency, three consecutive runs were captured per target configuration:

| Configuration | Metric | Run 1 | Run 2 | Run 3 | Spread (Max - Min) | Standard Deviation |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Live Home (Mobile)** | Performance | 96 | 97 | 97 | 1 pt | 0.58 pts |
| | LCP (s) | 2.82 s | 2.67 s | 2.67 s | 0.15 s | 0.09 s |
| | TBT (ms) | 51 ms | 63 ms | 28 ms | 35 ms | 17.6 ms |
| **Live Article (Mobile)** | Performance | 97 | 96 | 96 | 1 pt | 0.58 pts |
| | LCP (s) | 2.67 s | 2.74 s | 2.67 s | 0.07 s | 0.04 s |
| | TBT (ms) | 45 ms | 61 ms | 73 ms | 28 ms | 14.0 ms |
| **Live Category (Mobile)** | Performance | 97 | 97 | 97 | **0 pts** | **0.00 pts** |
| | LCP (s) | 2.52 s | 2.67 s | 2.59 s | 0.15 s | 0.08 s |
| | TBT (ms) | 38 ms | 54 ms | 34 ms | 20 ms | 10.6 ms |
| **Local Home (Mobile)** | Performance | 93 | 88 | 90 | 5 pts | 2.52 pts |
| | LCP (s) | 3.21 s | 3.93 s | 3.67 s | 0.72 s | 0.36 s |
| | TBT (ms) | 23 ms | 27 ms | 22 ms | 5 ms | 2.6 ms |
| **Local Article (Mobile)** | Performance | 95 | 94 | 94 | 1 pt | 0.58 pts |
| | LCP (s) | 2.96 s | 3.11 s | 3.11 s | 0.15 s | 0.09 s |
| | TBT (ms) | 23 ms | 25 ms | 23 ms | 2 ms | 1.2 ms |
| **Local Category (Mobile)** | Performance | 89 | 89 | 89 | **0 pts** | **0.00 pts** |
| | LCP (s) | 3.85 s | 3.85 s | 3.85 s | **0.00 s** | **0.00 s** |
| | TBT (ms) | 58 ms | 46 ms | 41 ms | 17 ms | 8.7 ms |

### Key Observations on Variance:
1. **Exceptional Stability on Live Cloudflare CDN**: Live mobile performance scores exhibited a spread of only **0 to 1 point** across all three runs, benefiting from edge asset caching, HTTP/3, and stable TTFB.
2. **Local CPU Throttling Variance**: Local mobile runs exhibited slightly higher LCP variance on the Home page (spread of 0.72 s / 5 Performance points) due to local Windows background task scheduling during simulated 4x CPU throttling.
3. **Desktop Invariance**: All desktop runs produced virtually identical scores (99 – 100 Performance, 0 ms TBT, 0.000 CLS across all targets).

---

## 5. Verification Status

Verified by me:
- 36 full automated Lighthouse audit runs executed via headless Chrome across mobile and desktop presets for Live (`https://csnews.news`) and Local (`http://localhost:3100`).
- Local production build compiled via `npm run build` and served via `npx next start -p 3100`.
- Extracted and computed statistical medians for Performance, Accessibility, Best Practices, SEO, LCP, CLS, and TBT.
- Cataloged top five performance opportunities and cross-referenced with exact repository files.
- Measured run-to-run variance across all 3-run batches.

Not verified:
- Real-user monitoring (RUM) field data (Chrome User Experience Report / CrUX dataset), which requires high-volume real visitor traffic over a 28-day rolling window.
- Physical low-end mobile hardware benchmarking (simulated via Lighthouse Moto G4 / 4x CPU slowdown profile).
