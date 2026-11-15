# Brief 14: Comprehensive Test Gap Analysis & Ranking

**Date:** 2026-10-25  
**Auditor:** Gemini CLI  
**Scope:** `news-site/web/src` and `news-site/cms/src`  
**Status:** Gap Analysis and Targeted Pure Function Test Additions

---

## 1. Executive Summary

This brief provides a systematic gap analysis of every file in `news-site/web/src` and `news-site/cms/src` that lacks automated test coverage, ranked by risk (Security, Data Loss, Money/Cost, User-Visible Text & SEO).

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

## 3. Coverage Clarification: Files Already Tested

Prior to ranking the remaining gaps, two critical CMS files frequently flagged in static file scans were re-evaluated against the existing test suite:
- **`news-site/cms/src/access/jobsGuard.ts`:** **Thoroughly covered.** Although lacking an isolated unit file bearing its exact name, its access controls and threat model T22 mitigations are actively exercised across **4 integration test suites**:
  1. `news-site/cms/tests/adversarial.int.spec.ts`
  2. `news-site/cms/tests/hardening.int.spec.ts`
  3. `news-site/cms/tests/jobs-forgery.int.spec.ts`
  4. `news-site/cms/tests/scheduling.int.spec.ts`
- **`news-site/cms/src/collections/NewsletterSubscribers.ts`:** **Thoroughly covered.** The collection and its secret-protected `/subscribe` endpoint are exercised across **2 integration test suites**:
  1. `news-site/cms/tests/access.int.spec.ts`
  2. `news-site/cms/tests/newsletter-subscribe.int.spec.ts`  
  *(Note: The collection contains only `email` and `subscribedAt` fields; there is no unsubscribe logic in the codebase).*

---

## 4. Re-Ranked Test Gaps (What Tests Actually Exercise)

The genuinely untested or lightly tested files in `cms/src` and `web/src` are ranked below by risk profile:

### Tier 1: Critical Risk (Security, Data Integrity & Migrations)

| Rank | File Path | Risk Category | Risk Summary & What Tests Exercise |
|---|---|---|---|
| **1** | `news-site/cms/src/collections/Taxonomy.ts` | **Data Integrity** | Defines `Categories`, `Topics`, and `Authors` collections. Create/update permissions and unique slug enforcement for taxonomy collections lack dedicated unit tests. |
| **2** | `news-site/cms/src/hooks/notifyWeb.ts` | **Revalidation / Cache** | Webhook notifier triggering website ISR on content changes. While article publish notification is tested in `publish-webhook.int.spec.ts`, the taxonomy change notifier (`notifyAfterTaxonomyChange`) and network timeout error paths lack coverage. |
| **3** | `news-site/cms/src/collections/slug.ts` | **Data Integrity** | Slug generation logic (`slugify`). While used in `Articles.ts`, isolated edge cases with Unicode accents, non-Latin characters, and repeated hyphens are not directly unit tested. |
| **4** | `news-site/cms/scripts/migrate-from-sanity.ts` | **Migration Safety** | The command-line wrapper script for Sanity migration. While `sanityMigration.ts` is tested, the CLI argument parsing, environment validation, and error exit codes lack end-to-end tests. |
| **5** | `news-site/cms/src/access/roles.ts` | **Security / Auth** | **Covered in this PR.** Pure access control functions determining staff, editor, and admin permissions across Payload collections and fields. |

---

### Tier 2: High Risk (SEO, Dynamic Cards & Layout Resiliency)

| Rank | File Path | Risk Category | Risk Summary & What Tests Exercise |
|---|---|---|---|
| **6** | `news-site/web/src/app/article/[slug]/opengraph-image.tsx` & `app/opengraph-image.tsx` | **SEO / Availability** | Dynamic social card generation on Edge runtime. Completely untested; audit in Brief 07 revealed that card generation crashes with HTTP 500 when remote images fail to load. |
| **7** | `news-site/web/src/sanity/image.ts` | **Layout / CLS** | **`displayDimensions` covered in this PR.** Calculates image aspect ratios, Studio crops, and max-width scaling to prevent Cumulative Layout Shift (CLS). |
| **8** | `news-site/web/src/app/robots.ts` & `app/manifest.ts` | **SEO / PWA** | **Covered in this PR.** Crawling directives, private route disallows, sitemap URLs, and PWA manifest metadata. |
| **9** | `news-site/web/src/components/Breadcrumbs.tsx` | **SEO / Microdata** | Renders breadcrumb trails and Schema.org `BreadcrumbList` JSON-LD microdata. Syntax errors break Google Search rich snippets. |
| **10** | `news-site/cms/src/collections/uploadRules.ts` | **Upload Security** | Defines allowed MIME types and max upload sizes for media assets. |

---

### Tier 3: Medium Risk (User Interaction, Form Feedback & Fallbacks)

| Rank | File Path | Risk Category | Risk Summary & What Tests Exercise |
|---|---|---|---|
| **11** | `news-site/web/src/components/NewsletterSignup.tsx` | **User Interaction** | Client-side newsletter form handling pending states, rate limiting messages, and accessibility live regions. |
| **12** | `news-site/web/src/lib/site.ts` | **Metadata / Display** | Formats masthead publication dates (`mastheadDate`) and site constants. |
| **13** | `news-site/web/src/components/Pagination.tsx` | **Navigation** | Category pagination controls (`Newer stories` / `Older stories`). |
| **14** | `news-site/web/src/app/not-found.tsx` | **Error UX** | Custom 404 page rendering and navigation fallbacks. |

---

### Tier 4: Low Risk (Presentational Chrome & Visual Enhancements)

| Rank | File Path | Risk Category | Risk Summary & What Tests Exercise |
|---|---|---|---|
| **15** | `news-site/web/src/components/HeadlineCarousel.tsx` | **Presentation** | Animated headline ticker beneath the lead story. |
| **16** | `news-site/web/src/components/SiteHeader.tsx` & `SiteFooter.tsx` | **Presentation** | Primary masthead, navigation strips, utility controls, and footer links. |
| **17** | `news-site/web/src/components/SiteMenu.tsx` | **Presentation** | Brand menu overlay. |
| **18** | `news-site/web/src/components/ArticleBody.tsx` | **Presentation** | Sanity PortableText blockquote and list rendering components. |
| **19** | `news-site/web/src/components/ArticleRow.tsx` | **Presentation** | Vertical article card with thumbnail and category badge. |
| **20** | `news-site/web/src/components/CategoryListing.tsx` & `CategoryNav.tsx` | **Presentation** | Section layout and sub-navigation links. |
| **21** | `news-site/web/src/components/ReadingProgress.tsx` | **Presentation** | Scroll-driven reading progress bar indicator. |
| **22** | `news-site/web/src/components/RelatedArticles.tsx` | **Presentation** | Article recommendations strip. |
| **23** | `news-site/web/src/components/SearchForm.tsx` | **Presentation** | Search input component and query parameter submission. |
| **24** | `news-site/web/src/components/ShareLinks.tsx` | **Presentation** | Web Share API trigger and email sharing links. |
| **25** | `news-site/web/src/components/Skeletons.tsx` | **Presentation** | Pulsing ash skeleton placeholders during server page transitions. |
| **26** | `news-site/web/src/components/ThemeToggle.tsx` & `TextSizeControl.tsx` | **Presentation** | Client preference controls setting `data-theme` and `data-text-size` on `<html>`. |
| **27** | `news-site/web/src/lib/placeholder-articles.ts` | **Fallback Data** | Static mock data used only as fallback when Sanity is empty. |
| **28** | `news-site/web/src/sanity/env.ts` | **Config** | Sanity project and dataset string constants. |

---

## 5. Verification & Deliberate Break Evidence

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
- Clarified that `jobsGuard.ts` is covered by 4 integration test files and `NewsletterSubscribers.ts` by 2 integration test files.
- Re-ranked actual test gaps by what tests currently exercise.
- TypeScript check (`npx tsc --noEmit`) passes with 0 errors in both `news-site/web` and `news-site/cms`.
- `news-site/web` tests pass: 69 passed across 11 files (61 baseline + 8 new).
- `news-site/cms` tests pass: 109 passed, 1 skipped across 12 files (100 baseline + 9 new).
- Demonstrated deliberate breaks causing test failures in both new test files, followed by clean reverts.
- Zero modifications to production code, package.json, or lockfiles.
- Zero secrets, hostnames, or server addresses.

Not verified:
- Claude review (pending review tomorrow).
