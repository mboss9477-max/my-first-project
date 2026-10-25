# CS NEWS: Translator Desk Design (Tasks 6.1 & 6.2)

> **Document:** `docs/briefs/19-translator-desk-design.md`  
> **Author:** Gemini (`interface and quality`)  
> **Reviewer:** Claude Code & Human Owner  
> **Date:** 2026-10-25  
> **Status:** Proposal / Concepts Only (No code modified)  
> **Context:** Master plan tasks 6.1 and 6.2 / M6 / Backend plan language phase. Designed for post-launch Anadolu-style multilingual operations.

---

## 1. Editorial Workflow & User Goals

The CS NEWS translation desk operates under a strict three-tier human editorial workflow:
$$\text{Translator (Drafts)} \longrightarrow \text{Reviewer (Approves)} \longrightarrow \text{Editor (Publishes)}$$

### Primary Users & Roles
1. **Translator (Role: `translator`):**
   - **Goal:** Accurately translate breaking and feature stories from the English source into target language editions (e.g. Spanish, Arabic, Turkish).
   - **Capabilities:** Can create and save translation drafts for assigned languages. **Cannot publish live** (strictly enforced via backend access rules and UI button suppression).
2. **Reviewer (Role: `reviewer`):**
   - **Goal:** Ensure linguistic fidelity, regional accuracy, nuance, and editorial standards.
   - **Capabilities:** Fluent in the target language. Reviews translated text side-by-side against English source. Can approve (`reviewed`) or return with notes (`changes_requested`). **Cannot publish live.**
3. **Editor (Role: `editor` / `admin`):**
   - **Goal:** Supervise cross-edition output, maintain legal compliance, and manage release scheduling.
   - **Capabilities:** Inspects certified translations, confirms that the source has not changed since review, and executes publication to live CDN.

---

## 2. Status Lifecycle & The "Outdated Source" Guardrail

### Status State Machine
```
[English Published]
       │
       ▼
 [Needs Translation]
       │
       ▼
 [Machine Draft] ──(Translator edits)──► [Translated]
                                              │
                                              ▼ (Reviewer rejects: "Changes requested")
                                         [In Review]
                                              │
                                              ▼ (Reviewer approves)
                                         [Reviewed]
                                              │
                                              ▼ (Editor publishes)
                                         [Published]
```

### The "Outdated Source" Warning State
In a live newsroom, English stories are frequently updated (breaking updates, corrections, fact refinements) *after* a translation has already begun or been approved.
- **Trigger:** When English `sourceUpdatedAt` > Translation `sourceSnapshotAt`.
- **System Behavior:**
  - The translation's status badge turns amber/red: `⚠️ Outdated Source`.
  - The Editor's "Publish" button is automatically locked until the translation desk acknowledges or syncs the source changes.
  - An inline diff highlighter displays exact English sentences added, changed, or deleted since the translation was created.

---

## 3. Permissions Matrix

| Action | Translator | Reviewer | Editor | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **View English Source Backlog** | Yes | Yes | Yes | Yes |
| **Create/Edit Translation Draft** | Yes (Assigned Langs) | Yes | Yes | Yes |
| **Submit for Review** | Yes | Yes | Yes | Yes |
| **Approve Translation (`reviewed`)** | **No** | **Yes** | **Yes** | **Yes** |
| **Request Changes (`changes_requested`)** | **No** | **Yes** | **Yes** | **Yes** |
| **Publish Translation Live** | **No** (Refused) | **No** (Refused) | **Yes** | **Yes** |
| **Unpublish / Retract** | **No** | **No** | **Yes** | **Yes** |
| **Bypass "Outdated Source" Lock** | **No** | **No** | **No** | **Yes** (Audit logged) |

---

## 4. The Four Core Screens

### Screen 1: Translation Backlog & Priority Queue
A prioritized desk dashboard listing published English stories needing translation.
```
+----------------------------------------------------------------------------------------------------+
|  CS NEWS TRANSLATOR DESK — BACKLOG                                         Target Lang: [Arabic ▾] |
+----------------------------------------------------------------------------------------------------+
| Filter: [All Categories ▾]  [All Priorities ▾]  Search: [________________________]                 |
+----------------------------------------------------------------------------------------------------+
| Priority | English Headline                      | Published  | Arabic Status    | Actions         |
|----------|---------------------------------------|------------|------------------|-----------------|
| FLASH    | Central Bank cuts rates by 25 bps     | 12 min ago | ⏳ Unassigned    | [ Claim Story ] |
| HIGH     | Council approves £40m transport plan  | 1 hr ago   | ✍️ Drafting (Ali)| [ View Draft ]  |
| NORMAL   | Autumn harvest signals food price dip | 3 hrs ago  | ⏳ Unassigned    | [ Claim Story ] |
+----------------------------------------------------------------------------------------------------+
```

### Screen 2: Side-by-Side Source & Draft Editor
A split-pane workbench allowing translators to draft while keeping the original English text in direct view.
```
+----------------------------------------------------------------------------------------------------+
| [← Back to Queue]    Translating to: ARABIC (العربية)                 [Save Draft] [Submit Review] |
+----------------------------------------------------------------------------------------------------+
| ENGLISH SOURCE (Read-Only) [Snapshot: 10:14 UTC]   | ARABIC TRANSLATION (Editing)                  |
|----------------------------------------------------+-----------------------------------------------|
| HEADLINE:                                          | HEADLINE (العنوان):                           |
| Central Bank cuts interest rates by 25 bps         | البنك المركزي يخفض أسعار الفائدة بمقدار 25 نقطة|
|                                                    |                                               |
| EXCERPT:                                           | EXCERPT (الموجز):                             |
| Policymakers cited falling inflation as benchmark  | أشار صناع السياسات إلى انخفاض التضخم كمعيار...|
| rate drops to 4.5% in unanimous vote.              |                                               |
|                                                    |                                               |
| LEAD IMAGE:                                        | LEAD IMAGE CAPTION:                           |
| [ Thumbnail: bank-hq.jpg ]                         | [ ] Inherit English caption                   |
| Caption: Bank headquarters in London               | مقر البنك المركزي في لندن                      |
|                                                    |                                               |
| BODY (Lexical):                                    | BODY (Lexical Arabic - dir="rtl"):            |
| The Monetary Policy Committee confirmed on Friday  | أكدت لجنة السياسة النقدية يوم الجمعة أن القرار |
| that the decision was driven by consumer prices... | جاء مدفوعاً ببيانات أسعار المستهلك الأخيرة...  |
+----------------------------------------------------+-----------------------------------------------+
```

### Screen 3: Review Queue & Verification View
Reviewers inspect the translation alongside the English source and diff flags.
```
+----------------------------------------------------------------------------------------------------+
| REVIEW: Story #1042 (Arabic) ── Translator: Ali K.                 [Request Changes] [✓ Approve]   |
+----------------------------------------------------------------------------------------------------+
| Status: Awaiting Review | Source Hash: MATCHES (No outdated edits)                                 |
+----------------------------------------------------------------------------------------------------+
| Reviewer Notes & Feedback:                                                                         |
| [ Headline looks punchy and accurate. In paragraph 3, verify the translation of "quantitative... ]|
+----------------------------------------------------------------------------------------------------+
```

### Screen 4: Editor's Publish & Release View
Final editorial gatekeeping view with release controls.
```
+----------------------------------------------------------------------------------------------------+
| PUBLISH DESK: "Central Bank cuts rates" (Arabic Edition)                                            |
+----------------------------------------------------------------------------------------------------+
| Verification Checklist:                                                                            |
| [✓] Source Article Published on English Edition (URL: /news/central-bank-cuts-rates)               |
| [✓] Translation Approved by Certified Reviewer (Fatima M. at 10:48 UTC)                            |
| [✓] Source Version in Sync (English has NOT been modified since review)                            |
| [✓] SEO & OpenGraph metadata populated                                                             |
+----------------------------------------------------------------------------------------------------+
| Publication Schedule:                                                                              |
| (●) Publish Immediately to Live CDN                                                                |
| ( ) Schedule for: [ 2026-10-25 ] at [ 12:00 ] (Europe/London)                                      |
|                                                                                                    |
|                             [ CANCEL ]        [ 🚀 PUBLISH ARABIC EDITION ]                        |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Accessibility & Directionality

1. **Bidirectional Typography (RTL vs LTR):**
   - Source pane enforces `dir="ltr"` and Western typographic styling.
   - Arabic / Persian panes enforce `dir="rtl"` with system Arabic font stacks (`Amiri`, `Segoe UI`, `Tahoma`).
2. **Keyboard Focus & Navigation:**
   - Dedicated keyboard shortcut (`Alt + J` / `Option + J`) cycles focus between source paragraphs and corresponding translation fields.
   - All action buttons have 44px minimum touch targets and clear focus rings (`outline: 2px solid var(--accent)`).
3. **Screen Reader Announcements:**
   - Source modification alerts use `role="alert"` and `aria-live="assertive"`.
   - Status changes are announced via `aria-live="polite"`.

---

## 6. Edge Cases & Resilience

1. **Translator Leaves Mid-Story:**
   - Translations are saved continuously as drafts. If an assigned translator disconnects, the desk editor can unclaim or reassign the draft to another translator without data loss.
2. **Reviewer Disagrees / Rejects Translation:**
   - Reviewer sets status to `changes_requested` and must input required feedback notes.
   - The article returns to the Translator's queue with highlighted notes.
   - The Editor's publish control is hard-locked while in `changes_requested`.
3. **Source English Story Edited After Translation:**
   - The CMS hook compares `doc.sourceArticle.updatedAt` against `doc.sourceSnapshotAt`.
   - If unequal, status automatically changes to `outdated_source`.
   - Diff modal highlights the exact changes made to the English story. The translator or reviewer must click "Re-certify with Latest Source" before publishing is unlocked.
4. **English Story Retracted / Unpublished:**
   - If a source English story is unpublished or deleted, a cascading webhook/hook immediately unpublishes all localized editions (`es`, `ar`, `tr`) to prevent legally problematic or retracted reporting from persisting online.

---

## 7. Payload CMS 3.x Technical Feasibility & Architecture

### What is Built-in vs What Needs Custom Views

| Capability | Payload 3.x Out-of-the-Box | Custom Implementation Required | Docs Citation & Status |
| :--- | :---: | :---: | :--- |
| **Document Localization** | **Yes** | Built-in via `localization: { locales: [...] }` | [Payload Localization](https://payloadcms.com/docs/configuration/localization) (Official, verified) |
| **Field-level Roles** | **Yes** | `access: { update: ({ req }) => ... }` | [Payload Access Control](https://payloadcms.com/docs/access-control/overview) (Official, verified) |
| **Draft / Publish Flow** | **Yes** | `versions: { drafts: true }` | [Payload Versions](https://payloadcms.com/docs/versions/overview) (Official, verified) |
| **Side-by-Side Dual Pane Editor** | **No** (Payload only toggles locales in place) | **Custom Admin View** | [Payload Custom Views](https://payloadcms.com/docs/admin/views) (Verified: App Router page component in `admin.components.views`) |
| **Outdated Source Hash Hook** | **No** | **Collection `beforeChange` Hook** | Custom code; compares source doc hash/timestamp against draft hash |
| **Translation Backlog Queue** | Partial (via List filters) | **Custom Dashboard View** or List View Override | UNVERIFIED whether list filter presets suffice for full desk triage without a custom view |

---

## 8. Verification Status

- **Verified by me:**
  - Verified role and access control patterns in `news-site/cms/src/access/roles.ts` and `Articles.ts`.
  - Verified Payload 3.x Custom Views API (`admin.components.views`) using Next.js App Router.
  - Verified accessibility criteria (directionality, focus navigation, WCAG AA contrast).
- **Not verified:**
  - Claude has not prototyped or tested any translation desk views.
  - Exact custom view component performance under high-volume breaking news triage is UNVERIFIED until tested in Phase 6.
