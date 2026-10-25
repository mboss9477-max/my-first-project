# Documentation map

Read in this order when starting cold:

1. [`../AGENTS.md`](../AGENTS.md): the working rules for the AI agents (roles, workflow, safety).
2. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md): what CS NEWS is, how it is built, the rules that surprise people.
3. [`decisions.md`](decisions.md): every standing decision, dated, with its reason.
4. [`history.md`](history.md): the story from 16 August 2026.
5. [`master-plan.md`](master-plan.md): milestones from now to launch day.
6. The newest file in [`handoffs/`](handoffs/): where the last session stopped.

| Document | What it is |
|----------|-----------|
| [`backend-design.md`](backend-design.md) | Why Payload, Postgres and a separate CMS; options considered, verified facts |
| [`backend-plan.md`](backend-plan.md) | Task-level plan for the backend phases, gates and cutover |
| [`backend-trial-report.md`](backend-trial-report.md) | Results of the Phase 0 trial |
| [`staging-plan.md`](staging-plan.md) | The server steps for staging, each needing the owner's go-ahead; nothing in it has been done |
| [`cutover-runbook.md`](cutover-runbook.md) | The day of the switch from Sanity to the new CMS, with rollback and a log to fill in |
| [`threat-model.md`](threat-model.md) | Threats T1 to T25, mitigations and status |
| [`problems.md`](problems.md) | The shared problem register: every known problem, who has it, its status |
| [`progress-checklist.md`](progress-checklist.md) | Per change: what the author checked, what the other agent tested |
| [`writer-walkthrough.md`](writer-walkthrough.md) | Acceptance checklist for a non-technical writer |
| [`editor-ux.md`](editor-ux.md) | Proposed admin experience for writers and editors |
| `handoffs/` | One file per session end |

Outside `docs/`: `README.md` (running it locally), `CHANGELOG.md` (what shipped), `ISSUES.md` (known issues and future work), `news-site/studio/seed/README.md` (seeding the old CMS).

Files not yet merged when this map was written are marked in the plan; if a link is dead, the PR that adds it has not landed.
