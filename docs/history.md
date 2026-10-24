# CS NEWS history: how we got here

A plain timeline from the first day, so a new reader (or a new agent session) does not need the old chat. Decisions with their reasons are in `decisions.md`; this file is the story. Facts only; nothing private (no server addresses, account emails or tokens).

## 16 August 2026: the foundation
- GitHub CLI and Claude Code set up on the owner's computer; repository created and cloned.
- The owner's first brief: a **multilingual news site**, English first, then Mandarin, Spanish and Arabic (right-to-left). Claude built a monorepo with a **Sanity Studio** (`news-site/studio`) and a **Next.js** site (`news-site/web`), an Article schema and the first pages.
- Both dev servers verified working. First commit, setup branch merged into `main`, the dev-server configuration under `.claude/` tracked.
- The owner asked for an honest audit of what had been built. Fixes followed: the hero image display, a shared date formatter, and removing things nobody asked for.

## 17 August: identity and a full audit
- A pull request for the audit fixes.
- Requested (not done): scheduled **backups to off-server S3-compatible storage** and Hetzner snapshots. Still open.
- **Homepage redesign** with an original look: gold and ash palette, Playfair Display headlines, a three-tier header, a bordered "caged" grid and a Reuters-style footer. The owner pushed back when a different serif was used than the one requested.
- `CHANGELOG.md` started. A "what's left" audit, then staged work with a review stop after stage three: contrast and accessibility fixes first.

## 22 August: real content and navigation
- The owner published the first real article. SEO was checked on it: metadata, Open Graph tags, JSON-LD.
- **Bug found:** categories showed as null on the site although set in the Studio, because document ids containing dots fall outside the public read grant. Ids became dot-free (`category-politics`) and were re-imported.
- Real navigation: category landing pages, newest first. The owner kept all six categories in the nav. The animation pass began.

## 29 August and the days after: going live
- More animations and features (sliding nav underline, scroll reveals, card hover, text-size control, theme toggle, reading progress, headline carousel, newsletter capture).
- **Deployment:** a Hetzner server with **Coolify**, the site deployed from `main`, the domain `csnews.news` pointed at it through Cloudflare, SSL enabled. The Sanity Studio was later deployed to a hosted address.
- CI replaced the broken review job with a typecheck-and-build workflow. `engines.node >= 20` added to `package.json`.
- Two secrets were exposed by mistake during setup (a Sanity token printed, a write token leaked); both were revoked and replaced, and the owner was told.
- The owner removed the login button, asked for demo articles, and wrote the **pre-launch checklist** (must do, should do, polish, can wait) that still guides `docs/master-plan.md`.

## 11 September
- The owner asked for a summary of everything done so far, to audit it.

## 23 October: two agents and a new backend
- **Gemini** joined as a second agent. The owner relayed proposals between the two; the merged result became `AGENTS.md` (roles, worktrees, draft-PR claims, review with evidence, handoffs). Line endings normalised; a test runner added.
- **Decision to replace Sanity** with a backend we control, spending nothing beyond the server until a quality gate. Design, threat model and plan written. A one-day trial settled on **Payload CMS** as a separate app.
- The trial found and fixed real problems: writers could read each other's drafts (found by Gemini), production start failed without migrations, dates showed the wrong day around midnight. Dates now use UK time.
- Server hardening: the Coolify dashboard moved behind HTTPS, the firewall reduced to ports 22, 80, 443 (a missing 443 rule briefly took the site down, fixed within minutes), branch protection on `main`.

## 24 October: Postgres and the plan system
- CMS moved to **Postgres** (CI runs the suite on Postgres 17). Security fixes, a publish webhook and the data seam were built, reviewed by Gemini, and several merged before review (recorded as such in the checklist).
- A progress checklist, a task inbox for Gemini (issues labelled `gemini-task`) and this master plan with its context documents were created. Notion holds the whole plan; GitHub holds the context.
