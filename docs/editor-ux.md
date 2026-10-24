# CS NEWS: Editor Experience Proposal (Plan Task 1.12)

> **Document:** `docs/editor-ux.md`  
> **Author:** Gemini (`interface and quality`)  
> **Reviewer:** Claude Code & Human Owner  
> **Scope:** Proposed admin UI customizations for non-technical writers and editors (Payload CMS admin)  
> **Implementation Rule:** **Proposal only. No code changes yet.** Per AGENTS.md S10 and S11, the owner gives visual sign-off before any UI or admin theme is built.

---

## 1. Executive Summary

The default Payload CMS admin interface is developer-centric and highly capable, but out-of-the-box it presents database schemas directly (internal IDs, raw collection lists, generic CRUD action labels, and neutral gray styling). For journalists and non-technical staff joining CS NEWS, this interface introduces hesitation, fear of breaking live pages, and confusion over publishing status.

This proposal outlines a cohesive **Editor Experience (EX) layer** tailored for newsroom operations. It focuses on:
1. Intuitive editorial labels and guidance descriptions
2. Journalistic field ordering matching publishing hierarchy
3. CS NEWS publication branding using the settled **gold & ash tokens from `globals.css`** (AGENTS.md S10)
4. Unambiguous status indicators (Draft, In Review [Target Phase 1], Published, Scheduled)
5. Scoped navigation hiding administrative infrastructure from writers

Each proposed change is categorized with its justification (**Why**), implementation effort (**Effort**), operational risk (**Risk**), and implementation mechanism (**Config vs Code**).

---

## 2. Branding & Theme: Settled Tokens from `globals.css`

Per AGENTS.md rule **S10**, CS NEWS design tokens are settled and defined in `news-site/web/src/app/globals.css`. The admin interface must reuse these exact values:

### Exact Color Tokens (from `news-site/web/src/app/globals.css`)

```css
/* Light Theme */
--paper: #f7f6f3;
--surface: #efeee9;
--ink: #22221f;
--ink-soft: #6b6b63;
--accent: #81651b;        /* 5.10:1 on --paper, 4.74:1 on --surface: clears WCAG AA */
--rule: #dcdad2;

--utility-bg: #1c1c19;
--utility-ink: #d7d4cb;
--masthead-bg: #ffffff;
--masthead-ink: #1b1b18;
--masthead-soft: #6f6e66;
--masthead-rule: #e3e0d7;

/* Dark Theme */
--paper: #161614;
--surface: #1e1e1b;
--ink: #edebe4;
--ink-soft: #a3a29a;
--accent: #d4af4f;
--rule: #322f29;
```

- **Accessibility:** Text contrast clears **WCAG AA** across grounds (specifically calibrated for `--accent` on `--paper` and `--surface` per `globals.css`).
- **Motion:** 150–250ms ease-out (`--motion-ease: cubic-bezier(0.16, 1, 0.3, 1)`), zero bounce or spring.
- **Focus Rings:** Distinct 2px outline in `var(--accent)` with 2px offset (`:focus-visible`).

### Branding Proposals

| Item | Proposed Customization | Why | Effort | Risk | Type |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **B1. Admin Header & Masthead** | Replace generic Payload logo with CS NEWS SVG wordmark in gold (`var(--accent)`: `#81651b` light / `#d4af4f` dark), linking to live site (`https://csnews.news`). | Instills brand identity and reminds writers they are editing the live publication. | Low | Low | Config + CSS |
| **B2. Gold & Ash Theme Tokens** | Override default admin primary theme variables in `payload.config.ts` using the exact tokens from `globals.css`. | Harmonizes editorial workspace with public frontend identity. | Low | Low | CSS / Theme config |
| **B3. Custom Favicon & Page Title** | Set browser tab title to `CS NEWS Desk — Admin` and favicon to CS NEWS icon. | Prevents confusion when managing multiple browser tabs. | Low | Low | Config |

---

## 3. Navigation & Scoped Views: What to Hide from Writers

Writers should only see what is relevant to drafting content. Cluttering the sidebar with queue jobs, user directories, or system settings creates security risks and user friction.

| Collection / View | Proposed Rule for Writers | Why | Effort | Risk | Type |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **`payload-jobs`** | **Completely hide from sidebar for Writers.** Only visible to Admins. | Internal queue worker data (threat model T22). Writers do not need to inspect background cron tasks. | Low | Low | Config (`admin.hidden`) |
| **`users`** | **Hide user management collection from Writer sidebar.** Replace with a self-service "My Profile" link. | Writers cannot edit roles. *(Note: under current `Users.ts` rules, all authenticated staff can read the staff list for bylines and review. Hiding the admin collection reduces clutter while preserving author selection in articles.)* | Low | Low | Config (`admin.hidden`) |
| **`categories` & `topics`** | **Hide taxonomy management from Writer sidebar.** (Taxonomy selection in article editor remains read-only select). | In `Taxonomy.ts`, writes are **already restricted to editor/admin only**. Hiding these collections from the writer sidebar prevents clutter and attempts to create rogue tags. | Low | Low | Config (`admin.hidden`) |
| **Raw IDs & Timestamps** | Move `ID`, `createdAt`, `updatedAt` to a collapsed accordion labeled *"System Details"* in article sidebar. | Writers are confused by internal database IDs and system timestamps. | Low | Low | Config (`fields` group) |
| **Internal Revisions** | Present version history as a clean *"Draft History"* list showing *"Saved at [time]"*. | Prevents accidental confusion over draft versions. | Med | Low | Config / UI |

---

## 4. Field Organization & Editorial Flow

In a newsroom, articles are composed from the top down. The field order in `Articles.ts` should reflect this mental model:

### Recommended Field Order in Article Form

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Editorial Header (Headline & Standfirst)                │
│    • Headline (Large text, required)                        │
│    • Excerpt / Standfirst (1-2 sentences summarizing story) │
│    • Slug (Plain text; target auto-slug in Phase 1)         │
├─────────────────────────────────────────────────────────────┤
│ 2. Categorization & Metadata                                │
│    • Category (Required single select)                      │
│    • Topics (Multi-select tags: Climate, Housing, etc.)     │
│    • Author / Byline (Defaults to authenticated writer)     │
├─────────────────────────────────────────────────────────────┤
│ 3. Hero Media (Lead visual)                                 │
│    • Upload Image (Required alt text)                       │
│    • Built-in Visual Focal Point (0-100% coordinates)       │
│    • Caption (Optional visible caption)                     │
├─────────────────────────────────────────────────────────────┤
│ 4. Story Body (Rich Text - Lexical)                         │
│    • Clean WYSIWYG editor (H2, H3, bold, links, lists)      │
│    • In-line image blocks with required captions            │
├─────────────────────────────────────────────────────────────┤
│ 5. Editorial Controls (Sidebar / Bottom)                    │
│    • Status Badge (Draft / In Review [Target] / Published)  │
│    • Scheduled Date/Time (UK Time zone Europe/London)       │
│    • Corrections Log (Date + Note for post-publish fixes)   │
└─────────────────────────────────────────────────────────────┘
```

### Field Customization Breakdown

| Field | Editorial Customization | Why | Effort | Risk | Type |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Headline** | Display as prominent `h1`-styled input with character count indicator. | Encourages punchy news headlines that do not truncate on cards. | Low | Low | Config + CSS |
| **Excerpt (Standfirst)** | Keep existing `excerpt` (max 280 chars) above body with clear description: *"One or two sentences shown on cards, search results and social shares."* | Standard newsroom practice; separates lead deck from story body. | Low | Low | Config |
| **Slug Lock** | Target Phase 1: Auto-slug on creation; once saved, lock field with an *"Unlock to edit"* toggle. | Prevents accidental breakage of drafted URLs during headline refinement. | Med | Low | Custom UI / Hook |
| **Alt Text** | Keep required field in `Media.ts` with description: *"Describes the image for screen readers and when it fails to load."* | Ensures accessibility compliance without ambiguity. | Low | Low | Config (built) |
| **Visual Focal Point** | Verify Payload's built-in picker in UI first. Ensure crop preview targets our 16:9 sizes (`thumbnail` 400x225, `card` 768x432, `hero` 1600x900). | Non-technical writers need visual feedback on 16:9 crops without raw math. Custom component only if built-in picker is insufficient. | Med | Low | UI Verification / Component |
| **Body (Rich Text)** | Streamline Lexical toolbar: only Heading 2, Heading 3, Bold, Italic, Link, Blockquote, Bullet List, Numbered List. Disable raw HTML / code blocks. | Eliminates formatting anomalies and guarantees clean semantic output matching site typography. | Low | Low | Config |

---

## 5. Status Badges & Editorial Actions

The default single "Save" button confuses writers who fear accidental publishing. We propose distinct status pills and role-based action buttons:

### Visual Status Pills

| Status | Badge Appearance | Label in UI | Audience / Visibility | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Draft** | Ash background (`var(--surface)`), ink text | `Draft (Private)` | Author & Editors only | **Built** in Phase 0 |
| **In Review** | Amber background (`#d97706`), dark text | `In Review (Pending Desk)` | Waiting for Editor sign-off | **Target (Phase 1):** Depends on review-status field |
| **Scheduled** | Blue background (`#2563eb`), white text | `Scheduled (UK Time)` | Set for automated release | **Target UX:** Hide control from Writers (T22) |
| **Published** | Green background (`#16a34a`), white text | `Live on csnews.news` | Publicly indexed | **Built** in Phase 0 |
| **Unpublished** | Ash background (`#4b5563`), white text | `Unpublished (Offline)` | Taken down by Editor | **Built** in Phase 0 |

### Role-Specific Action Buttons

- **For Writers:**
  - `[ Save Draft ]` (Ash surface button) — saves changes without publishing.
  - `[ Submit for Review ]` (Gold accent button) — transitions status from Draft to In Review (Target Phase 1).
  - *No "Publish" or "Unpublish" buttons rendered in DOM.*
- **For Editors:**
  - `[ Save Draft ]` (Ash button)
  - `[ Schedule... ]` (Opens UK date/time picker)
  - `[ Publish to Live ]` (Green button with confirmation dialog)
  - `[ Unpublish ]` (Danger red button under overflow menu with required confirmation)

---

## 6. Implementation Roadmap (Task 1.12)

| Phase | Tasks Included | Mechanism | Dependencies |
| :---: | :--- | :--- | :--- |
| **Phase A (Config)** | • Reorder fields in `Articles.ts`<br>• Update field labels & placeholder descriptions<br>• Hide `payload-jobs`, `users`, `categories`, and `topics` from Writer navigation sidebar | Pure config in collection definitions | None |
| **Phase B (Styling)** | • Inject CS NEWS Gold (`--accent`) & Ash CSS variables from `globals.css`<br>• Custom SVG logo in admin masthead<br>• Styled status pills (Draft, Published) | Custom CSS stylesheet injected via `payload.config.ts` | Owner visual sign-off |
| **Phase C (Phase 1 Features & Custom UI)** | • In Review workflow & status field (Claude Phase 1)<br>• Auto-slug generator with edit lock<br>• Verify or enhance 16:9 crop previews in focal point selector | React components & collection hooks | Phase A & B |

---

## 7. Owner Review & Sign-Off Checklist

Before any code or CSS is introduced into the CMS codebase:
- [ ] Visual sign-off on the Gold & Ash admin palette tokens from `globals.css`
- [ ] Approval of the proposed field order (Headline -> Excerpt -> Media -> Body -> Controls)
- [ ] Approval of role separation (Hiding `payload-jobs`, `users`, and taxonomy management from Writer sidebar)
- [ ] Approval of the "In Review" status workflow for Phase 1
