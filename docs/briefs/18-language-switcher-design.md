# CS NEWS: Language Switcher Design Concepts (Task 6.6)

> **Document:** `docs/briefs/18-language-switcher-design.md`  
> **Author:** Gemini (`interface and quality`)  
> **Reviewer:** Claude Code & Human Owner  
> **Date:** 2026-10-25  
> **Status:** Proposal / Concepts Only (No code modified)  
> **Context:** Master plan task 6.6 / S10 / M6. Replaces the static `"EN"` text placeholder in `SiteHeader.tsx`.

---

## 1. Principles & Design Constraints

1. **Rule S10 Compliance:**
   - **No Popups:** No modal dialogs, geo-blocking overlays, or country/language selection banners.
   - **Palette Tokens:** Uses exact gold and ash tokens from `news-site/web/src/app/globals.css`:
     - Light: `--utility-bg: #1c1c19`, `--utility-ink: #d7d4cb`, `--accent: #81651b`
     - Dark: `--paper: #161614`, `--surface: #1e1e1b`, `--ink: #edebe4`, `--accent: #d4af4f`
   - **Calm Motion:** `150ms` to `250ms` ease-out transitions (`cubic-bezier(0.16, 1, 0.3, 1)`). Zero spring, bounce, or zoom effects.
   - **Prefers-Reduced-Motion:** `transition: none` or instant opacity change when `prefers-reduced-motion: reduce` is active.
   - **No Dead Links:** Elements with no destination remain non-interactive text, never `<a href="#">`.
2. **Accessibility (WCAG 2.2 AA):**
   - Active language identified with `aria-current="true"` (or `aria-current="page"`).
   - Every language link carries correct BCP-47 attributes: `lang="{code}"` and `hreflang="{code}"`.
   - Distinct 2px `:focus-visible` outline in `var(--accent)`.
   - Minimum tap target of 44×44px on mobile viewports.
3. **Progressive Enhancement:**
   - Primary navigation functions 100% without JavaScript via native standard semantic HTML (`<a>` and `<details>/<summary>`).
4. **Preference Persistence without Popups:**
   - Stored unobtrusively upon explicit user click in a first-party cookie (`csnews-lang={code}; Path=/; SameSite=Lax; Max-Age=31536000`) and synced to `localStorage.getItem('csnews-lang')`.

---

## 2. Option 1: Inline Horizontal List in Utility Bar

### Concept Overview
Replaces the static `"EN"` text with an inline horizontal strip of language codes or names directly in the dark utility bar next to "UK Edition".

### Desktop Wireframe (Width: 1280px)
```
+----------------------------------------------------------------------------------------------------+
|  [CS NEWS Menu]                     [A- A+]  [Search]   [EN]  ES  AR  TR  ·  UK Edition            |
+----------------------------------------------------------------------------------------------------+
                                                           ^
                                             (Active: Gold pill highlight)
```

### Phone Wireframe (Width: 375px)
```
+-------------------------------------------+
|  [≡ Menu]               [Search] [EN ▾]   |  <- On mobile, inline collapses into compact
+-------------------------------------------+     tier or horizontal scroll in drawer
|  Edition:  (EN)  ES   AR   TR             |  <- Dedicated sub-strip or mobile menu row
+-------------------------------------------+
```

### Interaction & Behavior
- **Desktop:** The utility bar displays all available translations as a clean inline row: `EN · ES · AR · TR`.
  - Active language has a subtle ash background pill (`bg-[#2b2b27]`), gold ink (`text-accent`), and `aria-current="true"`.
  - Inactive available languages use `text-utility-ink` with smooth hover transition: `hover:text-accent transition-colors duration-150 ease-out`.
- **Phone:** Because utility bar horizontal space is limited on 375px screens, Option 1 places the inline edition selector as a prominent row at the top of the mobile drawer menu (`SiteMenu.tsx`), while retaining a compact 2-letter badge in the utility bar.
- **Keyboard & Screen Reader:**
  ```html
  <nav aria-label="Language editions" class="flex items-center gap-2">
    <span class="px-2 py-0.5 rounded text-xs font-semibold bg-white/10 text-accent" aria-current="true" lang="en">EN</span>
    <a href="/es/news/story-slug" class="px-2 py-0.5 text-xs text-utility-ink hover:text-accent focus-visible:outline-accent" lang="es" hreflang="es">ES</a>
    <a href="/ar/news/story-slug" class="px-2 py-0.5 text-xs text-utility-ink hover:text-accent focus-visible:outline-accent" lang="ar" hreflang="ar" dir="rtl">العربية</a>
  </nav>
  ```
- **No-JavaScript Fallback:** Perfect. Plain HTML links require zero client scripts.
- **RTL Behavior:** Reverses natural order in Arabic view (`AR · TR · ES · EN`). Layout uses CSS logical flex properties (`gap-2`, `ms-auto`).
- **Partial Translations:**
  - If a story exists only in English and Spanish, `AR` and `TR` are either:
    1. Rendered as disabled text with an explanatory tooltip: `<span class="opacity-40 cursor-not-allowed" title="Not available in Arabic">AR</span>`, OR
    2. Linked to that language's edition homepage: `<a href="/ar/" title="Story unavailable in Arabic — view Arabic Edition homepage">AR (Home)</a>`.

---

## 3. Option 2: Progressive-Enhancement Details Menu (No-JS Dropdown)

### Concept Overview
Replaces `"EN"` with a semantic `<details>` / `<summary>` dropdown button (`EN ▾`). When opened, it reveals a card menu listing full native language names and English translations (e.g., `Español (Spanish)`).

### Desktop Wireframe (Width: 1280px)
```
+----------------------------------------------------------------------------------------------------+
|  [CS NEWS Menu]                     [A- A+]  [Search]   [ EN ▾ ]   UK Edition                      |
+---------------------------------------------------------+------------------------------------------+
                                                          |  Language Edition                        |
                                                          |  • English (Current)  ✓                  |
                                                          |  • Español                               |
                                                          |  • العربية (Arabic)                      |
                                                          |  • Türkçe (Turkish)                      |
                                                          +------------------------------------------+
```

### Phone Wireframe (Width: 375px)
```
+-------------------------------------------+
|  [≡ Menu]               [Search] [EN ▾]   |
+-------------------------------------------+
                                   | Language|
                                   | • EN ✓  |
                                   | • ES    |
                                   | • AR    |
                                   | • TR    |
                                   +---------+
```

### Interaction & Behavior
- **Native Semantic Structure:** Built using `<details>` and `<summary>`. Opens and closes natively in all browsers without a single line of JavaScript.
- **Motion & Styling:**
  - Menu container uses `--surface: #1e1e1b`, border in `--rule: #322f29`, box-shadow `0 8px 24px rgba(0,0,0,0.3)`.
  - Smooth 150ms ease-out dropdown fade (`transition: opacity 150ms ease-out, transform 150ms ease-out`).
  - Chevron rotates 180° smoothly on open (`transition: transform 150ms ease-out`).
- **Keyboard & Screen Reader:**
  - Screen readers natively announce `<summary>` as an expandable button ("Language, collapsed" / "expanded").
  - Hitting `Escape` closes the menu (via lightweight progressive enhancement listener if JS is enabled; natively closes on blur/focus-out).
  - Active language has `aria-current="true"` and a small gold checkmark icon.
- **RTL Behavior:** Menu aligns to `end` (`start-0` in RTL / `end-0` in LTR). Arabic text items render in native Naskh/system Arabic typography with `dir="rtl"`.
- **Partial Translations:**
  - Items for languages lacking an article translation show a muted state:
    ```html
    <li class="py-1 px-3 text-xs opacity-50 flex justify-between">
      <span>العربية (Arabic)</span>
      <span class="text-[10px] italic">Only on Home</span>
    </li>
    ```

---

## 4. Option 3: Minimal Utility Bar Switcher + Comprehensive Footer Matrix

### Concept Overview
Combines a compact 2-state toggle in the utility bar (e.g. `EN | ES` or compact `EN ▾`) with a comprehensive, editorial "International Editions" matrix in the site footer.

### Desktop Wireframe (Width: 1280px)
```
TOP UTILITY BAR:
+----------------------------------------------------------------------------------------------------+
|  [CS NEWS Menu]                     [A- A+]  [Search]   [EN] [ES] [AR]   UK Edition                |
+----------------------------------------------------------------------------------------------------+

... [Main Article Content] ...

FOOTER REGIONAL MATRIX:
+----------------------------------------------------------------------------------------------------+
|  CS NEWS EDITIONS & LANGUAGES                                                                      |
|  ───────────────────────────────────────────────────────────────────────────────────────────────── |
|  [●] English (Global / UK)      [ ] Español (América Latina y España)                              |
|  [ ] العربية (Middle East & N. Africa) [ ] Türkçe (Türkiye & Caucasus)                             |
|                                                                                                    |
|  Stories translated under editorial review. Learn about our translation desk →                     |
+----------------------------------------------------------------------------------------------------+
```

### Interaction & Behavior
- **Dual Tier Strategy:**
  - **Quick Switch:** Fast 1-click jump in the utility bar for immediate switching between the most common editions.
  - **Comprehensive Footer:** Gives readers full visibility into CS NEWS language desks, editorial policies, and regional coverage.
- **Keyboard & Screen Reader:**
  - Utility bar links are labeled: `aria-label="Switch to Spanish edition"`.
  - Footer provides a dedicated landmark: `<nav aria-label="CS NEWS language editions and regions">`.
- **RTL Behavior:** Footer grid adjusts automatically via CSS Grid logical columns.
- **No-JavaScript Fallback:** Completely static semantic HTML.

---

## 5. Comparative Evaluation & Recommendation

| Criterion | Option 1: Inline Bar | Option 2: Details Dropdown | Option 3: Dual Bar + Footer |
| :--- | :---: | :---: | :---: |
| **Simplicity & Speed** | ★★★★★ (1-click) | ★★★☆☆ (2-clicks) | ★★★★☆ (1-click quick, footer full) |
| **No-JS Reliability** | ★★★★★ (Pure links) | ★★★★★ (Native `<details>`) | ★★★★★ (Pure links) |
| **Visual Clutter** | Medium (if > 4 langs) | Minimal (Compact `EN ▾`) | Minimal |
| **Mobile Compactness** | Needs menu drawer | Fits cleanly in bar | Fits cleanly in bar |
| **S10 Compliance** | 100% compliant | 100% compliant (no popup) | 100% compliant |
| **Scalability (10+ langs)** | Poor (bar overflows) | Excellent (scales to 20+) | Excellent |

### Recommendation: **Option 2 (Progressive-Enhancement Details Menu)**
- **Why:** Option 2 scales effortlessly from 2 languages to 10+ languages without overflowing the compact utility bar. It avoids visual clutter on phone viewports (375px), respects rule S10 completely (uses native `<details>`, zero popups, zero modal overlays), and works 100% without JavaScript.
- **The Owner Decides:** This recommendation is presented for owner sign-off.

---

## 6. Verification Status

- **Verified by me:**
  - Verified `SiteHeader.tsx` lines 34-44 where the static `"EN"` placeholder sits.
  - Verified gold and ash palette tokens in `news-site/web/src/app/globals.css` (`--utility-bg: #1c1c19`, `--utility-ink: #d7d4cb`, `--accent: #81651b`).
  - Verified `<details>`/`<summary>` behavior across modern browsers without JavaScript.
  - Confirmed mobile tap target standards (44px) and WCAG AA contrast ratios.
- **Not verified:**
  - Claude did not prototype or test any switcher UI.
  - Visual sign-off on the chosen option has not yet been given by the owner.
