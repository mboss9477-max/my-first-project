# Brief 14: Comprehensive Test Gap Analysis & Ranking

**Date:** 2026-10-25  
**Auditor:** Gemini CLI  
**Scope:** `news-site/web/src` and `news-site/cms/src`  
**Status:** Gap Analysis and Targeted Pure Function Test Additions

---

## 1. Executive Summary

This brief provides a systematic gap analysis of every file in `news-site/web/src` (61 files) and `news-site/cms/src` (25 files) that lacks automated test coverage, ranked by risk (Security, Data Loss, Money/Cost, User-Visible Text & SEO).

As part of this task, isolated unit tests were implemented for high-priority pure logic and access control modules without adding any external dependencies or modifying production code:
1. **CMS Access Control (`news-site/cms/src/access/roles.ts`):** Added 9 unit tests in `news-site/cms/tests/access-roles.int.spec.ts` covering role checks (`hasRole`), staff authentication guards (`isStaff`), admin privileges (`isAdmin`, `isAdminField`), and editor authorization (`isEditorOrAdmin`).
2. **Web Image & SEO Metadata (`news-site/web/src/sanity/image.ts`, `app/robots.ts`, `app/manifest.ts`):** Added 8 unit tests in `news-site/web/tests/image-seo.test.ts` covering intrinsic aspect ratio / crop dimension calculation (`displayDimensions`), search engine crawling rules (`robots`), and PWA manifest metadata (`manifest`).

---

## 2. Test Coverage Metrics

| Workspace | Baseline Test Files | Baseline Passing Tests | New Test Files | New Passing Tests | New Total Tests |
|---|---|---|---|---|---|
| `news-site/web` | 10 passed | 61 passed | +1 (`image-seo.test.ts`) | +8 | **69 passed (11 files)** |
| `news-site/cms` | 11 passed, 1 skipped | 100 passed, 1 skipped | +1 (`access-roles.int.spec.ts`) | +9 | **109 passed, 1 skipped (12 files passed)** |

TypeScript validation: `npx tsc --noEmit` = 0 errors in both `web` and `cms`.

---

## 3. Systematic Test Gap Ranking

All untested files in `web/src` and `cms/src` are ranked below by risk profile into four tiers:

### Tier 1: Critical Risk (Security, Authorization, Data Loss & Integrity)

| Rank | File Path | Risk Category | Risk Summary & Impact if Broken |
|---|---|---|---|
| **1** | `news-site/cms/src/access/jobsGuard.ts` | **Security / Forgery** | Implements Threat T22 mitigation. Guards against non-admin writers queueing or cancelling scheduled publish jobs. A logic flaw would allow writers to schedule unreviewed stories or cancel editor schedules. |
| **2** | `news-site/cms/src/collections/Users.ts` | **Security / Auth** | User authentication collection, account lockout hooks, and role definitions. Tested indirectly via integration, but edge cases in field-level validation and hooks lack isolated unit coverage. |
| **3** | `news-site/cms/src/collections/NewsletterSubscribers.ts` | **Data / Privacy** | Manages subscriber PII and unsubscribe states. Hook failures could leak subscriber lists or corrupt subscription tracking. |
| **4** | `news-site/cms/src/collections/Media.ts` | **Security / Data** | File upload collection defining MIME type restrictions and image size generation hooks. Bypasses could allow dangerous file uploads or disk exhaustion. |
| **5** | `news-site/cms/src/migrations/20261024_151956_initial.ts` & `index.ts` | **Data Loss** | Initial Drizzle schema migrations. Migration failure could halt staging or production database initialization. |
| **6** | `news-site/cms/src/access/roles.ts` | **Security / Auth** | **Covered in this PR.** Pure access control rules determining staff, editor, and admin permissions across Payload collections and fields. |

---

### Tier 2: High Risk (Data Integrity, API Contracts & Taxonomy)

| Rank | File Path | Risk Category | Risk Summary & Impact if Broken |
|---|---|---|---|
| **7** | `news-site/cms/src/collections/Taxonomy.ts` | **Data Integrity** | Category and Topic schema rules and unique slug enforcement. Collisions or missing slugs break site-wide URL routing. |
| **8** | `news-site/web/src/sanity/image.ts` | **Layout / Bandwidth** | **`displayDimensions` covered in this PR.** Calculates image aspect ratios, Studio crops, and max-width scaling to prevent Cumulative Layout Shift (CLS) and over-fetching. |
| **9** | `news-site/web/src/data/index.ts` | **Data Seam** | Re-exports all data layer functions (`getArticle`, `getLatestArticles`, etc.). A broken export breaks page rendering across the entire application. |
| **10** | `news-site/cms/src/app/(payload)/api/[...slug]/route.ts` | **API Availability** | REST API catch-all handler for Payload CMS. Handler regressions break CMS data fetching by external consumers. |
| **11** | `news-site/cms/src/app/(payload)/api/graphql/route.ts` | **API Availability** | GraphQL API handler for the CMS backend. |

---

### Tier 3: Medium Risk (User-Visible Text, SEO & Crawling Directives)

| Rank | File Path | Risk Category | Risk Summary & Impact if Broken |
|---|---|---|---|
| **12** | `news-site/web/src/app/robots.ts` | **SEO / Security** | **Covered in this PR.** Directs search engine crawlers; disallows `/search` and `/api/` while specifying sitemap locations. Regressions could de-index the site or leak private routes. |
| **13** | `news-site/web/src/app/manifest.ts` | **User Text / PWA** | **Covered in this PR.** Web app manifest defining PWA metadata, standalone display, and branded OS theme colors. |
| **14** | `news-site/web/src/app/article/[slug]/opengraph-image.tsx` | **User Text / Social** | Dynamic social card generation for articles without custom heroes. Failure produces blank or broken social media share cards. |
| **15** | `news-site/web/src/app/layout.tsx` | **Accessibility / Shell** | Document root containing inline theme and font initialization scripts, JSON-LD structured data, and the critical "Skip to content" keyboard link. |
| **16** | `news-site/web/src/app/not-found.tsx` | **User-Visible Text** | Custom 404 response page ensuring broken links yield clear navigation back to the front page. |
| **17** | `news-site/web/src/components/Breadcrumbs.tsx` | **SEO / User Text** | Breadcrumb navigation and Schema.org `BreadcrumbList` microdata. Formatting errors invalidate Google search breadcrumbs. |
| **18** | `news-site/web/src/components/Pagination.tsx` | **Navigation** | Prerendered page pagination navigation for category listings (`← Newer stories` / `Older stories →`). |
| **19** | `news-site/web/src/components/NewsletterSignup.tsx` | **User Interaction** | Client-side newsletter form handling optimistic state, rate limiting feedback, and error messages. |

---

### Tier 4: Low Risk (Presentational Chrome & Visual Enhancements)

| Rank | File Path | Risk Category | Risk Summary & Impact if Broken |
|---|---|---|---|
| **20** | `news-site/web/src/components/ArticleBody.tsx` | **Presentation** | Sanity PortableText blockquote and list rendering components. |
| **21** | `news-site/web/src/components/ArticleRow.tsx` | **Presentation** | Vertical article card with thumbnail, category badge, and headline. |
| **22** | `news-site/web/src/components/CategoryListing.tsx` & `CategoryNav.tsx` | **Presentation** | Section layout and sub-navigation links. |
| **23** | `news-site/web/src/components/HeadlineCarousel.tsx` | **Presentation** | Animated headline ticker beneath the lead story. |
| **24** | `news-site/web/src/components/ReadingProgress.tsx` | **Presentation** | Scroll-driven reading progress bar indicator. |
| **25** | `news-site/web/src/components/RelatedArticles.tsx` | **Presentation** | "More in this category" article recommendations strip. |
| **26** | `news-site/web/src/components/SearchForm.tsx` | **Presentation** | Search input component and query parameter submission. |
| **27** | `news-site/web/src/components/ShareLinks.tsx` | **Presentation** | Web Share API trigger and email sharing links. |
| **28** | `news-site/web/src/components/SiteHeader.tsx` & `SiteFooter.tsx` | **Presentation** | Primary masthead, navigation strips, utility controls, and footer links. |
| **29** | `news-site/web/src/components/SiteMenu.tsx` | **Presentation** | CSN monogram brand menu overlay. |
| **30** | `news-site/web/src/components/Skeletons.tsx` & `loading.tsx` routes | **Presentation** | Pulsing ash skeleton placeholders during server page transitions. |
| **31** | `news-site/web/src/components/ThemeToggle.tsx` & `TextSizeControl.tsx` | **Presentation** | Client preference controls setting `data-theme` and `data-text-size` on `<html>`. |
| **32** | `news-site/web/src/lib/placeholder-articles.ts` | **Fallback Data** | Static mock data used only as fallback when Sanity is empty. |
| **33** | `news-site/web/src/sanity/env.ts` | **Config** | Sanity project and dataset string constants. |

---

## 4. Verification & Deliberate Break Evidence

### Web: `news-site/web/tests/image-seo.test.ts`
1. **Deliberate Break:** In `news-site/web/src/sanity/image.ts`, inverted crop calculation from `(1 - crop.left - crop.right)` to `(1 + crop.left + crop.right)`.
2. **Failure:** `accounts for Studio crop percentages on width and height` failed with `AssertionError: expected { width: 1300, height: 600 } to deeply equal { width: 700, height: 600 }`.
3. **Reverted:** Code restored to subtraction; all 8 tests passed.

### CMS: `news-site/cms/tests/access-roles.int.spec.ts`
1. **Deliberate Break:** In `news-site/cms/src/access/roles.ts`, inverted `isAdmin` rule: `!hasRole(user, 'admin')`.
2. **Failure:** `isAdmin and isEditorOrAdmin access rules > isAdmin permits only admin users` failed with `AssertionError: expected true to be false`.
3. **Reverted:** Code restored to `hasRole(user, 'admin')`; all 9 tests passed.

---

Verified by me:
- TypeScript check (`npx tsc --noEmit`) passes with 0 errors in both `news-site/web` and `news-site/cms`.
- `news-site/web` tests pass: 69 passed across 11 files (61 baseline + 8 new).
- `news-site/cms` tests pass: 109 passed, 1 skipped across 12 files (100 baseline + 9 new).
- Demonstrated deliberate breaks causing test failures in both new test files, followed by clean reverts.
- Zero modifications to production code, package.json, or lockfiles.
- Zero secrets, hostnames, or server addresses.

Not verified:
- Writing automated tests for remaining Tier 1/2 items (e.g. `jobsGuard.ts` hook integration).
- Claude review (pending review tomorrow).
