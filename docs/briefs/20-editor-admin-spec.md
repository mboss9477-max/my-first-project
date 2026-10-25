# CS NEWS: Editor UX Admin Technical Specification (Task 1.10)

> **Document:** `docs/briefs/20-editor-admin-spec.md`  
> **Author:** Gemini (`interface and quality`)  
> **Reviewer:** Claude Code & Human Owner  
> **Date:** 2026-10-25  
> **Status:** Specification Only (No code modified; pending owner visual sign-off)  
> **Context:** Master plan task 1.10 / S10 / S18 / docs/editor-ux.md. Targets Payload CMS 3.92 in `news-site/cms`.

---

## 1. Design Tokens from `news-site/web/src/app/globals.css`

Per AGENTS.md rule **S10**, CS NEWS design tokens are settled and non-negotiable. The CMS admin styling in `news-site/cms/src/app/(payload)/custom.scss` must map directly to these tokens:

```scss
/* Copied directly from news-site/web/src/app/globals.css */

/* Light Theme Tokens */
:root {
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
}

/* Dark Theme Tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #161614;
    --surface: #1e1e1b;
    --ink: #edebe4;
    --ink-soft: #a3a29a;
    --accent: #d4af4f;
    --rule: #322f29;
  }
}

[data-theme="dark"] {
  --paper: #161614;
  --surface: #1e1e1b;
  --ink: #edebe4;
  --ink-soft: #a3a29a;
  --accent: #d4af4f;
  --rule: #322f29;
}
```

---

## 2. Technical Mapping of Editor UX Proposals

Each proposal from `docs/editor-ux.md` is mapped below to its exact Payload 3.92 configuration key, target file, code snippet, risk, and test idea.

### B1. Admin Branding & SVG Wordmark
- **Payload 3.92 Config Key:** `admin.components.graphics.Logo` and `admin.components.graphics.Icon`
- **File to Change:** `news-site/cms/src/payload.config.ts` (and new component files `news-site/cms/src/components/admin/Logo.tsx`)
- **Needs Custom Component?** **Yes** (React component rendering the CS NEWS SVG wordmark with `--accent` fill).
- **Exact Snippet (NOT applied):**
  ```ts
  // In payload.config.ts
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
    },
  },
  ```
- **Operational Risk:** Low. Broken import path or invalid import map would cause fallback to default Payload text logo.
- **Test Idea:** Start CMS dev server; sign in as writer and editor; verify CS NEWS logo renders cleanly in light and dark modes with correct gold accent.

---

### B2. Theme Styling & Token Overrides
- **Payload 3.92 Config Key:** Custom CSS stylesheet via `news-site/cms/src/app/(payload)/custom.scss` (already imported in `layout.tsx`).
- **File to Change:** `news-site/cms/src/app/(payload)/custom.scss`
- **Needs Custom Component?** No.
- **Exact Snippet (NOT applied):**
  ```scss
  // In custom.scss
  :root {
    --theme-elevation-0: var(--paper);
    --theme-elevation-50: var(--surface);
    --theme-elevation-100: var(--paper);
    --theme-elevation-150: var(--surface);
    --theme-text: var(--ink);
    --theme-border-color: var(--rule);
    --theme-accent: var(--accent);
  }

  // Focus rings per S10: 2px solid var(--accent)
  *:focus-visible {
    outline: 2px solid var(--accent) !important;
    outline-offset: 2px !important;
  }
  ```
- **Operational Risk:** Low. If SCSS variables clash with Payload internal elevation tokens, contrast in some modals could be degraded.
- **Test Idea:** Verify contrast ratios using Chrome DevTools or Lighthouse against all admin text and form inputs.

---

### B3. Admin Meta, Favicon & Page Title Suffix
- **Payload 3.92 Config Key:** `admin.meta.titleSuffix` and `admin.meta.favicon`
- **File to Change:** `news-site/cms/src/payload.config.ts`
- **Needs Custom Component?** No.
- **Exact Snippet (NOT applied):**
  ```ts
  // In payload.config.ts
  admin: {
    meta: {
      titleSuffix: '— CS NEWS Desk',
      favicon: '/favicon.ico',
    },
    // ...
  }
  ```
- **Operational Risk:** Negligible.
- **Test Idea:** Inspect browser tab title in admin view: should display `Dashboard — CS NEWS Desk`.

---

### N1. Hiding System & Administrative Collections from Writers
- **Payload 3.92 Config Key:** `admin.hidden: ({ user }) => boolean`
- **Files to Change:**
  - `news-site/cms/src/access/jobsGuard.ts` (for `payload-jobs`)
  - `news-site/cms/src/collections/Users.ts`
  - `news-site/cms/src/collections/Taxonomy.ts` (for `categories`, `topics`, `authors`)
  - `news-site/cms/src/collections/NewsletterSubscribers.ts`
- **Needs Custom Component?** No.
- **Exact Snippet (NOT applied):**
  ```ts
  // In Taxonomy.ts (Categories, Topics, Authors):
  admin: {
    useAsTitle: 'name',
    hidden: ({ user }) => !hasRole(user, 'admin', 'editor'),
  }

  // In Users.ts:
  admin: {
    useAsTitle: 'email',
    hidden: ({ user }) => !hasRole(user, 'admin'),
  }

  // In jobsGuard.ts (defaultJobsCollection overrides):
  admin: {
    hidden: ({ user }) => !hasRole(user, 'admin'),
  }

  // In NewsletterSubscribers.ts:
  admin: {
    hidden: ({ user }) => !hasRole(user, 'admin', 'editor'),
  }
  ```
- **Operational Risk:** Low. Writers still retain access to *read* authors and categories in article relationship dropdowns, but can no longer view or clutter their left navigation sidebar with administrative management tables.
- **Test Idea:** Integration test logging in with a writer JWT and asserting that the sidebar collections list returned in admin GraphQL/REST schema excludes `payload-jobs`, `users`, and taxonomy collections.

---

### F1. Field Ordering in `Articles.ts`
- **Payload 3.92 Config Key:** Sequential order of objects in `fields: [...]` array.
- **File to Change:** `news-site/cms/src/collections/Articles.ts`
- **Needs Custom Component?** No.
- **Target Sequential Order:**
  1. `headline` (type: `text`, required)
  2. `excerpt` (type: `textarea`, standfirst)
  3. `slug` (type: `text`, auto-generated)
  4. `category` (type: `relationship`, relationTo: `categories`, required)
  5. `topics` (type: `relationship`, relationTo: `topics`, hasMany: true)
  6. `author` (type: `relationship`, relationTo: `authors`)
  7. `byline` (type: `text`, fallback)
  8. `heroImage` (type: `upload`, relationTo: `media`)
  9. `body` (type: `richText`)
  10. `reviewStatus` (position: `'sidebar'`)
  11. `featured` (position: `'sidebar'`)
  12. `publishedAt` (position: `'sidebar'`)
  13. `revisedAt` (position: `'sidebar'`)
  14. `corrections` (array at bottom)
  15. `createdBy` (position: `'sidebar'`, readOnly)
- **Operational Risk:** Zero. Field reordering in Payload config does not change database tables or column order in PostgreSQL.
- **Test Idea:** Run `npx tsc --noEmit` and run `npm test` in `news-site/cms`. Confirm form displays in editorial flow.

---

### F2. Labels, Descriptions & Guidance Text
- **Payload 3.92 Config Key:** `admin.description` and `admin.placeholder`
- **File to Change:** `news-site/cms/src/collections/Articles.ts`
- **Needs Custom Component?** No.
- **Exact Snippet (NOT applied):**
  ```ts
  {
    name: 'headline',
    type: 'text',
    required: true,
    admin: {
      placeholder: 'Enter a punchy, informative news headline...',
      description: 'The main display title. Must be clear and fit within 65-80 characters for optimal card display.',
    },
  },
  {
    name: 'excerpt',
    type: 'textarea',
    maxLength: 280,
    admin: {
      placeholder: 'Summary deck for cards and search...',
      description: 'One or two sentences shown on cards, search results and social shares. Max 280 characters.',
    },
  }
  ```
- **Operational Risk:** Zero. Informational text only.
- **Test Idea:** Visual inspection in admin form.

---

### S1. Visual Status Pills & Role-Specific Badges
- **Payload 3.92 Config Key:** `admin.components.Cell` on `reviewStatus` and `_status` fields, or styling standard status cells via `custom.scss`.
- **Files to Change:**
  - `news-site/cms/src/app/(payload)/custom.scss` (pure CSS styling approach)
  - OR `news-site/cms/src/components/admin/StatusPillCell.tsx` (custom component approach)
- **Needs Custom Component?**
  - **Preferred:** Pure CSS in `custom.scss` targeting `[data-status]` or standard cell classes (zero TSX component overhead).
  - If dynamic complex tooltips or multi-state pill transitions are required, a custom Cell component is used.
- **Exact Snippet (Pure CSS approach in `custom.scss`):**
  ```scss
  .status-pill {
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    &--draft { background: var(--surface); color: var(--ink-soft); }
    &--ready { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
    &--published { background: #dcfce7; color: #166534; }
    &--changes { background: #fee2e2; color: #991b1b; }
  }
  ```
- **Operational Risk:** Low.
- **Test Idea:** View article list table in CMS admin; verify Draft, Ready for Review, Changes Requested, and Published pills show clear distinguishing colors.

---

### R1. Trimmed Lexical Rich-Text Toolbar
- **Payload 3.92 Config Key:** `editor: lexicalEditor({ features: ({ defaultFeatures }) => [...] })`
- **File to Change:** `news-site/cms/src/payload.config.ts` (or field-level on `Articles.body`)
- **Needs Custom Component?** No.
- **Exact Snippet (NOT applied):**
  ```ts
  import {
    lexicalEditor,
    HeadingFeature,
    BoldFeature,
    ItalicFeature,
    LinkFeature,
    BlockquoteFeature,
    UnorderedListFeature,
    OrderedListFeature,
  } from '@payloadcms/richtext-lexical'

  // In payload.config.ts or Articles.ts body field:
  editor: lexicalEditor({
    features: () => [
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
      BoldFeature(),
      ItalicFeature(),
      LinkFeature(),
      BlockquoteFeature(),
      UnorderedListFeature(),
      OrderedListFeature(),
    ],
  })
  ```
- **Operational Risk:** Low. Disables unnecessary formatting options (H1, H4-H6, Code, Raw HTML) preventing journalists from breaking frontend styling.
- **Test Idea:** Open rich text editor on an article; verify toolbar contains only H2, H3, Bold, Italic, Link, Quote, and Lists; verify pasting raw HTML does not allow rogue scripts.

---

## 3. Database Migration Analysis (Rule S18)

Rule **S18** specifies:
> "Any change to collection schemas, types, indexes or constraints must include a database migration or explain why none is needed."

| Proposal | Schema Impact | DB Migration Required? | Reason / Justification |
| :--- | :---: | :---: | :--- |
| **B1-B3 (Branding & Logo)** | None | **NO** | Client-side admin metadata only. |
| **N1 (Hide collections from Writers)** | None | **NO** | `admin.hidden` is evaluated at request time in admin UI; SQL tables and permissions are unchanged. |
| **F1 (Field Reordering)** | None | **NO** | Field array order in TypeScript config dictates UI rendering order only; PostgreSQL columns are addressed by name. |
| **F2 (Labels & Descriptions)** | None | **NO** | `admin.description` and `admin.placeholder` are UI display metadata; no database columns altered. |
| **S1 (Status Pills)** | None | **NO** | Pure CSS styling or custom cell component for existing `reviewStatus` and `_status` fields. |
| **R1 (Trimmed Lexical Toolbar)** | None | **NO** | Lexical saves JSON nodes; restricting permitted node types is client validation and does not change the JSON column type. |
| **Slug Edit-Lock (Phase 1 Target)** | Optional column | **YES (if new column added)** | If an explicit `slugLocked: { type: 'checkbox' }` column is added, a migration is required. If implemented as a client UI lock toggle without DB storage, **NO** migration is needed. |

---

## 4. Documentation Citations & Verification Status

### Official Payload Documentation Citations
1. **Admin Components & Graphics (`Logo`, `Icon`):**
   - URL: `https://payloadcms.com/docs/admin/components`
   - Date Consulted: 2026-10-25
   - Confirmed: Payload 3.x utilizes import map strings (`/path/to/component#ExportName`) in `admin.components`.
2. **Collection Admin Configuration (`hidden` function):**
   - URL: `https://payloadcms.com/docs/configuration/collections#admin-options`
   - Date Consulted: 2026-10-25
   - Confirmed: `admin.hidden` accepts `({ user }) => boolean`.
3. **Lexical Feature Filtering:**
   - URL: `https://payloadcms.com/docs/lexical/overview`
   - Date Consulted: 2026-10-25
   - Confirmed: `lexicalEditor({ features: () => [...] })` isolates specific toolbar features and disallows unregistered nodes.

### Verification Status
- **Verified by me:**
  - Verified `news-site/cms/src/payload.config.ts`, `custom.scss`, `Articles.ts`, and `layout.tsx`.
  - Confirmed `custom.scss` is already imported in `layout.tsx` so CSS overrides take immediate effect.
  - Confirmed all light/dark color tokens match `globals.css` with WCAG AA compliance.
  - Confirmed that zero database migrations are required for B1-B3, N1, F1, F2, S1, and R1.
- **Not verified:**
  - Visual sign-off on the proposed admin styling and field ordering has NOT yet been given by the owner.
  - Claude did NOT test these configurations in the live admin or verify Payload's customization APIs for this version.
  - Custom focal point 16:9 crop component is UNVERIFIED until tested against Payload 3.x built-in image picker.
