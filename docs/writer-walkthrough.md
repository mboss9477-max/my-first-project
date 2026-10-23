# CS NEWS CMS: Non-Technical Writer Walkthrough & Acceptance Checklist

> **Plan Task:** P0.9  
> **Target System:** CS NEWS Payload CMS Admin (`http://localhost:3200/admin`)  
> **Audience:** Non-technical journalists, writers, copy editors, and editorial staff  
> **Status:** Revised per Peer Review (Ready for G1 Quality Gate)  

---

## 1. Overview and Operating Roles

In CS NEWS editorial workflows, access is divided into strict roles:
- **Writer:** Can draft articles, write copy, add headings/lists/links, upload images with alt text, set focal points, and save drafts. Writers **cannot** publish directly, cannot edit published articles, cannot unpublish live articles, and cannot alter colleagues' drafts or versions.
- **Editor / Admin:** Can review submitted drafts, schedule publication, publish articles to live, unpublish articles, manage categories/topics, and publish corrections on live articles.

Every step in this walkthrough represents an end-to-end task that an editorial user must execute. Each row identifies whether the capability is **Built** in Phase 0 or a **Target (not built yet)**, along with expected visual feedback and validation criteria (`PASS / FAIL`).

---

## 2. Step-by-Step Writer Walkthrough Checklist

| Step # | Task / Workflow Step | Role Allowed | State | What the User Should See | Verification (PASS / FAIL) | Notes & Edge Cases |
| :---: | :--- | :---: | :---: | :--- | :---: | :--- |
| **01** | **Sign in to CMS** | Writer / Editor | **Built** | Navigate to `http://localhost:3200/admin`. Clean login screen with Email and Password inputs. On submit, redirects directly to Dashboard showing accessible collections (`Articles`, `Media`). | [ ] PASS<br>[ ] FAIL | Invalid credentials display a clear, human-friendly error ("Invalid email or password"), never a technical stack trace. |
| **02** | **Create Article** | Writer / Editor | **Built** | Dashboard displays **Articles** in sidebar / main view. Click **"Create New"** or **"+"** next to Articles. Opens article editor with breadcrumbs: `Articles > Create New`. | [ ] PASS<br>[ ] FAIL | Writers see only collections they can create (`articles`, `media`). Taxonomy collections (`categories`, `topics`, `authors`) and `users` are restricted. |
| **03** | **Enter Headline & Set Slug** | Writer / Editor | **Target (Phase 1)** | Headline field prominently at top. Target: as headline is typed (e.g., `"UK Quantum Computing Breakthrough Announced"`), slug auto-populates (`"uk-quantum-computing-breakthrough-announced"`). | [ ] PASS<br>[ ] FAIL | **Not built yet (Claude, Phase 1):** Slug is currently a plain required text field. Target UX auto-generates slug from headline and locks it after initial save. |
| **04** | **Write Body Content (Rich Text)** | Writer / Editor | **Built** | Rich-text editor canvas (Lexical):<br>• **Headings:** Formats H2, H3 easily from toolbar/slash menu.<br>• **Bold / Italic:** Standard formatting toolbar buttons or `Ctrl+B`/`Ctrl+I`.<br>• **Links:** Highlight text -> Link button -> enter URL.<br>• **Lists:** Bulleted and numbered lists indent cleanly without raw code blocks. | [ ] PASS<br>[ ] FAIL | Writers are never exposed to raw HTML, markdown tags, or raw JSON AST blocks. |
| **05** | **Add Hero Image with Alt Text & Focal Point** | Writer / Editor | **Built** | Click **Hero Image** picker -> Choose "Upload New" or select from Media library.<br>• Upload photo (`.jpg`, `.webp`, `.png`, `.avif`).<br>• **Alt Text:** Required field labeled *"Alt text for screen readers"*. Upload refused if empty.<br>• **Focal Point:** Built-in Payload interactive picker stores percentage `{x: 0-100, y: 0-100}` to center cropping across our 16:9 sizes (`thumbnail` 400x225, `card` 768x432, `hero` 1600x900). | [ ] PASS<br>[ ] FAIL | Upload requires alt text. Built-in focal point selector controls 16:9 crops without manual float math. |
| **06** | **Autosave Indicator** | Writer / Editor | **Built** | As edits are made, Payload's autosave (configured at 2000 ms in `Articles.ts`) persists changes quietly in background. Status pill indicates saved state with timestamp. | [ ] PASS<br>[ ] FAIL | Reassures the writer that work is not lost if the tab closes. No jarring full-page reload on autosave. |
| **07** | **Save Draft Manually** | Writer / Editor | **Built** | **"Save Draft"** button remains accessible in the action bar. Clicking it saves current draft state without publishing. Status displays **Draft** badge. | [ ] PASS<br>[ ] FAIL | Creates a new version entry in version history without exposing the article to public feeds. |
| **08** | **Submit for Review** | Writer only *(or Editor)* | **Target (Design Decision)** | Target workflow: Writer changes article status to **"In Review"** (or clicks **"Submit for Review"**). Status badge changes to Amber/Yellow *"In Review"*. The **"Publish"** button is hidden/disabled for Writers. | [ ] PASS<br>[ ] FAIL | **Not built yet:** Payload currently has only `_status: 'draft' \| 'published'`. An "In Review" state requires a dedicated review status field and workflow (Phase 1). |
| **09** | **Editor Publishes Article** | **Editor / Admin Only** | **Built / Target Webhook** | Editor reviews article, verifies copy and compliance, and clicks **"Publish"**. Status badge turns Green *"Published"*. Live URL preview link appears. | [ ] PASS<br>[ ] FAIL | Editor publishing is built in CMS. The public site revalidation webhook (updating static frontend within 60 s) is **Plan Task 1.10 (not built yet)**. |
| **10** | **Schedule Publication** | **Editor / Admin Only** | **Partly Built / Target UX** | Editor selects **"Schedule"**, picks future UK Date & Time (`Europe/London`). Status shows *"Scheduled for [Date/Time]"*. | [ ] PASS<br>[ ] FAIL | Payload queues schedule in `payload-jobs`. Under current rules, a writer's scheduled job is refused when executed (`scheduling.int.spec.ts`). Target UX check: **A writer cannot see or use the schedule control** (mitigates threat model T22). |
| **11** | **Add a Correction on Published Article** | **Editor / Admin Only** | **Built** | In a published article, editor adds an entry in the **Corrections** array (`correctedAt` date, `note` explaining update). When re-saved, note attaches to foot of story. | [ ] PASS<br>[ ] FAIL | **Role rule:** Writers **cannot edit published articles** under CMS access rules (`updateArticles`). All corrections on live stories must be made by an Editor or Admin. |
| **12** | **Unpublish Article** | **Editor / Admin Only** | **Built** | Editor clicks **"Unpublish"** -> Prompts confirmation dialog. Status returns to *"Draft"*. | [ ] PASS<br>[ ] FAIL | **Security Boundary:** Writers have zero access to unpublish live articles (`updateArticles` prevents writer updates when `_status` is published). |
| **13** | **Sign Out** | Writer / Editor | **Built** | Click user avatar/profile in navigation -> **"Sign Out"**. Clears auth session and redirects safely back to `/admin/login`. | [ ] PASS<br>[ ] FAIL | Auth cookie is cleared. Back-button navigation cannot access draft content without re-authenticating. |

---

## 3. Expected Points of Confusion for Non-Technical Writers (With Concrete Proposals)

Based on editorial workflow patterns and headless CMS conventions, the following interface areas can introduce friction or confusion for non-technical journalists. Below are the identified issues and our concrete proposals for the Editor Experience layer (Plan Task 1.12):

### 1. Ambiguous Status Terminology & Action Buttons
* **The Confusion:** Standard headless CMS interfaces expose raw states (`_status: draft | published`) and generic "Save" buttons. Writers often fear that clicking "Save" will publish incomplete work directly to the live news site.
* **Proposal:**
  - Rename action buttons based on active role:
    - For Writers: Primary button is **"Save Draft"** with a secondary action **"Submit for Review"** (target Phase 1).
    - For Editors: Primary button is **"Publish Now"**, with a dropdown for **"Schedule for Later..."**.
  - Show a prominent, color-coded status badge at top:
    - ⚪ **Draft** (Neutral ash) - Only visible to author and editors
    - 🟡 **In Review** (Amber) - Submitted to desk (target Phase 1 design decision)
    - 🟢 **Published** (Green) - Live on `csnews.news`
    - 🔵 **Scheduled** (Blue) - Set for future automated release

### 2. Automatic Slug Overwrites & Technical Slugs
* **The Confusion:** If a writer adjusts a headline late in drafting, auto-slug mechanisms can accidentally rewrite the slug, breaking shared preview links, or writers may manually enter invalid URL characters (spaces, uppercase, punctuation).
* **Proposal (Plan Task 1.12 / Claude Phase 1):**
  - Auto-generate the slug from the headline on initial creation only.
  - Once saved as draft, lock the slug field with an editable padlock toggle: *"Slug locked to preserve URLs. Click padlock to edit."*
  - Sanitize input client-side (lowercase, hyphens only, strip punctuation) with immediate visual feedback.

### 3. Focal Point & Crop Previews
* **The Confusion:** Default image settings can leave non-technical writers uncertain about how an uploaded photo will crop across different news cards and mastheads.
* **Proposal:**
  - Payload already includes a built-in visual focal-point selector (storing coordinates as percentages `0` to `100` on the x and y axes). *Verification in UI required; build custom picker only if built-in proves unintuitive.*
  - Provide a preview box displaying our actual 16:9 aspect ratio sizes (`thumbnail` 400x225, `card` 768x432, `hero` 1600x900) to confirm framing before saving.

### 4. File Upload Limits & iPhone HEIC Formats
* **The Confusion:** When a journalist uploads a 25 MB camera raw image or an iPhone photo, uploads fail abruptly. Currently, no maximum file size limit is configured in `Media.ts` (gap identified; Claude to add limit), and iPhone cameras default to Apple's HEIC format, which is not in our accepted MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/avif`).
* **Proposal:**
  - Display clear upload guidance directly on the upload dropzone:
    - *"Accepted formats: JPEG, WebP, PNG, AVIF (Max 15 MB)"*
    - *"iPhone photos: Change camera settings to 'Most Compatible' (JPEG) or export photo as JPEG before uploading."*
  - Enforce server-side file size limits with actionable client-side feedback: *"This file is 24 MB. Maximum allowed upload size is 15 MB."*

### 5. Invisible or Unclear Autosave State
* **The Confusion:** Journalists writing under breaking deadlines are anxious about losing copy due to laptop sleep, accidental tab closures, or network drops.
* **Proposal:**
  - Place a persistent, calm status indicator next to the document header:
    - *"All changes saved to drafts"* (with checkmark and timestamp).
    - If typing: *"Saving draft..."* with subtle spinner.
    - If offline / network error: Display warning banner. *(Note: Offline client-side browser caching is custom work beyond standard Payload autosave and must be scheduled if prioritized.)*

### 6. Raw Schema Terminology & Clutter
* **The Confusion:** Seeing system fields like `Created By: User ID #14`, `Version 32`, `Internal Document ID`, `Payload Jobs`, or `Categories (Relationship ID)` makes the admin feel like a database inspection tool rather than a clean publishing newsroom.
* **Proposal:**
  - In the Writer view, move technical metadata (`ID`, system timestamps, raw relations) into a collapsed *"Article Info"* sidebar accordion.
  - Simplify the left navigation for Writers to only relevant collections: **Articles** and **Media Library** (hiding internal queues and taxonomy management).

---

## 4. Verification & Sign-off

| Role | Reviewer | Date | Result | Signature |
| :--- | :--- | :--- | :---: | :--- |
| **Interface & Quality (Gemini)** | Automated & Design Review | 2026-10-23 | **READY** | `Gemini <noreply@google.com>` |
| **Platform & CMS (Claude)** | Peer Review | 2026-10-23 | **CHANGES REQUESTED** (Addressed) | `Claude Code <noreply@anthropic.com>` |
| **Owner / Publisher** | Visual & Workflow Acceptance | Pending | — | |
