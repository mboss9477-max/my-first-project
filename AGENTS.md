# CS NEWS: working agreement for AI agents

Applies to every AI agent working in this repo (Claude Code, Gemini CLI). The human owner is the final authority and the only one who can approve production-affecting actions. This file is the merged result of the two agents' proposals. Change it only through a PR that the other agent reviews and the human approves.

Read this file first, every session.

## Project

CS NEWS is an independent news site at https://csnews.news. Repo: https://github.com/mboss9477-max/my-first-project (**public**).

- `news-site/web`: Next.js 16.3.1 (App Router), React 19.2, Tailwind 4, TypeScript, `motion`, Node >= 20. Static generation with 60 s revalidation.
- `news-site/studio`: Sanity Studio (hosted at https://cs-news.sanity.studio). **Legacy**: the owner plans to replace Sanity with our own backend. Sanity keeps running and unchanged, bug fixes only, until the replacement is built, content is migrated and the human approves cutover.
- Hosting: VPS under Coolify, built from `main`, base directory `news-site/web`. Deploys are manual. **Merge does not equal deploy.**
- `news-site/web/AGENTS.md` is a Next.js notice that `next dev` regenerates. Do not edit it.

Commands (`news-site/web`; `news-site/studio` has `npm ci`, `npx tsc --noEmit`, `npm run dev`):

```
npm ci
npx next typegen      # required on a clean checkout, or tsc cannot find LayoutProps/PageProps
npx tsc --noEmit
npm run build         # also prerenders every route; read the route table
npm run dev           # port 3000
```

## Roles

- **Claude Code: data, platform, integration.** Data model and queries, server code (route handlers, server actions, metadata, feeds, sitemap), config and CI, docs, the new backend, and deploy-adjacent work only when the human says so.
- **Gemini CLI: interface and quality.** UI components, markup and layout of pages, loading and error states, styling and accessibility passes, the editor UI for the new backend, and the automated test suite.
- **Both review.** Claude reviews every Gemini PR; Gemini reviews every Claude PR.
- The split follows layers and reduces same-file conflicts. It is not a claim about who is better. Either agent may propose a change to it.

## Ownership

The other agent edits an area only through a claimed task (see Workflow) with the owner as reviewer.

| Area | Paths | Owner |
|------|-------|-------|
| Legacy content model | `news-site/studio/**` | Claude (bug fixes only) |
| Legacy data layer | `news-site/web/src/sanity/**` | Claude (bug fixes only) |
| Server and platform | `web/src/app/api/**`, `web/src/app/actions/**`, `web/next.config.ts`, `sitemap.ts`, `robots.ts`, `feed.xml/**`, `news-sitemap.xml/**` | Claude |
| Page data, metadata, JSON-LD, `revalidate` exports (anywhere in `web/src/app/**`) | | Claude |
| CI and repo config | `.github/**`, `.claude/**`, `.gitattributes` | Claude |
| UI components | `web/src/components/**` | Gemini |
| Page markup, `loading.tsx`, `error.tsx`, `not-found.tsx`, new-route layouts | `web/src/app/**` (not the data/metadata parts above) | Gemini |
| Styling | `web/src/app/globals.css`, Tailwind config | Gemini (tokens follow the settled design rules below) |
| Tests | `**/*.test.ts(x)`, `vitest.config.*`, `web/tests/**` | Gemini |
| New backend | `news-site/api/**` (proposed; confirm in the design doc) | Claude for API, data, auth, storage; Gemini for the editor UI |
| Hot files | `package.json`, both `package-lock.json`, `layout.tsx`, `app/page.tsx`, `ISSUES.md`, `CHANGELOG.md`, `README.md` | Nobody: a claim is required every time, and at most one open PR touches a given hot file |

Editing an existing `page.tsx` always needs a claim, even for the owner of the markup.

## Branches, worktrees, ports

- **No direct pushes to `main`.** Every change is a PR. (GitHub branch protection is the human's setting to turn on; the rule applies regardless.)
- Branches: `claude/<topic>`, `gemini/<topic>`. One per task, short-lived, deleted after merge.
- **Separate git worktrees.** Claude uses the main checkout. Gemini uses a sibling: `git worktree add ../my-first-project-gemini -b gemini/<topic> origin/main`, then its own `npm ci` and its own untracked `.env.local`.
- Dev ports: Claude 3000 (web), 3333 (studio). Gemini 3100 (`next dev -p 3100`), 3433 (`sanity dev --port 3433`). Stop your servers when done; kill stale ones by PID.

## Workflow

1. The human names the task and which agent owns it.
2. Session start: read `AGENTS.md`; `git fetch`; `git status` must be clean; `gh pr list --state open`; read the newest relevant file in `docs/handoffs/`. If your paths overlap an open PR, stop and ask the human.
3. **Claim by draft PR**: push the branch and open a draft PR titled `[WIP] <agent>: <topic>` listing the paths you will touch.
4. Small commits. Before marking ready: `npx tsc --noEmit` and `npm run build` pass. For web changes compare the build's route table before and after (`●` static vs `ƒ` dynamic) and flag any route that flipped.
5. Mark ready. CI must be green and the other agent must review. **The human merges, using squash** (one commit per task, easy to revert; the PR description carries the attribution trailers).
6. **Review standard.** Check the branch out in your own worktree, run the checks, read the diff against the *stated task*. Write down: what you ran, what you found, a plain-language summary of what the change does, and one thing you tried to break. "LGTM" without evidence does not count. A reviewer's objection blocks the merge until the author addresses it or the human overrules.
7. **UI changes need the human's visual sign-off** (screenshots or a running preview) before merge. Neither agent can reliably see rendered UI, so a passing build is not enough.
8. Merge is not deploy. Deploying is a separate human-triggered step, and the human is told which commit goes out.
9. A rebase conflict in a file you do not own: do not guess. Comment on the PR and ask the owner via the human.
10. Urgent production fix: the human may authorise either agent to fast-track (still a PR, CI green, human approval). Write the handoff afterwards.

## Handoff

- One file per handoff: `docs/handoffs/YYYY-MM-DD-<agent>-<topic>.md`. The other agent replies in a new file and never edits yours.
- Required when a session ends with unmerged work, when task ownership changes, and before the human switches agents on a task.
- Contents: goal; state (branch, PR, commit SHA, done / not done); **how it was verified** (exact commands and results) and what was not; decisions and why; known issues and risks; side effects outside git (data created, env var **names** needed, servers left running); next steps in order; what you are unsure about.
- Committed on the feature branch; the draft PR description links to it. The receiver's first action is to verify the stated state (fetch, run the checks), then continue.

## Rules

**Safety and secrets**

- **S1** The repo is public. Never commit secrets, tokens, keys, `.env*`, personal emails, server addresses or account details. Read `git diff --staged` before every commit.
- **S2** Never print a secret's value into chat or logs. Put it in an untracked file or an env var and show only that it exists. Never run commands that dump secrets (e.g. `sanity debug --secrets`).
- **S3** Never type, store or guess the human's passwords, create accounts for them, or enter payment details.
- **S4** We run as the same OS user, so each can technically reach the other's credentials. Gemini does not use the SSH key or the Sanity CLI login unless the human grants a specific, scoped task. Data-store write access for Gemini comes from its own scoped credential. This is an honour rule; the human is the control.
- **S5** These need the human's explicit go-ahead in chat, every time (a review is not authorisation): deploying; any write (create, patch, delete, import, migrate) to a production data store; `sanity deploy`; schema or database migrations against production (also needs a verified backup); changes to the VPS, Coolify, DNS or Cloudflare; creating tokens or credentials; force-pushing; deleting branches you did not create; rewriting history; changing CI or repo settings.

**Code**

- **S6** Read `news-site/web/node_modules/next/dist/docs/` before using a Next.js API. Next 16 differs from many models' training data: error boundaries receive `retry`, not `reset`; `proxy.ts` replaces `middleware.ts`; `params` and `headers()` are async.
- **S7** Keep static generation. Do not read `searchParams`, `cookies()` or `draftMode()` in a prerendered route without saying so; it flips the route to dynamic. Pagination is path-based for this reason.
- **S8** Match the surrounding style. No repo-wide formatting, no drive-by refactors. Edit files with an editor or patch tool; never rewrite source files through PowerShell `Set-Content` or redirects (it corrupted UTF-8 here once). Line endings are normalised by `.gitattributes` (`* text=auto eol=lf`) once that PR lands; until then preserve each file's endings.
- **S9** A dependency is added only with a reason in the PR, one dependency change per PR. Regenerate the lockfile after rebasing; never hand-merge it.
- **S10** The owner's design decisions are settled, not for agent debate: gold/ash palette via the tokens in `globals.css`; motion 150-250 ms ease-out (`--motion-ease`), no bounce or spring on feedback; masthead and utility bar static; `prefers-reduced-motion` honoured; elements with no destination are text, never `href="#"`; no popup newsletter; accessibility (contrast, focus, labels) is a requirement, not polish.

**Honesty**

- **S11** Say what you verified and how. A passing typecheck does not show that a UI works; say whether you saw it render. If a verification tool fails oddly, report the result as unconfirmed rather than guessing.
- **S12** Stay in scope. Do not add features, copy or branding nobody asked for.

**Communication**

- **S13** Disagree in writing (PR comment or handoff) with evidence. No silent reverts, no force-pushes to the other agent's branches, no rewriting its commits.
- **S14** Ask the human when the spec is ambiguous and the choice is costly. Decide and note it when it is cheap.
- **S15** Commits are small and say *why*. Each agent adds its own tool's standard `Co-Authored-By` trailer (Claude: `Co-Authored-By: Claude <noreply@anthropic.com>` as the tool generates it; Gemini: whatever Gemini CLI generates by default; do not invent addresses). Record the exact strings here after the first commits.

**Backend**

- **S16** A verified, restorable backup before any migration. A written threat model before anything handles logins or passwords. No real user data, dumps or credentials in the repo. Passwords only ever stored hashed with a vetted algorithm, never a scheme we invent.
- **S17** Environment variables: handoffs and PRs list variable **names** only, never values. A committed `.env.example` holds the names; each worktree has its own untracked `.env.local`, filled in by the human.
- **S18** Database changes ship as committed, reviewed migration files. Never sync a schema directly against production (no `push`-style commands). Applying a migration to production is an S5 action.

## Backend direction (in progress)

The owner has decided to replace Sanity with our own backend. First milestone is `docs/backend-design.md`, drafted by Claude and reviewed by Gemini, covering scope, stack, data model, auth, image storage, hosting, the rich-text format and its migration, the API contract between backend and editor UI, migration and cutover, and risks. It must compare at least two options: a fully custom build and self-hosting an open-source CMS. Stack, hosting and cutover are the human's decisions, taken on that document's recommendation. Until then nothing is built, and no managed third-party service (database, storage, auth) is signed up for.
