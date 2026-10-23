# CS NEWS threat model (draft v0.2)

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
| T1 | Credential stuffing and brute force on login | Per-account and per-IP throttling, lockout with a delay, generic error messages. **Required in Phase 1, before any staff account exists in production** (Gemini review) | not built, Phase 1 |
| T2 | Weak or reused staff passwords | Minimum length, breached-password check where the stack allows, two-factor for staff if available **[check]** | not built |
| T3 | Password storage compromise | Only a vetted slow hash from the framework; never a scheme we invent (S16) | rule |
| T4 | Session theft, including from shared or public devices | HttpOnly, Secure, SameSite cookies; short idle timeout for staff; **all sessions revoked on password change or reset, and a "sign out everywhere" control** (Gemini review) | not built, Phase 1 for staff |
| T5 | CSRF on admin and account actions | SameSite cookies, plus an explicit Origin/custom-header check on every state-changing route handler. Next.js route handlers do not add CSRF tokens by themselves (Gemini review); what the CMS provides is **[check]** | not built |
| T6 | Account recovery abuse | Single-use, short-expiry reset links; rate limit; email sent only to the account's address; no account-existence leak | not built |
| T7 | Readers gaining staff rights | Separate collections for staff and readers (supported by the chosen CMS **[check]**), tier and role never writable by the user | design |
| T8 | Admin panel exposed to the internet | Network restriction is unworkable for family writers on home connections (Gemini review). Instead, **Phase 1 requires one of**: two-factor login for every staff account if the CMS supports it **[check]**, or an identity-aware access gate in front of the admin subdomain (for example Cloudflare Access; free-tier limits **[verify]**). Plus separate subdomain, T1 throttling, strong passwords, patching | not built, Phase 1 |
| T9 | Malicious or oversized uploads | Allowed types only, size limit, image re-encode, no execution from the media path, uploads stored outside the app code | not built |
| T10 | Stored XSS through article content | Rich text stored as structured data and rendered through our components, no raw HTML for writers, CSP stays strict (today's CSP is in `next.config.ts`) | partly in place |
| T11 | Fake payment events / tier tampering | Verify webhook signatures; tier changes only from verified events; idempotent handlers | Phase 3 |
| T12 | Premium content leaking through static pages or caches | Premium body never in static HTML or shared caches; fetched from an authenticated endpoint that checks tier on the server | Phase 3 design |
| T13 | Spam signups and newsletter abuse | Rate limiting, email verification, honeypot or similar; no password-less open write endpoints | partly (newsletter exists) |
| T14 | Secrets in the repo or logs | S1, S2, S17; enable GitHub secret scanning and push protection (not configured today) | rule; scanning not set up |
| T15 | Data loss or ransomware on the VPS | Nightly dump, off-server copy, tested restore (S16), backups encrypted | not built |
| T16 | Unpatched software | Process: dependency and image updates on a schedule; subscribe to security notices of the CMS and Next | not built |
| T17 | Server compromise via exposed ports or SSH | Firewall (ufw already on), key-only SSH, no database port exposed publicly, Coolify panel access restricted | partly in place |
| T18 | Denial of service on the editor or site | Static pages absorb reader traffic; CMS isolated in its own container so it cannot starve the site; upload limits | design |
| T19 | Insider mistake by an agent or human | Production actions need the human's go-ahead (S5); PR reviews; no direct pushes to `main` | rule |
| T20 | Phishing of non-technical staff, leading to subtle edits (fake quotes, malicious links) rather than obvious defacement | T8 second factor; editor review before publish; version history so changes can be audited and reverted; short guidance for writers on phishing | not built, Phase 1 |
| T21 | Server secrets bundled into public JavaScript (a `NEXT_PUBLIC_` prefix or a server module imported by a client component) | Never prefix secrets with `NEXT_PUBLIC_`; keep secret access in server-only modules (the `server-only` package); reviewers grep for `NEXT_PUBLIC_` on every PR that adds env vars | rule, Phase 1 |

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
