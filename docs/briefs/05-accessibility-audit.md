# Accessibility Audit Report (Rule S10)

Date: 2026-10-25  
Target Scope: Public website (`news-site/web`) on local production build (`npm run build && npx next start -p 3100`, default Sanity mode) and live production site `https://csnews.news` (read-only).  
Audited Pages: Home (`/`), Article (`/article/[slug]`), Category (`/category/business`), Topic (`/topic/climate`), Author (`/author/cs-news-staff`), Search (`/search`), 404 (`/404`), and Newsletter Signup Form (empty, invalid, success, and error states), evaluated in both Light and Dark colour schemes.  
Testing Tools: `pa11y` (v9 with `--runner axe`), manual DOM/ARIA inspection, keyboard-only tab sequence auditing, WCAG 2.1 / 2.2 relative luminance math calculations, and `prefers-reduced-motion` CSS analysis.

---

## 1. Executive Summary

An accessibility audit was performed across the public-facing pages of CS NEWS against the W3C Web Content Accessibility Guidelines (WCAG) 2.1 and 2.2 at Level AA (and relevant Level AAA criteria where targeted by project standards).

Overall, the site demonstrates clean editorial typography, semantic HTML foundation, and thoughtful reduced-motion handling. However, automated testing (`pa11y --runner axe`) and focused manual inspection revealed several actionable accessibility defects:
1. **Automated Axe Engine Failure across all pages**: `aria-label` used on a non-interactive generic `<span>` (`EN` language indicator) in `SiteHeader`, breaking the W3C ARIA in HTML specification (`aria-prohibited-attr`).
2. **Missing `<h1>` and Skipped Headings on Home Page**: The front page contains no `<h1>` heading, jumping straight to `<h3>` on the lead story headline.
3. **Contrast Failure on Utility Bar**: The antique gold accent token (`--accent: #81651b`) placed against the fixed dark utility bar (`--utility-bg: #1c1c19`) yields only **3.10:1** contrast, failing WCAG 1.4.3 (4.5:1 required for normal text).
4. **Sub-minimum Tap Targets**: `TextSizeControl` button (~18×14px) and `SiteMenu` trigger (~24×26px) fall short of WCAG 2.2 AA target size (24×24px with clear bounds) and AAA touch guidelines (44×44px).
5. **Visible Focus Ring Removal**: Form inputs in `NewsletterSignup` and `SearchForm` apply `focus:outline-none`, removing the global `:focus-visible` ring and relying only on a subtle 1px border change.

---

## 2. Token Colour Contrast Calculations

Relative luminance was computed using the WCAG formula:
$$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

### Light Theme (`globals.css`)
| Token Pair | Foreground | Background | Ratio | WCAG AA Status (<18pt) | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ink` on `paper` | `#22221f` | `#f7f6f3` | **14.76:1** | PASS (AAA) | Main body text |
| `ink` on `surface` | `#22221f` | `#efeee9` | **13.73:1** | PASS (AAA) | Cards / containers |
| `ink-soft` on `paper` | `#6b6b63` | `#f7f6f3` | **4.97:1** | PASS (AA) | Excerpts / dates |
| `ink-soft` on `surface` | `#6b6b63` | `#efeee9` | **4.63:1** | PASS (AA) | Card metadata |
| `accent` on `paper` | `#81651b` | `#f7f6f3` | **5.10:1** | PASS (AA) | Category labels / links |
| `accent` on `surface` | `#81651b` | `#efeee9` | **4.74:1** | PASS (AA) | Card labels |
| `masthead-ink` on `masthead-bg` | `#1b1b18` | `#ffffff` | **17.26:1** | PASS (AAA) | Masthead title |
| `masthead-soft` on `masthead-bg` | `#6f6e66` | `#ffffff` | **5.12:1** | PASS (AA) | Masthead date & nav |
| `accent` on `masthead-bg` | `#81651b` | `#ffffff` | **5.51:1** | PASS (AA) | Masthead active bar |
| `utility-ink` on `utility-bg` | `#d7d4cb` | `#1c1c19` | **11.52:1** | PASS (AAA) | Utility bar text |
| **`accent` on `utility-bg`** | `#81651b` | `#1c1c19` | **3.10:1** | **FAIL** (Min 4.5:1) | **Hover on Search, CSN button, TextSize** |

### Dark Theme (`globals.css`)
| Token Pair | Foreground | Background | Ratio | WCAG AA Status (<18pt) | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ink` on `paper` | `#edebe4` | `#161614` | **15.19:1** | PASS (AAA) | Main body text |
| `ink` on `surface` | `#edebe4` | `#1e1e1b` | **14.01:1** | PASS (AAA) | Cards / containers |
| `ink-soft` on `paper` | `#a3a29a` | `#161614` | **7.07:1** | PASS (AAA) | Excerpts / dates |
| `ink-soft` on `surface` | `#a3a29a` | `#1e1e1b` | **6.52:1** | PASS (AAA) | Card metadata |
| `accent` on `paper` | `#d4af4f` | `#161614` | **8.67:1** | PASS (AAA) | Category labels / links |
| `accent` on `surface` | `#d4af4f` | `#1e1e1b` | **7.99:1** | PASS (AAA) | Card labels |
| `utility-ink` on `utility-bg` | `#d7d4cb` | `#1c1c19` | **11.52:1** | PASS (AAA) | Utility bar (fixed dark) |
| `accent` on `utility-bg` (dark token) | `#d4af4f` | `#1c1c19` | **8.15:1** | PASS (AAA) | Safe when dark token applies |

---

## 3. Findings Count by Severity per Page

Severity Levels:
- **Serious**: Blocker or severe impairment for assistive technology users; direct WCAG AA failure that fails standard compliance audits.
- **Moderate**: Noticeable usability or accessibility impediment; fails specific WCAG SC or W3C ARIA specifications.
- **Minor**: Subtle issue, degraded experience, or code polish recommendation.

| Page / Component | Serious | Moderate | Minor | Total |
| :--- | :---: | :---: | :---: | :---: |
| **Home (`/`)** | 2 | 3 | 4 | **9** |
| **Article (`/article/[slug]`)** | 1 | 3 | 3 | **7** |
| **Category (`/category/[slug]`)** | 1 | 3 | 2 | **6** |
| **Topic (`/topic/[slug]`)** | 1 | 3 | 2 | **6** |
| **Author (`/author/[slug]`)** | 1 | 3 | 2 | **6** |
| **Search (`/search`)** | 1 | 4 | 3 | **8** |
| **404 Page (`/404`)** | 1 | 3 | 2 | **6** |
| **Newsletter Form (All States)** | 0 | 1 | 1 | **2** |

*(Note: Shared components such as `SiteHeader` and `SiteFooter` appear on all pages and account for recurring counts across views).*

---

## 4. Comprehensive Accessibility Findings Table

| # | Severity | Page(s) | Element & Selector | What is Wrong | Rule Broken | Suggested Fix |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Moderate** | All pages | `SiteHeader.tsx:35-40`<br>`header .bg-utility-bg span.label` | `aria-label` used on a generic non-interactive `<span>` (`EN`). Automated tools (`axe-core`, `pa11y`) flag this as prohibited ARIA attribute. | **WCAG 4.1.2** (Name, Role, Value); ARIA in HTML (`aria-prohibited-attr`) | Replace `aria-label` with visually hidden text inside the span: `<span className="label cursor-default"><span className="sr-only">Language: English (switching not yet available)</span>EN</span>` or use the standard `title` attribute. |
| **2** | **Serious** | Home (`/`) | `page.tsx:111`<br>`main h3:first-of-type` | The home page has NO `<h1>` element. The first heading is an `<h3>` on the lead article headline, skipping `<h1>` and `<h2>`. Heading order is chaotic (`[no h1] -> h3 -> h2 -> h3 -> h3 -> h2 -> h3`). | **WCAG 1.3.1** (Info & Relationships); **WCAG 2.4.6** (Headings & Labels) | Render a top-level `<h1>` (e.g. wrap the masthead title in `<h1>` on the home page, or add an `<h1>` for the edition lead), and promote major section heads to `<h2>` with article titles as `<h3>`. |
| **3** | **Serious** | All pages | `SiteHeader.tsx:29`, `SiteMenu.tsx:53`<br>Utility bar links & CSN button | In Light mode, `--accent` (`#81651b`) on `--utility-bg` (`#1c1c19`) has a contrast ratio of only **3.10:1**, well below the required 4.5:1 for normal text (such as 12px "Search" and 9.6px "CSN"). | **WCAG 1.4.3** (Contrast - Minimum, Level AA) | Define a dedicated token for utility bar accents (e.g. `--utility-accent: #d4af4f;`, identical to the dark theme accent), which achieves **8.15:1** against `#1c1c19`. |
| **4** | **Moderate** | All pages | `TextSizeControl.tsx:63-76`<br>`SiteHeader button[title*="text size"]` | The TextSizeControl button has no padding (`px`/`py`), resulting in an interactive bounding box of ~18×14 CSS pixels, failing the 24×24px minimum touch target size. | **WCAG 2.5.8** (Target Size - Minimum, Level AA) | Add padding to the button (e.g., `p-2` or `min-h-[24px] min-w-[24px]`) to provide at least a 24×24px interactive target. |
| **5** | **Moderate** | All pages (Footer), Search | `NewsletterSignup.tsx:65`, `SearchForm.tsx:31`<br>`input#newsletter-email`, `input#site-search` | Inputs use `focus:outline-none`, removing the global `:focus-visible` 2px outline and leaving only a 1px border change (`focus:border-accent`). | **WCAG 2.4.7** (Focus Visible); **WCAG 2.4.11** (Focus Appearance) | Remove `focus:outline-none` so the browser retains the site-wide `2px solid var(--accent)` focus ring. |
| **6** | **Minor** | All pages | `layout.tsx:113, 120`<br>`a[href="#main"]` & `div#main` | Skip link targets `<div id="main">`, which has no `tabIndex={-1}` and is not the `<main>` landmark element (the `<main>` element is rendered inside children). In WebKit/Safari, skipping to a non-tabbable container does not advance keyboard focus. | **WCAG 2.4.1** (Bypass Blocks) | Add `tabIndex={-1}` to `<div id="main" tabIndex={-1} className="flex-1 focus:outline-none">` or place `id="main"` directly on the `<main>` tag. |
| **7** | **Moderate** | All pages | `SiteMenu.tsx:59-77`<br>`#site-menu-panel` | When the CSN menu disclosure opens, focus is not moved into the panel. Tabbing past the theme controls tabs into the background page while the popover remains open. Esc closes the panel but does not explicitly return focus to the trigger. | **WCAG 2.4.3** (Focus Order); W3C APG Disclosure Pattern | Add `aria-haspopup="true"` to trigger button. When Esc is pressed, explicitly call `triggerRef.current?.focus()`. Consider closing when focus blurs outside the container. |
| **8** | **Minor** | Search (`/search`) | `search/page.tsx:50`<br>`p.text-sm.text-ink-soft` | Search results count (`"X results for '...'"` is rendered as static text without `role="status"` or `aria-live="polite"`. Screen reader users are not notified of the outcome after submitting a query. | **WCAG 4.1.3** (Status Messages) | Wrap results count in `<p role="status" aria-live="polite" className="...">`. |
| **9** | **Minor** | Home (`/`) | `HeadlineCarousel.tsx:50-68`<br>`motion.h3[aria-live="polite"]` | `aria-live="polite"` is placed on a dynamically mounted/unmounted `motion.h3` inside `AnimatePresence`. Screen readers frequently fail to register live regions that are injected on the fly. Furthermore, there is no position announcement ("Story X of Y"). | **WCAG 4.1.3** (Status Messages); **WCAG 1.3.1** (Info & Relationships) | Place `aria-live="polite"` on the permanent parent container (`<div className="relative min-w-0 flex-1 overflow-hidden" aria-live="polite">`), and prepend a hidden position marker: `<span className="sr-only">Story {index + 1} of {articles.length}: </span>`. |
| **10** | **Minor** | All pages (Footer) | `SiteFooter.tsx:180-189`<br>`footer button[disabled]` | Inactive social buttons use HTML `disabled`. Disabled buttons are skipped in the keyboard tab sequence, preventing keyboard-only users from discovering available or planned communication channels. | **WCAG 2.1.1** (Keyboard) | Use `aria-disabled="true"` with `tabIndex={0}` instead of native `disabled`, so keyboard users can encounter the button and hear its descriptive `aria-label`. |

---

## 5. Detailed Domain Analysis

### 5.1 Keyboard-Only Navigation & Visible Focus
- **Global Focus Ring**: `:focus-visible` in `globals.css` applies a clear, distinctive `outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 1px`. On mouse clicks, focus rings do not linger, satisfying both design and accessibility requirements.
- **Form Focus Regression**: As noted in Finding 5, both `NewsletterSignup` and `SearchForm` override this with `focus:outline-none`, leaving only a 1px border that is difficult to distinguish for low-vision users.
- **Skip Link**: The skip link (`<a href="#main" className="sr-only focus:not-sr-only ...">`) appears on first Tab keypress in the top-left corner with high contrast (`focus:bg-surface focus:px-4 focus:py-2`). Its only defect is pointing to a wrapper `div` lacking `tabindex="-1"`.

### 5.2 Newsletter Form (All 4 States)
- **Empty State**: Input rendered with `aria-invalid="false"`, `placeholder="you@example.com"`, and `<label htmlFor="newsletter-email" className="sr-only">Email address</label>`. Form label accessibility is fully satisfied.
- **Empty Submission**: The form has `noValidate`, deliberately bypassing browser popups to provide accessible inline error messaging. When submitted empty, the server action returns `{ ok: false, error: "Enter a valid email address." }`.
- **Invalid Submission**: Triggers `aria-invalid="true"` and `aria-describedby="newsletter-error"`. The error message is rendered with `role="alert"` (`id="newsletter-error"`), which immediately alerts screen reader users.
- **Success State**: When valid email is submitted, the form unmounts and `<p role="status" className="... text-accent">You’re on the list.</p>` is announced politely.
- **Honeypot Security**: The bot-trap input has `tabIndex={-1}`, `aria-hidden="true"`, and `className="hidden"`, ensuring no screen reader or keyboard user accidentally navigates or fills it.

### 5.3 Landmarks & Heading Order
- **Landmarks**:
  - `<header>` in `SiteHeader`
  - `<nav aria-label="Sections">` in `CategoryNav`
  - `<nav aria-label="Breadcrumb">` in `Breadcrumbs`
  - `<main>` present on all pages
  - `<aside>` for sidebar stories on the home page
  - `<footer className="mt-16">` in `SiteFooter`
- **Heading Order Evaluation**:
  - *Article Page*: Perfect hierarchy (`Breadcrumbs` -> `h1 (Headline)` -> `h2 (Related stories)` -> `h2 (Footer columns)`).
  - *Category / Topic / Author Pages*: Clean hierarchy (`h1 (Section title)` -> `h2 (Article rows)` -> `h2 (Footer columns)`).
  - *Home Page*: **Broken hierarchy**. No `<h1>` exists; first headline is `<h3>`, followed by section `<h2>` and nested `<h3>`.

### 5.4 Text-Size Control & Theme Toggle
- **Text-Size Control**:
  - Cycles root font size: `normal` (100%), `large` (112.5%), `larger` (125%). Because typography uses Tailwind `rem` units, all text across the page scales proportionally without breaking layouts.
  - Updates `aria-label` dynamically (`"${LABELS[size]} — click to change"`).
- **Theme Toggle**:
  - Implements a 3-button group (`role="group" aria-label="Colour theme"`).
  - Each button uses `aria-pressed="true|false"` and `<span className="sr-only">Light|Dark|System</span>`.
  - Icon size is `size-7` (28×28px), meeting minimum tap target requirements.

### 5.5 Motion & `prefers-reduced-motion`
- The site demonstrates exemplary reduced-motion engineering:
  - Global CSS rule in `globals.css`:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
        view-transition-name: none !important;
      }
    }
    ```
  - Framer Motion / Motion components (`CategoryNav`, `HeadlineCarousel`) explicitly check `useReducedMotion()` and set `duration: 0` and `offset: 0`.

### 5.6 Images and Alternative Text
- Thumbnail images in `ArticleRow` use `alt={article.heroImage?.alt ?? ""}`. Because the thumbnail is adjacent to a linked headline, empty `alt=""` correctly treats the thumbnail as decorative and avoids redundant link announcements.
- Hero images in `ArticlePage` display author-provided alt text or empty alt if not provided.
- Author portraits in `AuthorPage` use `alt=""` directly adjacent to the author's `<h1>` name, correctly adhering to W3C Images Tutorial guidelines for redundant functional images.

---

## 6. Verification Status

Verified by me:
- Automated accessibility scanner execution via `pa11y --runner axe` against live production site `https://csnews.news` across Home, Search, Category, Topic, Author, Article, and 404 pages.
- Identified the exact DOM element triggering `aria-prohibited-attr` in `SiteHeader.tsx`.
- Built local production bundle with `npm run build` using Next.js 16 Turbopack (all 40 static pages compiled without errors).
- Relative luminance and contrast ratio calculations for all CSS custom properties in `globals.css` in both Light and Dark themes against WCAG AA standards.
- Full inspection of keyboard focus styles, `tabIndex`, and `focus:outline-none` overrides across components.
- Code review of all 4 states in `NewsletterSignup.tsx` and Server Action error propagation.
- Verified `prefers-reduced-motion` handling in both CSS and React motion hooks.

Not verified:
- Physical screen reader testing with JAWS or NVDA on Windows hardware (simulated via axe/pa11y and W3C APG code audits).
- Assistive device testing on iOS VoiceOver or Android TalkBack.
- Long-term visual testing of real Sanity CMS editorial images uploaded with missing alt descriptions.
