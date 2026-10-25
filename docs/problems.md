# Problem register

One list for everyone: the owner, Gemini (Antigravity), and either Claude chat. **Anyone can add a row** (through a pull request, or by telling the owner); the owner decides the order. A row stays until it is closed with a link to what closed it.

**Status:** open · in review (a PR exists) · waiting (on the owner or another person) · closed.

## Live site and backend

| # | Problem | Found by | Fix | Who | Status |
|---|---------|----------|-----|-----|--------|
| 1 | **Newsletter signup fails on the live site.** No signup has ever reached the old content tool; most likely its write token is not set on the server, so the form says "Signups are not open yet" | Owner, confirmed by Claude (0 subscribers ever) | Short term: the owner sets the token in Coolify (the owner's action: it creates a credential) and says which message the form shows. Real fix: the CMS signup endpoint, live after cutover (PR #43, hardened in #74) | Owner, then Claude | waiting |
| 2 | **With zero published articles the front page shows 12 demo stories with placeholder photos**, so deleting articles seems to change nothing | Old Claude chat | Replace the fallback with a proper empty state and remove the placeholder photo host. `app/page.tsx` is a hot file: needs a claim, markup from Gemini, and the owner's visual sign-off | Claude, Gemini, owner | open |
| 3 | The owner removed articles in the CMS and the live site did not change | Owner | Not a bug: the live site still reads the old content tool until cutover. Nothing to fix; the cutover runbook is the answer | n/a | closed |
| 4 | Share image returned an error (500) for every article; sitemap left out topic and author pages; `robots.txt` Host line and search canonical were wrong | Gemini (brief 07) | Fixed | Claude | in review (#77) |
| 5 | Signup rate limit could be bypassed with a forged header; control characters in emails; oversized bodies; migration label could print passwords | Gemini (brief 04) | Fixed (two trade-offs accepted, written in threat T13) | Claude | in review (#74) |
| 6 | **CI runs on `main` were cancelled** when two merges came a minute apart (#38 and #43), so those deploys had no finished check | Old Claude chat | PR #75 (never cancel on `main`). It changes CI, so it needs the owner's go-ahead (S5) | Owner decides; Gemini reviews (#76) | waiting |
| 7 | **The CMS is not deployed anywhere**, so nothing about it is proven on the real server | Plan | Staging, one owner-approved step at a time (S2 next) | Owner and Claude | waiting |
| 8 | Hosting hygiene still unconfirmed: server snapshots or backups (automatic backups are off), token rotation, uptime monitoring from outside the server, a copy of Coolify's secrets file | Plan, owner's list | The owner confirms each; backups: see `docs/briefs/09-backup-tooling.md` | Owner | waiting |
| 9 | Admin screens (notes, languages, Arabic editing) were never looked at | Claude | A walkthrough with the owner logged in | Owner and Claude | open |
| 10 | Smaller gaps: no `publisher.logo` in the article structured data; authors have no portrait field in the CMS; CMS search covers headline and excerpt only; draft preview exists only for the old content tool | Gemini and Claude | After cutover, each its own small PR | Claude | open |

## Languages and design

| # | Problem | Found by | Fix | Who | Status |
|---|---------|----------|-----|-----|--------|
| 11 | CMS had to be language-ready before content moves in | Owner | Spike done: English, Spanish, Chinese, Arabic (right-to-left) built in, English only filled in | Claude | in review (#80) |
| 12 | **Good translation is unsolved.** A tool is needed that translates articles and also documents and PDFs (as Anadolu does), with human review before publishing. Not plain Google Translate | Owner | Research first (Gemini): options, quality, cost, privacy, documents and PDFs, Arabic and Chinese. Decision is the owner's; nothing is bought before the quality gate | Gemini researches; owner decides | open |
| 13 | Anadolu-style design, mixed from several sites, keeping our gold and ash theme. Logo arrives in about 2 to 3 weeks | Owner | Gemini: design research and proposals; owner chooses and signs off visually. Logo goes in when it exists | Gemini, owner | open |
| 14 | Writer notes should reach the admin and IT team, possibly with an AI step (free API) that sorts or summarises them | Owner | Notes are built (#82). Email and any AI step come later: the vendor would see staff text, so it needs the owner's approval and a threat-model row first | Claude, owner | waiting |

## Process

| # | Problem | Found by | Fix | Who | Status |
|---|---------|----------|-----|-----|--------|
| 15 | **Two Claude chats shared one folder**, so one switched the other's branch | Old Claude chat | Each Claude chat uses its own git worktree (`my-first-project-b` for the second one); the rule is going into `AGENTS.md` on its own branch | Old chat | in review |
| 16 | Some early merges happened before Gemini reviewed them (marked as such in the checklist) | Old Claude chat | Gemini tests them after the fact and records it in the checklist | Gemini | open |
| 17 | Gemini's checklist PR (#21) is stale | Old Claude chat | Gemini rebases or closes it | Gemini | open |
| 18 | The legacy content tool must be **removed from the repo, not only from the live site** | Owner | After cutover: delete `news-site/studio`, its data code, its settings and dependencies, and its CI and README mentions (`docs/cutover-runbook.md`, gap G-7). Cannot happen before: the live website reads it today | Claude | waiting on cutover |
| 19 | Backend must be stress tested with many articles and traffic before launch, in about 1 to 2 months | Owner | A test plan once staging runs (memory, uploads, publishing bursts); staging measurement is step S10 | Claude, Gemini | open |

## How we talk to each other
- **Owner to anyone:** in chat. Gemini gets pasted prompts; the old chat's findings come back through the owner.
- **Agent to agent:** pull request comments, handoff files in `docs/handoffs/`, and this register. Never through the owner's memory.
- **Every report to the owner** ends with a short list of what is done, what was verified, what is blocked, what is needed.
