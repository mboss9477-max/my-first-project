# Brief 13: Visual QA Across Viewport Widths (375px, 768px, 1280px)

**Date:** 2026-10-25  
**Auditor:** Gemini CLI  
**Environment:** Local production build (`npm run build && npx next start -p 3100`)  
**Tested Pages:** Home (`/`), Article (`/article/open-hardware-consumer-devices`), Category (`/category/tech`), Topic (`/topic/climate`), Author (`/author/cs-news-staff`), Search (`/search`), 404 (`/non-existent-page-qa-test`)  
**Tested Viewports:** 375×812 (mobile), 768×1024 (tablet), 1280×900 (desktop)  
**Themes:** Light and Dark (`data-theme="light"` / `data-theme="dark"`)  
**Status:** QA Findings & Inventory Only (Read-Only; UI changes require the owner's visual sign-off)

---

## 1. Executive Summary

This is the first systematic visual QA audit across device widths and color schemes on the local production build.

Across all 7 page types, 3 device widths, and both light and dark themes:
- **Horizontal Scroll / Overflow:** **0 issues detected.** Every page strictly maintains `scrollWidth <= clientWidth`. No horizontal scrollbar appears on 375px mobile, 768px tablet, or 1280px desktop.
- **Image Ratios & Distortion:** **0 issues detected.** All Next.js images employ `object-fit: cover` within constrained aspect ratios (`aspect-[4/3]`, `aspect-[16/9]`, `aspect-square`), maintaining proper proportions without distortion or layout shift.
- **Clipped / Overlapping Text:** **0 severe text clipping bugs.** Heading typography and article prose wrap naturally without overflowing containers.
- **Color Schemes (Light & Dark):** Dark mode tokens (`#161614` paper, `#1e1e1b` surface, `#d4af4f` gold accent) render cleanly across all cards, rules, and typography with solid visual contrast.
- **Primary Area for Improvement:** **Touch Target Ergonomics on Mobile (< 44px).** Several utility icons, navigation links, and carousel buttons measure between 19px and 40px, below the WCAG 2.5.5 / 2.5.8 recommended 44×44px touch target threshold.

---

## 2. Counts by Severity

| Severity | Count | Category |
|---|---|---|
| **High** | 0 | Layout breaks, overlapping text, horizontal scrolling, missing assets |
| **Medium** | 6 | Undersized interactive touch targets on mobile (< 36px in key navigation/controls) |
| **Low** | 5 | Minor touch target thresholds (38–42px), dense navigation wrapping on small screens |
| **Total** | **11** | Distinct issue types across tested pages and viewports |

*(Note: While automated scanners flagged 836 individual element instances across all permutations, they all stem from 11 distinct component-level design patterns detailed below.)*

---

## 3. Visual QA Findings Table

| # | Severity | Page(s) | Width | Theme | What is Seen / Element | Suggested Fix |
|---|---|---|---|---|---|---|
| 1 | **Medium** | All pages | 375, 768 | Light, Dark | **Text Size Toggle (`SiteHeader.tsx`):** The `A A` text size button measures only 19×20px. On 375px touchscreens, it is crowded next to the theme toggle and search link, making precise tapping difficult. | Add `min-w-[44px] min-h-[44px]` with flex centering or add `p-2.5` padding to expand the interactive hit area without changing text size. |
| 2 | **Medium** | Home | 375, 768 | Light, Dark | **Headline Carousel Controls (`HeadlineCarousel.tsx`):** The Previous and Next story circular buttons are `size-7` (28×28px). On mobile, these require high finger precision to advance stories. | Expand button geometry to `size-10` (40×40px) or `size-11` (44×44px), or add an invisible pseudo-element `after:absolute after:-inset-2`. |
| 3 | **Medium** | All pages | 375 | Light, Dark | **Header Category Navigation Links (`SiteHeader.tsx`):** Category links ("Business", "Culture", "Politics", "Sport", "Tech", "World") have computed height of 30px (`pb-2.5 text-sm`). Tight vertical spacing between the masthead and trending bar creates accidental mis-taps. | Increase vertical link padding to `py-3` (height 44px) and wrap the navigation in a horizontally scrollable container with overflow snapping. |
| 4 | **Medium** | All pages | 375, 768 | Light, Dark | **Brand Menu Toggle ("CSN" in `SiteHeader.tsx`):** The top-left CSN brand button measures 34×24px, falling short of the 44px touch target guideline. | Increase height/width to `min-w-[44px] min-h-[44px]`. |
| 5 | **Medium** | All pages | 375 | Light, Dark | **Search Nav Link (`SiteHeader.tsx`):** Header Search icon and text link measure 59×16px (16px vertical touch height). | Add `py-3` to give the link a full 44px vertical touch target. |
| 6 | **Medium** | All pages | 375, 768 | Light, Dark | **Theme Toggle Button (`ThemeToggle.tsx`):** The dark/light/system icon button is 20×20px without expanded touch padding. | Increase container padding to `p-3` (minimum 44×44px hit box). |
| 7 | **Low** | All pages | 375 | Light, Dark | **Trending Topics Strip (`SiteHeader.tsx`):** Topic links ("Climate", "Transport", "Local government") have line height of 20px with 8px vertical gap. | Increase `gap-y-3` and add `py-2` to each topic link. |
| 8 | **Low** | All pages | 375, 768, 1280 | Light, Dark | **Newsletter Form Controls (`SiteFooter.tsx`):** The email input and "Subscribe" button measure 38px in height (under the 44px target). | Increase input and button height from `py-2` to `py-2.5` / `h-11` (44px). |
| 9 | **Low** | All pages | 375, 768, 1280 | Light, Dark | **Footer Icon Buttons (`SiteFooter.tsx`):** Disabled action buttons ("Newsletter", "RSS feed", "Share", "Website") use `size-10` (40×40px). Very close to 44px, but technically 4px under. | Increase button size from `size-10` to `size-11` (44×44px). |
| 10 | **Low** | Category, Topic | 375 | Light, Dark | **Pagination Links (`Pagination.tsx`):** "← Newer stories" and "Older stories →" links have height 36px on small screens. | Add `py-2.5` to bring the tap target height to 44px. |
| 11 | **Low** | Home | 375 | Light, Dark | **Mobile Nav Wrapping:** On 375px screens, the 6 category links wrap across two lines beneath the masthead, causing the header band to take up ~180px of vertical screen space before the lead article. | Consider a single-row horizontally swipeable nav bar on mobile (`overflow-x-auto whitespace-nowrap scrollbar-none`). |

---

## 4. What Looked Right (Strengths & Verified Aesthetics)

1. **Zero Horizontal Layout Bleed:**
   - Every page tested at 375px width remained strictly within the viewport. No horizontal scrollbar was triggered.
   - Text, containers, and card borders adapt responsively with padding `px-6` (or `px-4` on mobile).
2. **Responsive Grid Collapsing:**
   - On Desktop (1280px), the home page renders an editorial 3-column caged cluster with prominent lead image and sidebar cards.
   - On Tablet (768px), the layout neatly simplifies into a 2-column grid.
   - On Mobile (375px), it stacks into clean 1-column vertical card rows with thumbnail images on top or inline.
3. **Typography & Hierarchy:**
   - Playfair Display serif headlines look balanced and journalistic across all widths.
   - Article body prose (`max-w-prose`) maintains comfortable line length (~65–75 characters per line on desktop) and doesn't stretch across the entire screen width.
   - Letter-spacing on uppercase labels (`.label`, 11px uppercase) remains sharp and legible.
4. **Dark Palette Execution:**
   - Warm ash background (`#161614`) and muted surfaces (`#1e1e1b`) provide high readability without the harsh glare of pure white text on pitch black.
   - Card borders (`--rule: #322f29`) and accent gold (`#d4af4f`) remain distinct and elegant.
   - Skeletons on loading routes match the dark theme smoothly with gentle pulsing (`#1e1e1b`).
5. **Image Rendering:**
   - Aspect ratio boxes prevent layout shift during page hydration.
   - Hover zoom effect (`transform: scale(1.03)`) operates smoothly inside `overflow-hidden` containers on desktop without jitter.
   - Next.js Blur LQIP placeholders display properly and transition seamlessly to full-resolution images.
6. **Error & 404 Pages:**
   - The 404 page ("Page not found") renders a centered, clean card with helpful navigation back to the front page and category links, matching the full editorial aesthetic.

---

## 5. Recommended Next Steps (For Owner Visual Sign-Off)

When the owner reviews UI changes:
1. **Utility Touch Targets:** Expand padding on `SiteHeader` controls (`ThemeToggle`, `TextSizeControl`, `Search`) to ensure comfortable 44×44px mobile tapping.
2. **Carousel Controls:** Increase `HeadlineCarousel` buttons from `size-7` (28px) to `size-10` or `size-11` (40–44px) so thumb interaction on phones is effortless.
3. **Mobile Category Bar:** Evaluate switching the mobile category link strip to a horizontal scrollable row to save vertical screen space above the fold.

---

Verified by me:
- Built and started local production build on `http://localhost:3100` (`gemini/overnight-briefs`).
- Systematically evaluated all 7 pages (Home, Article, Category, Topic, Author, Search, 404).
- Tested 3 distinct viewports: 375px (mobile), 768px (tablet), 1280px (desktop).
- Verified both Light and Dark color schemes across all viewports.
- Confirmed zero horizontal overflow across all pages and viewports.
- Measured exact touch target dimensions and identified 11 component-level ergonomic patterns.
- Did not commit screenshots or modify production code.

Not verified:
- Physical device testing on real hardware touchscreens (emulated via headless Chromium).
- Final visual sign-off from human owner.
