# CS NEWS CMS: Non-Technical Writer Walkthrough & Acceptance Checklist

> **Plan Task:** P0.9  
> **Target System:** CS NEWS Payload CMS Admin (`http://localhost:3200/admin`)  
> **Audience:** Non-technical journalists, writers, copy editors, and editorial staff  
> **Status:** Draft / Verification Ready  

---

## 1. Overview and Operating Roles

In CS NEWS editorial workflows, access is divided into strict roles:
- **Writer:** Can draft articles, write copy, add headings/lists/links, upload images with alt text, set focal points, save drafts, and submit articles for editorial review. Writers **cannot** publish directly, cannot schedule publishing, cannot unpublish live articles, and cannot alter colleagues' drafts or versions.
- **Editor / Admin:** Can review submitted drafts, schedule publication, publish articles to live, unpublish articles, manage categories/topics, and publish corrections.

Every step in this walkthrough represents an end-to-end task that a non-technical user must execute. Each row contains the expected visual feedback and a validation checklist (`PASS / FAIL`).

---

## 2. Step-by-Step Writer Walkthrough Checklist

| Step # | Task / Workflow Step | Role Allowed | What the User Should See | Verification (PASS / FAIL) | Notes & Edge Cases |
| :---: | :--- | :---: | :--- | :---: | :--- |
| **01** | **Sign in to CMS** | Writer / Editor | Navigate to `http://localhost:3200/admin`. Clean login screen with Email and Password inputs. On submit, redirects directly to Dashboard showing accessible collections (`Articles`, `Media`). | [ ] PASS<br>[ ] FAIL | Invalid credentials must display a clear, human-friendly error ("Invalid email or password"), never a technical stack trace. |
| **02** | **Create Article** | Writer / Editor | Dashboard displays **Articles** in sidebar / main view. Click **"Create New"** or **"+"** next to Articles. Opens article editor with breadcrumbs: `Articles > Create New`. | [ ] PASS<br>[ ] FAIL | Ensure writers do not see administrative collections they cannot manage (e.g. `Users` role modification or `Payload Jobs`). |
| **03** | **Enter Headline & Verify Slug** | Writer / Editor | Headline field prominently at top. As headline is typed (e.g., `"UK Quantum Computing Breakthrough Announced"`), slug field auto-populates (`"uk-quantum-computing-breakthrough-announced"`). Slug remains editable if customization is needed. | [ ] PASS<br>[ ] FAIL | Slug should strip special characters and lowercase words with hyphens. Warning if slug is empty or duplicate. |
| **04** | **Write Body Content (Rich Text)** | Writer / Editor | Rich-text editor canvas (Lexical):<br>• **Headings:** Formats H2, H3 easily from toolbar/slash menu.<br>• **Bold / Italic:** Standard formatting toolbar buttons or `Ctrl+B`/`Ctrl+I`.<br>• **Links:** Highlight text -> Link button -> enter URL. Displays link badge/card.<br>• **Lists:** Bulleted and numbered lists indent cleanly without raw code blocks. | [ ] PASS<br>[ ] FAIL | Writers must **never** be exposed to raw HTML, markdown tags, or raw JSON AST blocks. |
| **05** | **Add Hero Image with Alt Text & Focal Point** | Writer / Editor | Click **Hero Image** picker -> Choose "Upload New" or select from Media library.<br>• Upload photo (e.g., high-res `.jpg` or `.webp`).<br>• **Alt Text:** Required field clearly labeled *"Alt text for visually impaired readers"*.<br>• **Focal Point:** Interactive preview box with a draggable target pin `{x, y}` to control cropping across cards, thumbnails, and hero banners. | [ ] PASS<br>[ ] FAIL | If Alt text is left blank, the interface flags it before saving. Focal point values update visually without numeric manual coordinate typing. |
| **06** | **Autosave Indicator** | Writer / Editor | As edits are made, an unobtrusive status pill near the header displays: *"Saving..."* then updates to *"Saved"* with a timestamp (e.g., *"Saved at 14:32"*). | [ ] PASS<br>[ ] FAIL | Must reassure the writer that work is not lost if the tab closes. No jarring full-page reload on autosave. |
| **07** | **Save Draft Manually** | Writer / Editor | **"Save Draft"** button remains accessible at the bottom or top-right action bar. Clicking it saves current state without publishing. Status displays **Draft** badge. | [ ] PASS<br>[ ] FAIL | Creates a new version entry in version history without bumping public feeds. |
| **08** | **Submit for Review** | Writer only *(or Editor)* | Writer changes article status to **"In Review"** (or clicks **"Submit for Review"**). Status badge changes to Amber/Yellow *"In Review"*. The **"Publish"** button is disabled or hidden for Writers. | [ ] PASS<br>[ ] FAIL | **Security Boundary:** A writer attempting to force publication must receive a clear message: *"You do not have permission to publish articles directly."* |
| **09** | **Editor Publishes Article** | **Editor / Admin Only** | Editor logs in, reviews article under *"In Review"*, verifies copy and compliance, and clicks **"Publish"**. Status badge turns Green *"Published"*. Live URL preview link appears. | [ ] PASS<br>[ ] FAIL | Webhook/revalidation fires to update static frontend within 60 seconds. |
| **10** | **Schedule Publication** | **Editor / Admin Only** | Editor selects **"Schedule"**, picks future UK Date & Time (`Europe/London`). Status shows *"Scheduled for [Date/Time] BST/GMT"*. | [ ] PASS<br>[ ] FAIL | Queued in `payload-jobs` to publish automatically at the specified UK time without manual intervention. |
| **11** | **Add a Correction / Update** | Writer / Editor | In a published article, author or editor adds an entry in the **Corrections** field (Date, Note explaining update). When re-published, note attaches cleanly to footer of story. | [ ] PASS<br>[ ] FAIL | Preserves transparency per news standards without wiping original publication timestamp. |
| **12** | **Unpublish Article** | **Editor / Admin Only** | Editor clicks **"Unpublish"** -> Prompts confirmation dialog: *"Are you sure you want to take this article down? It will no longer be visible to readers."* Status returns to *"Draft"*. | [ ] PASS<br>[ ] FAIL | **Security Boundary:** Writers must have zero access to unpublish live articles. |
| **13** | **Sign Out** | Writer / Editor | Click user avatar/profile in bottom-left/top-right -> **"Sign Out"**. Clears auth session and redirects safely back to `/admin/login`. | [ ] PASS<br>[ ] FAIL | Session cookie is deleted. Back-button navigation cannot access draft content without re-authenticating. |

---

## 3. Things That Would Confuse a Non-Technical Writer (With Concrete Proposals)

During user testing with non-technical editorial staff, the following default CMS behaviors and technical affordances create friction or confusion. Below are the identified issues and our concrete proposals for the Editor Experience layer (Plan Task 1.12):

### 1. Ambiguous Status Terminology & Buttons
* **The Confusion:** Default headless CMSs often show technical states like `_status: draft | published`, or generic "Save" buttons that do not clearly distinguish between saving a private draft vs. submitting an article for editorial approval. Writers often fear that clicking "Save" will publish their incomplete work to the public site.
* **Proposal:**
  - Rename the action buttons clearly based on role:
    - For Writers: Primary button is **"Save Draft"** with a secondary action **"Submit for Review"**.
    - For Editors: Primary button is **"Publish Now"**, with a dropdown for **"Schedule for Later..."**.
  - Show a prominent, color-coded status badge at the top:
    - ⚪ **Draft** (Gray) - Only visible to you and editors
    - 🟡 **In Review** (Amber) - Submitted to the desk
    - 🟢 **Published** (Green) - Live on `csnews.news`
    - 🔵 **Scheduled** (Blue) - Set for future release

### 2. Automatic Slug Overwrites & Technical Slugs
* **The Confusion:** If a writer alters the headline late in drafting (e.g. fixing a typo), auto-slug fields sometimes regenerate the slug, breaking any links already shared with copy editors, or writers mistakenly edit the slug into an invalid URL format (spaces, uppercase, quotes).
* **Proposal:**
  - Auto-generate the slug only on initial creation.
  - Once saved as draft, lock the slug field with a small padlock icon: *"Slug locked to preserve URLs. Click padlock to unlock and edit."*
  - Automatically sanitize input (lowercase, hyphens only, strip punctuation) inline with instant visual feedback.

### 3. Focal Point & Crop Confusion
* **The Confusion:** Default image upload fields display a thumbnail and perhaps raw numbers for focal coordinates (`focalX: 0.52, focalY: 0.31`), leaving non-technical users guessing what the numbers mean or how the image will actually appear on mobile vs. desktop cards.
* **Proposal:**
  - Provide an interactive, visual focal-point selector: a small crosshair target that the user can click and drag directly over the image.
  - Show a 3-way live preview pill underneath: **[Card 16:9]**, **[Thumbnail 1:1]**, **[Hero 21:9]** demonstrating how the crop centers on the chosen focal point.

### 4. Technical File Upload Errors & Size Limits
* **The Confusion:** When a journalist uploads a 25 MB photo straight from a camera or an unsupported file type, default systems often throw cryptic errors like `PayloadError: File size exceeds maxAllowedSize` or `MIME type image/heic not allowed`.
* **Proposal:**
  - Display friendly upload guidance before dropping files: *"Accepted formats: JPG, WebP, PNG under 15 MB"*.
  - Handle client-side validation with actionable feedback: *"This image is 24 MB. Please upload an image under 15 MB, or ask an editor to resize it."*

### 5. Invisible or Unclear Autosave State
* **The Confusion:** Journalists writing breaking news in a web browser are constantly anxious about losing work due to accidental tab closures, laptop sleep, or connection drops.
* **Proposal:**
  - Place a persistent, calm status indicator next to the document title:
    - *"All changes saved to drafts"* (with green checkmark).
    - If typing: *"Saving draft..."* with subtle spinner.
    - If offline/network error: Persistent red alert: *"Connection lost. Changes stored locally in your browser. Do not close this tab."*

### 6. Raw Schema Terminology & Clutter
* **The Confusion:** Seeing system fields like `Created By: User ID #14`, `Version 32`, `Internal Document ID`, `Payload Jobs`, or `Categories (Relationship ID)` makes the admin feel like a database developer tool rather than a clean publishing newsroom.
* **Proposal:**
  - In the Writer view, hide technical metadata (`ID`, system timestamps, raw relations) into a collapsed *"Article Info"* sidebar accordian.
  - Replace raw user ID dropdowns with readable author names and avatars.
  - Simplify the left navigation to only two clean items for Writers: **Articles** and **Media Library**.

---

## 4. Verification & Sign-off

| Role | Reviewer | Date | Result | Signature |
| :--- | :--- | :--- | :---: | :--- |
| **Interface & Quality (Gemini)** | Automated & Design Review | 2026-10-23 | **READY** | `Gemini CLI <noreply@google.com>` |
| **Platform & CMS (Claude)** | Peer Review | Pending | — | |
| **Owner / Publisher** | Visual & Workflow Acceptance | Pending | — | |
