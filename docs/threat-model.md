# CS NEWS threat model (draft v0.3)

| | |
|---|---|
| **Author** | Claude Code |
| **Reviewer** | Gemini |
| **Status** | DRAFT. Required by AGENTS.md S16 before anything handles logins or passwords. Not a security audit. |
| **Scope** | The planned backend in `docs/backend-design.md`: a separate CMS service, Postgres, media volume, staff accounts, later reader accounts and payments. |
| **Limits** | Written without a pen test and without knowing the final stack. Items marked **[check]** are assumptions to confirm once the stack is chosen. |

## 1. What we are protecting

| Asset | Why it matters |
|---|---|
| Published articles and their integrity | Credibility is the product. A defaced or altered article is the worst realistic outcome. |
| Staff accounts (writer, editor, admin) | Anyone with editor rights can publish under the site's name. |
| Reader accounts and emails (Phase 2) | Personal data; a breach is a legal and trust problem. |
| Payment state (Phase 3) | Tier changes must come only from verified payment events. We never hold card numbers (hosted checkout, **[check]**). |
| Secrets (database, session, webhook, mail, API keys) | The repository is public (S1). |
| Backups | Needed for recovery; also a copy of all data, so they must be protected. |
| The VPS and Coolify | Control over everything above. |

## 2. Who might attack

- Opportunistic internet scanners and bots (credential stuffing, known-CVE exploits, spam signups).
- Someone targeting a news site to deface or plant misleading stories.
- A paying reader trying to read premium content without paying.
- A compromised writer account (phished or reused password).
- A mistake by us: a leaked secret, a bad migration, a wrongly opened port.

## 3. Threats and planned mitigations

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| T1 | Credential stuffing and brute force on login | Per-account and per-IP throttling, lockout with a delay, generic error messages. **Required in Phase 1, before any staff account exists in production** (Gemini review) | **built, merged (#16)**: Payload locks an account after 5 wrong passwords for 10 minutes (its default, now explicit and tested). Limit: per account only, no per-address throttle; consider a proxy rate limit |
| T2 | Weak or reused staff passwords | Minimum length, breached-password check where the stack allows, two-factor for staff if available **[check]** | not built |
| T3 | Password storage compromise | Only a vetted slow hash from the framework; never a scheme we invent (S16) | rule |
| T4 | Session theft, including from shared or public devices | HttpOnly, Secure, SameSite cookies; short idle timeout for staff; **all sessions revoked on password change or reset, and a "sign out everywhere" control** (Gemini review) | **partly built, merged (#16)**: 2-hour tokens, SameSite=Lax, Secure in production (tested). Still open: revoke sessions on password change, sign out everywhere **[check Payload sessions]** |
| T5 | CSRF on admin and account actions | SameSite cookies, plus an explicit Origin/custom-header check on every state-changing route handler. Next.js route handlers do not add CSRF tokens by themselves (Gemini review); what the CMS provides is **[check]** | **partly built, merged (#16)**: Payload's origin allow-list (`csrf`, `cors`) is set to `CMS_URL`. Still to verify with a real cross-origin request on staging |
| T6 | Account recovery abuse | Single-use, short-expiry reset links; rate limit; email sent only to the account's address; no account-existence leak | not built |
| T7 | Readers gaining staff rights | Separate collections for staff and readers (supported by the chosen CMS **[check]**), tier and role never writable by the user | design |
| T8 | Admin panel exposed to the internet | Network restriction is unworkable for family writers on home connections (Gemini review). Instead, **Phase 1 requires one of**: two-factor login for every staff account if the CMS supports it **[check]**, or an identity-aware access gate in front of the admin subdomain (for example Cloudflare Access; free-tier limits **[verify]**). Plus separate subdomain, T1 throttling, strong passwords, patching | not built, Phase 1 |
| T9 | Malicious or oversized uploads | Allowed types only, size limit, image re-encode, no execution from the media path, uploads stored outside the app code | **partly built, merged (#13)**: 25 MB limit and a clear HEIC message (`uploadRules.ts`, tested). Still open: image re-encode check, persistent media volume on staging |
| T10 | Stored XSS through article content | Rich text stored as structured data and rendered through our components, no raw HTML for writers, CSP stays strict (today's CSP is in `next.config.ts`) | partly in place |
| T11 | Fake payment events / tier tampering | Verify webhook signatures; tier changes only from verified events; idempotent handlers | Phase 3 |
| T12 | Premium content leaking through static pages or caches | Premium body never in static HTML or shared caches; fetched from an authenticated endpoint that checks tier on the server | Phase 3 design |
| T13 | Spam signups and newsletter abuse | Rate limiting, email verification, honeypot or similar; no password-less open write endpoints | **built for the CMS path (PR #43):** the signup form keeps its honeypot; the website limits each visitor to 5 attempts per 10 minutes; the CMS endpoint needs a shared secret (fails closed without one), de-duplicates by lower-cased email, answers identically for new and existing addresses, caps requests per window as a backstop and never logs an address; the subscriber list stays admin-only. **Still open:** email verification (confirm the address belongs to the visitor) and a limiter shared across several server instances |
| T14 | Secrets in the repo or logs | S1, S2, S17; enable GitHub secret scanning and push protection (not configured today) | rule; scanning not set up |
| T15 | Data loss or ransomware on the VPS | Nightly dump, off-server copy, tested restore (S16), backups encrypted | not built |
| T16 | Unpatched software | Process: dependency and image updates on a schedule; subscribe to security notices of the CMS and Next | not built |
| T17 | Server compromise via exposed ports or SSH | Firewall (ufw already on), key-only SSH, no database port exposed publicly, Coolify panel access restricted | partly in place |
| T18 | Denial of service on the editor or site | Static pages absorb reader traffic; CMS isolated in its own container so it cannot starve the site; upload limits | design |
| T19 | Insider mistake by an agent or human | Production actions need the human's go-ahead (S5); PR reviews; no direct pushes to `main` | rule |
| T20 | Phishing of non-technical staff, leading to subtle edits (fake quotes, malicious links) rather than obvious defacement | T8 second factor; editor review before publish; version history so changes can be audited and reverted; short guidance for writers on phishing | not built, Phase 1 |
| T21 | Server secrets bundled into public JavaScript (a `NEXT_PUBLIC_` prefix or a server module imported by a client component) | Never prefix secrets with `NEXT_PUBLIC_`; keep secret access in server-only modules (the `server-only` package); reviewers grep for `NEXT_PUBLIC_` on every PR that adds env vars | rule, Phase 1 |
| T22 | Scheduled-publish abuse (found in the CMS trial, PR #9). Payload 3.92's schedule handler does not check publish rights when *queuing*, and its cancel option deletes a job by id with full privileges, so any staff user who can reach the admin could cancel an editor's scheduled publish | Publishing itself is safe: the job runs with the scheduler's rights and a writer's job is refused (tested). For cancellation and queueing: **closed in #16** (hardened in #19: a signed-in caller cannot name someone else) by `jobs.runHooks` plus a hook on the jobs collection (a writer cannot queue a schedule or cancel one; editors and the cron runner unaffected; tested, and the tests fail with the guard off). Caveat: `jobsCollectionOverrides` is marked experimental in Payload 3.92, so re-test after each Payload upgrade | **mitigated, merged (#16, #19)** |
| T23 | API surface left open in production (GraphQL playground, REST listing) | Playground verified **disabled** in a production start (404); anonymous REST returns published content only and 403 for users, subscribers and jobs (PR #9) | verified locally; re-check on staging |
| T24 | **Coolify admin panel exposed on the internet over plain HTTP.** Port 8000 (and realtime 6001) reachable from outside (tested 2026-10-23); Docker-published ports bypass `ufw`. A login there sends the owner's password unencrypted, and the panel controls every service and secret | Serve the Coolify dashboard on its own HTTPS domain through the proxy, then block 8000/6001/6002 with the **Hetzner Cloud Firewall** (network level, unaffected by Docker); confirm from outside afterwards. Owner action, S5 | **mitigated 2026-10-23**: dashboard on `https://coolify.csnews.news`; Hetzner Cloud Firewall allows inbound only TCP 22, 80, 443; verified from outside that 8000, 6001, 6002, 8080 are closed and the site and dashboard answer 200. Lesson: the first firewall save missed 443 and took the site down for a few minutes, so always re-test the site from outside after any firewall change. Follow-up: restrict SSH (22) to known addresses if practical |
| T25 | No swap on the VPS: memory exhaustion kills a process outright (possibly the public site) | Add a small swap file and keep the CMS in its own container with a memory limit. Server change, S5 | **swap half done 2026-10-25 (staging step S1):** 2 GB swap active, swappiness 10, live site unaffected; persistence after a reboot not yet verified. Container memory limits come with staging (S3, S4) |

## 4. Out of scope for now

Formal compliance (GDPR registration, payment regulations, tax) is the owner's responsibility and should be checked with a qualified person before Phase 2 collects personal data and before Phase 3 takes money. This document does not provide legal advice.

## 5. Open questions for the human and for review

1. Which mail provider sends verification and reset emails (needs an owner-created account)?
2. Who gets admin rights, and is two-factor available and required for staff?
3. Where do off-server backups go, and who holds the encryption key?
4. Is a data-protection and privacy policy page needed before reader signups? (owner, with advice)

## 6. Review checklist for Gemini

- Is any realistic threat missing for a news site with non-technical writers?
- Does any mitigation above rely on something we have not verified? Mark it.
- Are the "not built" items correctly sequenced before the phase that needs them?
- Name the weakest item in the table and why.
