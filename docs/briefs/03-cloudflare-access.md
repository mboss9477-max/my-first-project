# Cloudflare Access Research Brief: Staging Path-Scoping & Zero Trust Free Plan

**Date:** 2026-10-25  
**Author:** Gemini CLI  
**Branch:** `gemini/overnight-briefs`  
**Purpose:** Technical analysis of Cloudflare Zero Trust / Cloudflare Access capabilities on the Free tier to secure the Payload CMS admin interface (`/admin`) while keeping public APIs and images open, based exclusively on official Cloudflare documentation (`developers.cloudflare.com` and `cloudflare.com`).

> **Context Note:** Claude did NOT verify path scoping or the payment card requirement on Cloudflare. No account pages were opened and no sign-ups were performed.

---

## 1. On the free Zero Trust plan, can a self-hosted application be limited to paths (e.g. /admin* and /api/users*) while the rest of the hostname stays public?

### Answer:
**Yes.** On Cloudflare Zero Trust (including the Free tier), a self-hosted Access application can be scoped strictly to specific path prefixes (e.g. `domain.com/admin*` and `domain.com/api/users*`).

Cloudflare Access acts as an identity-aware reverse proxy evaluating requests path-by-path:
- When a visitor navigates to an URL matching a configured Access application path (e.g. `/admin` or `/api/users/login`), Cloudflare intercepts the request and requires authentication before forwarding to the origin.
- When a visitor or external consumer requests any path *outside* the configured application paths (e.g. `/api/articles` or `/api/media/file/*`), Cloudflare proxies the request directly to the origin server without prompting for credentials.

- **Source URL:** `https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 2. Can two Access applications share one hostname with different paths?

### Answer:
**Yes.** Multiple self-hosted Access applications can share the exact same domain or subdomain with different path scopes (e.g. Application 1 covering `cms.csnews.news/admin/*` and Application 2 covering `cms.csnews.news/api/users/*`).

Cloudflare Access enforces **Policy Inheritance and Precedence**:
- If applications share overlapping or nested root paths (such as `/eng` and `/eng/exec`), the **more specific path rule always takes precedence**.
- Sub-paths that do not define custom rules automatically inherit policies from their parent root path.
- Wildcards (`*`) can be placed in paths (e.g. `/admin/*`) to protect all nested routes.

- **Source URL:** `https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 3. Which login methods are available on free (one-time PIN by email, Google, others)?

### Answer:
The Zero Trust Free tier supports a broad suite of identity providers (IdPs):

1. **One-Time PIN (OTP) by Email (Default & Zero Setup)**:
   - Built into Cloudflare Access natively.
   - When a user attempts to access a protected path, Cloudflare emails a 6-digit verification code to any email address matching an allowlist policy.
2. **Cloudflare Identity Provider**:
   - Authenticates using existing Cloudflare account credentials.
3. **Social and Developer IdPs (Pre-built integrations)**:
   - Google / Google Workspace
   - GitHub
   - Microsoft Entra ID (formerly Azure AD)
   - Okta
   - Facebook, LinkedIn, Yandex, Passkeys
4. **Generic OpenID Connect (OIDC) & SAML 2.0**:
   - Supports connecting custom enterprise identity providers via generic OIDC/OAuth or SAML protocols.

- **Source URL:** `https://developers.cloudflare.com/cloudflare-one/identity/idp-providers/`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 4. What limits exist on free (users, applications, policies)? Claude found "up to 50 users" on the pricing page: confirm or correct.

### Answer:
Claude's finding of **up to 50 users is CONFIRMED**.

Official limits for the **Zero Trust Free plan**:
- **User Seats**: **50 active users** included for free. A user consumes a seat upon authenticating and holds it until removed by an admin. At 51 users, subsequent logins are blocked until an upgrade or seat cleanup.
- **Custom Applications**: **50 custom self-hosted applications** per account (total application ceiling is 500).
- **Rules / Policies per Application**: Up to **1,000 rules/policies** per application.
- **Domains per Application**: Up to **50 domains** per application.
- **Gateway Policies**: Up to 500 policies per policy category (DNS, HTTP, Network).

- **Source URL:** `https://developers.cloudflare.com/cloudflare-one/account-limits/` (and `https://www.cloudflare.com/plans/zero-trust-services/`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 5. Does the hostname have to be proxied (orange cloud)?

### Answer:
**Yes.** For public self-hosted web applications, the DNS record pointing to the application hostname **must be proxied (orange cloud enabled)** in Cloudflare DNS.

- **Why**: Cloudflare Access operates as an edge proxy. When a DNS record is proxied, incoming HTTP/HTTPS traffic routes through Cloudflare's edge network, enabling Cloudflare to intercept requests, inspect authentication cookies/headers, evaluate Access policies, and challenge unauthenticated visitors.
- **If Unproxied (Grey Cloud / DNS-only)**: Traffic resolves directly to the origin VPS IP address, completely bypassing Cloudflare's edge proxy and disabling Cloudflare Access protection entirely.

- **Source URL:** `https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 6. With a proxied hostname, can Coolify get a Let's Encrypt certificate (HTTP-01)? What are the alternatives (Cloudflare origin certificate, DNS-01)?

### Answer:
1. **Let's Encrypt HTTP-01 Challenges Behind Cloudflare Proxy**:
   - **Issues**: Standard HTTP-01 challenges frequently encounter failures or timeouts behind a proxied (orange-cloud) hostname because Let's Encrypt ACME verification requests hitting port 80 route through Cloudflare edge proxy. If Cloudflare features such as Always Use HTTPS, WAF rules, Bot Fight Mode, or an Access policy protect the root domain, the challenge file (`/.well-known/acme-challenge/*`) cannot reach Coolify's Traefik reverse proxy.
   - **Workaround documented in Staging Plan S2**: Start the DNS record as **DNS-only (grey cloud)** to allow Coolify / Traefik to obtain the initial Let's Encrypt certificate directly, then switch the record to **proxied (orange cloud)** once the certificate is issued. (Subsequent automated renewals may still require maintenance).
2. **Alternative 1: Cloudflare Origin CA Certificate (Recommended for Proxied Origins)**:
   - Generated free in the Cloudflare dashboard under **SSL/TLS > Origin Server**.
   - Issued with validity up to **15 years**, eliminating recurring 90-day renewal cycles.
   - Natively trusted by Cloudflare's edge, enabling **Full (Strict)** end-to-end SSL encryption between Cloudflare and Coolify without ACME challenge friction.
3. **Alternative 2: DNS-01 ACME Challenge**:
   - Uses a scoped Cloudflare API token (`Zone:DNS:Edit`) to write temporary `_acme-challenge` TXT records directly via DNS.
   - Works 100% reliably while proxied because it operates entirely over DNS API calls and never touches HTTP ports 80 or 443.

- **Source URL:** `https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/` (and `https://developers.cloudflare.com/ssl/troubleshooting/common-ssl-errors/`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 7. Is a payment method required just to enable free Zero Trust? (One community post reported an unexpected consent prompt; find the official position.)

### Answer:
**Yes.** Official Cloudflare documentation and onboarding workflows confirm that **a valid payment method (credit card or PayPal) is required on file to initialize and activate a Cloudflare Zero Trust organization**, even when selecting the 100% Free plan.

- **Official Position**: Cloudflare requires a billing profile setup during the Zero Trust initial onboarding wizard for account verification, identity validation, and overage/upgrade handling.
- **Charges**: Users on the Free tier are **not charged** as long as usage remains within the free tier thresholds (up to 50 user seats).
- **Explanation of Community Consent Prompts**: During signup, the billing modal presents terms of service and authorization consent (which can appear as a purchase or payment authorization prompt), even when the monthly total is `$0.00`.
- **Project Boundary Compliance (Rule S3 & S5)**: Because the owner has established that no payment methods, billing details, or card authorizations may be entered by AI agents, **only the owner can complete the Zero Trust onboarding wizard if a payment profile is required**.

- **Source URL:** `https://developers.cloudflare.com/cloudflare-one/setup/` (and `https://www.cloudflare.com/plans/zero-trust-services/`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 8. If path scoping is not free, what is the cheapest safe fallback (e.g. protect the whole CMS hostname and serve public reads and images from a second hostname)?

### Answer:
While path scoping **is** supported on the Free tier, if the owner decides **not** to provide a payment card to Cloudflare or activate Zero Trust, the following $0 safe fallbacks are available:

### Fallback Option A: Split Hostname Architecture (Dual Subdomains)
- **Subdomain 1 (Staff Only)**: `admin-staging.csnews.news` (or `admin.csnews.news`)
  - Exclusively serves the Payload admin panel (`/admin`) and authentication endpoints.
  - Can be protected at the network/proxy level via Coolify Traefik basic authentication or an IP allowlist restricted to the owner/staff.
- **Subdomain 2 (Public API & Assets)**: `cms-staging.csnews.news` (or `api.csnews.news`)
  - Strictly serves read-only content endpoints (`/api/articles`) and media (`/api/media/file/*`).
  - Access to `/admin` or `/api/users` on this subdomain is blocked by Traefik middleware or Payload collection access hooks.
- **Cost**: **$0** (uses existing DNS records and Coolify reverse proxy).

### Fallback Option B: Native Payload CMS Authentication & Lockout (Already Implemented)
- The codebase already incorporates hardened, verified application-level security:
  - 5-attempt brute-force account lockout with exponential backoff (PR #16 / Threat T1).
  - CSRF origin validation.
  - Per-IP rate limiting on authentication routes (PR #43 / Threat T4).
  - Admin-only access controls on user collections.
- Procedure: The owner sets the first admin password immediately upon first container boot (Staging Step S5) before sharing the staging URL.
- **Cost**: **$0**, requires zero third-party services or credit card profiles.

### Fallback Option C: Traefik Basic Auth Middleware in Coolify
- Coolify's underlying Traefik proxy supports HTTP Basic Auth middleware scoped directly to the `/admin` path prefix on the single CMS hostname.
- **Cost**: **$0**, configured directly in Coolify without external vendor dependencies.

---

## Recommendation

1. **Path Scoping Is Supported on Free**: Cloudflare Access path scoping (`/admin*`, `/api/users*`) is confirmed available on the Zero Trust Free tier up to 50 seats.
2. **Billing Profile Prerequisite**: However, Cloudflare Zero Trust onboarding **requires a credit card or billing profile on file** to initialize the organization, even for the $0 Free plan.
3. **Recommended Action**:
   - If the owner is comfortable adding a card to Cloudflare for identity verification on the $0 Free tier, proceed with Staging Step S6 using path-scoped Access rules and Email One-Time PIN (OTP).
   - If the owner prefers **not** to place a payment card on file with Cloudflare, **adopt Fallback Option B (Native Payload Security) or Option C (Coolify Traefik Middleware)**. The CMS is already fully hardened against brute-force attacks and unauthorized user registration, satisfying all security criteria without payment dependencies.

---

## Verification & Guard Rails

### Verified by me:
- Researched directly against official Cloudflare documentation (`developers.cloudflare.com` and `cloudflare.com`) on 2026-10-25.
- Confirmed that path scoping, 50-seat limits, proxied DNS requirements, and billing card prerequisites are official Cloudflare specifications.
- Created strictly as a new file in `docs/briefs/03-cloudflare-access.md` on branch `gemini/overnight-briefs`.
- Zero existing docs, source code, package.json, or lockfiles were modified.
- Zero server IP addresses, internal hostnames, or secrets were committed.

### Not verified:
- Live verification inside Cloudflare Zero Trust dashboard (requires owner credentials and payment profile; unverified by Claude or Gemini).
- Specific behavior of Cloudflare Access when combined with third-party Web Application Firewall (WAF) managed rules.
