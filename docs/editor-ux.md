# CS NEWS: Editor Experience Proposal (Plan Task 1.12)

> **Document:** `docs/editor-ux.md`  
> **Author:** Gemini CLI (`interface and quality`)  
> **Reviewer:** Claude Code & Human Owner  
> **Scope:** Proposed admin UI customizations for non-technical writers and editors (Payload CMS admin)  
> **Implementation Rule:** **Proposal only. No code changes yet.** Per AGENTS.md S10 and S11, the owner gives visual sign-off before any UI or admin theme is built.

---

## 1. Executive Summary

The default Payload CMS admin interface is developer-centric and highly capable, but out-of-the-box it presents database schemas directly (internal IDs, raw collection lists, generic CRUD action labels, and neutral gray styling). For journalists and non-technical staff joining CS NEWS, this interface introduces hesitation, fear of breaking live pages, and confusion over publishing status.

This proposal outlines a cohesive **Editor Experience (EX) layer** tailored for newsroom operations. It focuses on:
1. Intuitive editorial labels and guidance descriptions
2. Journalistic field ordering matching publishing hierarchy
3. CS NEWS publication branding using the established **gold & ash** palette (AGENTS.md S10)
4. Unambiguous status indicators (Draft, In Review, Published, Scheduled)
5. Scoped permission views hiding database and background infrastructure from writers

Each proposed change is categorized with its justification (**Why**), implementation effort (**Effort**), operational risk (**Risk**), and implementation mechanism (**Config vs Code**).

---

## 2. Branding & Theme: CS NEWS Gold & Ash Palette

Per AGENTS.md rule **S10**, CS NEWS design tokens are settled and established:
- **Primary Brand Accent (Gold):** `#C5A059` / dark gold `#9E7D3B` (used for active tabs, focus rings, primary highlights)
- **Neutral Ash / Deep Charcoal:**
  - Background surface: `#121417` (dark mode) / `#F9F9FB` (light mode)
  - Card & sidebar surface: `#1A1D20` (dark) / `#FFFFFF` (light)
  - Text: High contrast `#F1F3F5` (dark) / `#1A1D20` (light)
  - Soft ink: `#8C929A`
- **Motion:** 150–250ms ease-out (`--motion-ease`), zero bounce or spring.
- **Accessibility:** WCAG AAA compliance on text contrast; distinct focus outlines for keyboard navigation.

### Branding Proposals

| Item | Proposed Customization | Why | Effort | Risk | Type |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **B1. Admin Header & Masthead** | Replace generic Payload logo with CS NEWS SVG wordmark in gold (`#C5A059`), with link to live site (`https://csnews.news`). | Instills brand identity and reminds writers they are editing the live publication. | Low | Low | Config + CSS |
| **B2. Gold Accent Color Tokens** | Override default admin primary theme colors in `payload.config.ts` (`admin.theme` / CSS variables) with CS NEWS Gold `#C5A059` and Ash borders. | Harmonizes editorial workspace with public frontend styling. | Low | Low | CSS / Theme config |
| **B3. Custom Favicon & Page Title** | Set browser tab title to `CS NEWS Desk — Admin` and favicon to CS NEWS icon. | Prevents confusion when managing multiple browser tabs. | Low | Low | Config |

---

## 3. Navigation & Scoped Views: What to Hide from Writers

Writers should only see what is relevant to drafting content. Cluttering the sidebar with queue jobs, user directories, or system settings creates security risks and user friction.

| Collection / View | Proposed Rule for Writers | Why | Effort | Risk | Type |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **`payload-jobs`** | **Completely hide from sidebar for Writers.** Only visible to Admins. | Internal queue worker data (threat model T22). Writers do not need to inspect background cron tasks. | Low | Low | Config (`admin.hidden`) |
| **`users`** | **Hide user management from Writers.** Replace with a self-service "My Profile" link. | Writers cannot edit roles or view colleagues' private account details. | Low | Low | Config (`admin.hidden`) |
| **`categories`** | **Read-only dropdown in article editor.** Hide collection management from Writers. | Taxonomy is managed by Senior Editors. Writers select existing categories rather than creating rogue tags. | Low | Low | Config (`access.create`) |
| **Raw IDs & Timestamps** | Move `ID`, `createdAt`, `updatedAt` to a collapsed accordion labeled *"System Details"* at bottom of sidebar. | Writers are confused by internal auto-increment or UUID values. | Low | Low | Config (`fields` group) |
| **Internal Revisions** | Simplify version history list into a clean *"Draft History"* list showing *"Saved at [time]"*. | Prevents accidental restores of broken states without editor approval. | Med | Low | Custom Component |

---

## 4. Field Organization & Editorial Flow

In a newsroom, articles are composed from the top down. The field order in `Articles.ts` should reflect this mental model:

### Recommended Field Order in Article Form

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Editorial Header (Headline & Standfirst)                │
│    • Headline (Large text, required)                        │
│    • Standfirst / Deck (1-2 sentences summarizing story)    │
│    • Slug (Auto-generated, locked after initial save)       │
├─────────────────────────────────────────────────────────────┤
│ 2. Categorization & Metadata                                │
│    • Category (Required single select)                      │
│    • Topics (Multi-select tags: Climate, Housing, etc.)     │
│    • Author / Byline (Defaults to authenticated writer)     │
├─────────────────────────────────────────────────────────────┤
│ 3. Hero Media (Lead visual)                                 │
│    • Upload Image                                           │
│    • Alt Text (Mandatory accessibility description)         │
│    • Visual Focal Point selector (Interactive thumbnail)   │
│    • Caption & Credit                                       │
├─────────────────────────────────────────────────────────────┤
│ 4. Story Body (Rich Text - Lexical)                         │
│    • Clean WYSIWYG editor (H2, H3, bold, links, lists)      │
│    • In-line image blocks with required captions            │
├─────────────────────────────────────────────────────────────┤
│ 5. Editorial Controls (Sidebar / Bottom)                    │
│    • Status Badge (Draft / In Review / Scheduled / Published)│
│    • Scheduled Date/Time (UK Time zone Europe/London)       │
│    • Corrections Log (Date + Note for post-publish fixes)   │
└─────────────────────────────────────────────────────────────┘
```

### Field Customization Breakdown

| Field | Editorial Customization | Why | Effort | Risk | Type |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Headline** | Display as `h1`-sized input with character count indicator (recommended 60–90 chars). | Encourages tight, punchy news headlines that do not truncate on social cards. | Low | Low | Config + CSS |
| **Standfirst (Deck)** | Add prominent textarea above the body with description: *"A brief 1-2 sentence lead paragraph shown under the headline on index cards and article headers."* | Standard newsroom practice; separates summary from article body. | Low | Low | Config |
| **Slug Lock** | Auto-slug on creation; once saved as draft, lock the field with an *"Unlock to edit slug"* toggle and warning: *"Changing slugs breaks external links."* | Prevents accidental breakage of drafted URLs during headline refinement. | Med | Low | Custom UI / Hook |
| **Alt Text** | Mark required with helpful placeholder: *"Describe what is in this photo for visually impaired readers."* | Ensures editorial accessibility compliance without ambiguity. | Low | Low | Config |
| **Visual Focal Point** | Interactive clickable crop box replacing raw `{ x, y }` float inputs. Previews 16:9, 1:1, 21:9 aspect ratios. | Non-technical writers cannot calculate decimal focal coordinates (`0.45, 0.72`). | Med | Low | Custom Component |
| **Body (Rich Text)** | Streamline Lexical toolbar: only Heading 2, Heading 3, Bold, Italic, Link, Blockquote, Bullet List, Numbered List. Disable raw HTML / script blocks. | Eliminates formatting anomalies and guarantees clean semantic output matching site typography. | Low | Low | Config |

---

## 5. Status Badges & Editorial Actions

The default single "Save" button confuses writers who fear accidental publishing. We propose distinct status pills and role-based action buttons:

### Visual Status Pills

| Status | Badge Appearance | Label in UI | Audience / Visibility |
| :--- | :--- | :--- | :--- |
| **Draft** | Gray outline / neutral text | `Draft (Private)` | Author & Editors only |
| **In Review** | Amber background (`#D97706`), dark text | `In Review (Pending Desk)` | Waiting for Editor sign-off |
| **Scheduled** | Blue background (`#2563EB`), white text | `Scheduled (UK Time)` | Set for automated release |
| **Published** | Green background (`#16A34A`), white text | `Live on csnews.news` | Publicly indexed |
| **Archived / Offline** | Ash background (`#4B5563`), white text | `Unpublished (Offline)` | Taken down by Editor |

### Role-Specific Action Buttons

- **For Writers:**
  - `[ Save Draft ]` (Secondary ash button) — saves changes without notifying desk.
  - `[ Submit for Review ]` (Primary gold button) — transitions status from Draft to In Review.
  - *No "Publish" or "Unpublish" buttons rendered in DOM.*
- **For Editors:**
  - `[ Save Draft ]` (Secondary button)
  - `[ Schedule... ]` (Opens UK date/time picker)
  - `[ Publish to Live ]` (Primary green button with confirmation)
  - `[ Unpublish ]` (Danger red button under overflow menu with required confirmation)

---

## 6. Implementation Roadmap (Task 1.12)

| Phase | Tasks Included | Mechanism | Dependencies |
| :---: | :--- | :--- | :--- |
| **Phase A (Config)** | • Reorder fields in `Articles.ts`<br>• Update field labels & placeholder descriptions<br>• Hide `payload-jobs` and `users` from Writer navigation<br>• Enforce required `alt` text in `Media.ts` | Pure config (zero custom code) | None |
| **Phase B (Styling)** | • Inject CS NEWS Gold (`#C5A059`) & Ash CSS variables<br>• Custom SVG logo in admin masthead<br>• Styled status pills (Draft, In Review, Published) | Custom CSS stylesheet injected via `payload.config.ts` | Owner visual sign-off |
| **Phase C (Custom Components)** | • Visual Focal Point picker with aspect ratio preview<br>• Slug lock/unlock widget with sanitization check<br>• Clear "Submit for Review" action button wrapper | React client components in `cms/src/components/admin/` | Phase A & B |

---

## 7. Owner Review & Sign-Off Checklist

Before any code or CSS is introduced into the CMS codebase:
- [ ] Visual sign-off on the Gold & Ash admin palette mockups
- [ ] Approval of the proposed field order (Headline -> Standfirst -> Media -> Body -> Controls)
- [ ] Approval of role separation (Writer cannot see `payload-jobs` or raw user lists)
- [ ] Approval of status badge terminology (`In Review` vs `Published`)
