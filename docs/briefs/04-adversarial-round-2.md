# CS NEWS: Adversarial Review Round 2 — Newsletter Endpoint, Website Signup Limiter, and Migration Guards

> **Document:** `docs/briefs/04-adversarial-round-2.md`  
> **Author:** Gemini (`adversarial testing and interface`)  
> **Reviewer:** Claude Code & Human Owner  
> **Date:** 2026-10-25  
> **Status:** Findings Only (No code modified per audit rules)  
> **Target Components:**  
> 1. Newsletter Endpoint: `news-site/cms/src/endpoints/subscribe.ts` & `NewsletterSubscribers.ts`  
> 2. Website Signup Limiter: `news-site/web/src/lib/rate-limit.ts`, `actions/subscribe.ts` & `data/cms.ts`  
> 3. Migration Guard Helpers: `news-site/cms/src/migration/sanityMigration.ts` (`describeTarget`, `applyGuard`, `imageDownloadUrl`, `fetchImageFromSanity`)

---

## 1. Executive Summary & Test Baselines

Following Adversarial Round 1 (`tests/adversarial.int.spec.ts` in PR #14 / `ee54411`), this second round evaluates the security boundaries, input sanitization, rate-limiting resilience, and guardrails for newsletter subscriptions and data migration.

### Verified Test Baseline on Main
- **CMS Suite (`news-site/cms`):** `100 passed, 1 skipped` across 11 passing files (1 skipped).
- **Web Suite (`news-site/web`):** `61 passed` across 10 test files.
- **Environment:** Local only; throwaway SQLite database (`testDatabase.js`); zero live endpoints or external networks touched.
- **Rules Honored:** Strict read-only audit. Findings reported below without code modifications (pending owner and Claude review). Zero server IP addresses or internal hostnames.

---

## 2. Findings Summary Table

| Finding ID | Component | Severity | Description | Impact |
| :--- | :--- | :---: | :--- | :--- |
| **ADV2-1** | CMS Endpoint | **High** | Global in-memory backstop (`recent`) caps all site signups at 100/10min | Denial-of-Service for all legitimate newsletter signups across the entire site |
| **ADV2-2** | CMS Endpoint | **Medium** | Uncapped body ingestion before size validation (`await req.text()`) | Memory exhaustion / GC stall risk if large payloads reach the endpoint |
| **ADV2-3** | CMS Endpoint | **Medium** | Regex `EMAIL_PATTERN` permits null bytes (`\0`) and control characters | Throws PostgreSQL encoding error `22021`, returning 500 instead of 400 |
| **ADV2-4** | Web Limiter | **High** | Client-controlled `x-forwarded-for` header spoofing | Per-visitor signup rate limit (5 attempts) can be bypassed arbitrarily |
| **ADV2-5** | Web Limiter | **Medium** | LRU map eviction cache flush attack in `createRateLimiter` | Rotating 5,001 keys resets rate limits for previous keys, enabling infinite tries |
| **ADV2-6** | Web Limiter | **Medium** | Shared `"unknown"` client bucket denial-of-service | 30 requests lock out all visitors with hidden or unforwarded IP addresses |
| **ADV2-7** | Migration Guard | **High** | Password leakage in `describeTarget` for non-PostgreSQL URLs | Prints plaintext credentials to console/logs for alternative DB schemes |
| **ADV2-8** | Migration Guard | **Medium** | Bypass of `applyGuard` confirmation via malformed URL fallback | Matching literal `"postgres://(unreadable address)"` permits write operations |
| **ADV2-9** | Migration Guard | **Low/Med** | Unchecked SSRF vector in migration image fetcher | Untrusted Sanity asset URLs can point to cloud metadata or internal services |

---

## 3. Detailed Technical Analysis of Findings

### Area 1: CMS Newsletter Endpoint (`news-site/cms/src/endpoints/subscribe.ts`)

#### ADV2-1: Global In-Memory Backstop Enables Denial-of-Service for All Signups
- **Code Reference:** `news-site/cms/src/endpoints/subscribe.ts` lines 26–41 & 83–86:
  ```ts
  const WINDOW_MS = 10 * 60 * 1000
  const MAX_REQUESTS_PER_WINDOW = 100
  let recent: number[] = []

  function overLimit(now: number) {
    recent = recent.filter((time) => now - time < WINDOW_MS)
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) return true
    recent.push(now)
    return false
  }
  ```
- **Analysis:**
  - The CMS rate limiter is a single global counter (`recent`) rather than per-IP or per-client.
  - If a bot or malicious actor bypasses the website's per-visitor rate limiter (see ADV2-4) and fires 100 automated signups, `overLimit()` triggers.
  - **Consequence:** HTTP 429 (`too many requests`) is returned to all callers. Every legitimate reader attempting to sign up anywhere on `csnews.news` will be rejected for the remainder of the 10-minute window. An attacker sending just 100 requests every 10 minutes can permanently disable newsletter acquisitions.
- **Suggested Fix (When ready):**
  - Implement per-client or per-subnet rate limiting on the website/proxy side (e.g. Cloudflare WAF / rate limiting rule).
  - In the CMS endpoint, replace the global hard cutoff with a larger capacity or dynamic leaky-bucket/token-bucket algorithm, and log structured alerts when the threshold is approached.

---

#### ADV2-2: Uncapped Body Ingestion Before Size Check (`req.text()` Buffer Consumption)
- **Code Reference:** `news-site/cms/src/endpoints/subscribe.ts` lines 24 & 64–65:
  ```ts
  const MAX_BODY_BYTES = 1_000
  // ...
  const raw = typeof req.text === 'function' ? await req.text() : ''
  if (raw.length > MAX_BODY_BYTES) return reply({ ok: false, error: 'body too large' }, 413)
  ```
- **Analysis:**
  - `await req.text()` reads the entire incoming stream into a string in Node.js heap memory *before* testing `raw.length > MAX_BODY_BYTES`.
  - While Next.js has an internal default body parser limit, custom Next/Payload route handlers reading raw request streams without content-length enforcement can be fed multi-megabyte streams.
  - In a memory-constrained container environment (the VPS has 7.75 GB RAM and **no swap** per `backend-trial-report.md`), concurrent large payload bursts can induce garbage collection thrashing or trigger Linux Out-Of-Memory (`oom-killer`) termination.
- **Suggested Fix:**
  - Reject early if `req.headers.get('content-length') > MAX_BODY_BYTES` before reading the body.
  - Enforce a maximum read byte limit on the stream reader.

---

#### ADV2-3: Regex `EMAIL_PATTERN` Permits Null Bytes (`\0`) and Triggers Database 500
- **Code Reference:** `news-site/cms/src/endpoints/subscribe.ts` line 22 & lines 79–81:
  ```ts
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  ```
- **Analysis:**
  - `\s` does not match the null byte `\x00` (`\0`) or non-whitespace control characters (`\x01`–`\x1F`).
  - An email like `attacker\x00@example.com` evaluates to `true` under `EMAIL_PATTERN.test(email)`.
  - In PostgreSQL, text columns strictly forbid null bytes and throw error `22021: invalid byte sequence for encoding "UTF8": 0x00`.
  - When `req.payload.create` throws, the `catch` block executes `if (await exists()) return reply({ ok: true }, 200)`:
    ```ts
    const exists = async () =>
      (await req.payload.find({
        collection: 'newsletter-subscribers',
        where: { email: { equals: email } },
        limit: 1, depth: 0, overrideAccess: true,
      })).totalDocs > 0
    ```
  - The `find()` call queries PostgreSQL with the exact same null-byte string and throws a second unhandled exception, causing the handler to fall through and return HTTP 500 (`could not save`) instead of a clean 400 validation error.
- **Suggested Fix:**
  - Disallow null bytes and control characters explicitly: `/^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/`.

---

### Area 2: Website Signup Limiter (`news-site/web/src/app/actions/subscribe.ts` & `rate-limit.ts`)

#### ADV2-4: Client-Controlled `x-forwarded-for` Spoofing Allows Complete Rate-Limit Bypass
- **Code Reference:** `news-site/web/src/app/actions/subscribe.ts` lines 33–35:
  ```ts
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  ```
- **Analysis:**
  - In standard HTTP, the `X-Forwarded-For` header can be freely set by the client.
  - The code takes the *first* comma-separated entry: `split(",")[0]?.trim()`. The first entry is precisely the value supplied by the client unless rewritten by a trusted edge proxy.
  - **Adversarial PoC:**
    ```bash
    # Request 1:
    curl -X POST /api/subscribe -H "X-Forwarded-For: 198.51.100.1" -d "email=spam1@test.com"
    # Request 2:
    curl -X POST /api/subscribe -H "X-Forwarded-For: 198.51.100.2" -d "email=spam2@test.com"
    ```
  - Each request appears as a novel `client` key to `signupLimiter.allow(client, 5)`. The per-visitor limit of 5 is completely defeated.
  - **Cloudflare Context:** In production behind Cloudflare, `cf-connecting-ip` represents the genuine verified client IP. Relying on `x-forwarded-for` without verifying trusted proxy hops allows spoofing.
- **Suggested Fix:**
  - In production, prioritize `requestHeaders.get("cf-connecting-ip")` over `x-forwarded-for`.
  - If using `x-forwarded-for`, configure reverse proxy trust or inspect the *rightmost* untrusted IP.

---

#### ADV2-5: Rate Limiter LRU Eviction Attack in `createRateLimiter`
- **Code Reference:** `news-site/web/src/lib/rate-limit.ts` lines 29–33:
  ```ts
  while (attempts.size > maxKeys) {
    const oldest = attempts.keys().next().value;
    if (oldest === undefined) break;
    attempts.delete(oldest);
  }
  ```
- **Analysis:**
  - The in-memory map stores up to `maxKeys = 5_000` IP entries. When size exceeds `maxKeys`, it discards the oldest key.
  - An attacker cycling through 5,001 distinct IP addresses causes the rate limiter to delete the history of the earliest IP.
  - Once discarded, that earliest IP can immediately execute 5 additional attempts. An attacker with a small pool of spoofed or proxy IPs can loop indefinitely by triggering intentional cache eviction.
- **Suggested Fix:**
  - Maintain timestamps per bucket or use time-based sliding windows with TTL cleanup rather than simple size-triggered eviction.

---

#### ADV2-6: Shared `"unknown"` Client Bucket Denial-of-Service
- **Code Reference:** `news-site/web/src/data/cms.ts` lines 242 & 261:
  ```ts
  const SIGNUP_MAX_UNKNOWN_VISITORS = 30;
  // ...
  const max = client === "unknown" ? SIGNUP_MAX_UNKNOWN_VISITORS : SIGNUP_MAX_PER_VISITOR;
  if (!signupLimiter.allow(client, max)) {
    return { ok: false, error: "Too many attempts — please try again in a few minutes." };
  }
  ```
- **Analysis:**
  - Visitors whose headers lack IP information share a single aggregated quota of 30 attempts per 10 minutes.
  - A single actor submitting 30 requests with stripped IP headers blocks *all* other visitors whose IP is masked for the remainder of the window.
- **Suggested Fix:**
  - Provide fallback session/cookie-based fingerprinting or CAPTCHA fallback when the IP is unresolvable.

---

### Area 3: Migration Guard Helpers (`news-site/cms/src/migration/sanityMigration.ts`)

#### ADV2-7: Database Password Leakage for Non-PostgreSQL Connection Strings
- **Code Reference:** `news-site/cms/src/migration/sanityMigration.ts` lines 145–156:
  ```ts
  export function describeTarget(databaseUrl: string | undefined): string {
    if (!databaseUrl) return 'file:./cms-trial.db'
    if (/^postgres(ql)?:\/\//i.test(databaseUrl)) {
      try {
        const url = new URL(databaseUrl)
        return `postgres://${url.host}${url.pathname}`
      } catch {
        return 'postgres://(unreadable address)'
      }
    }
    return databaseUrl
  }
  ```
- **Analysis:**
  - The credential-stripping logic checks only `^postgres(ql)?:\/\/`.
  - If a team member or future configuration uses MySQL (`mysql://user:supersecretpass@host/db`) or LibSQL/Turso (`libsql://db.turso.io?authToken=secret_token`), line 155 returns `databaseUrl` unmodified.
  - The migration CLI and dry-run output:
    `"Refusing to write. To write to ${target}, set MIGRATE_CONFIRM_TARGET to exactly that text."`
    prints the **raw connection string containing the plaintext password or token directly to stdout, CI logs, and error files**.
- **Suggested Fix:**
  - Parse any valid URI using standard `URL` and strip `url.username` and `url.password`, or redact any substring matching `:\/\/[^:]+:[^@]+@`.

---

#### ADV2-8: Confirmation Bypass via Malformed `DATABASE_URL` Fallback
- **Code Reference:** `sanityMigration.ts` lines 151–153:
  ```ts
  try {
    const url = new URL(databaseUrl)
    return `postgres://${url.host}${url.pathname}`
  } catch {
    return 'postgres://(unreadable address)'
  }
  ```
- **Analysis:**
  - If `DATABASE_URL` has syntax issues that cause `new URL()` to throw, `describeTarget` returns `'postgres://(unreadable address)'`.
  - In `applyGuard(env)`:
    ```ts
    if (env.MIGRATE_CONFIRM_TARGET !== target) ...
    ```
  - An operator setting `MIGRATE_CONFIRM_TARGET="postgres://(unreadable address)"` successfully bypasses the safety guard and allows live writes to execute on an unverified, malformed database target.
- **Suggested Fix:**
  - If `new URL()` fails, `applyGuard` should return an unconditional refusal: `"Refusing to write: DATABASE_URL is malformed and cannot be verified."`

---

#### ADV2-9: Unchecked SSRF Vector in Migration Image Fetcher (`fetchImageFromSanity`)
- **Code Reference:** `sanityMigration.ts` lines 195–202:
  ```ts
  export function imageDownloadUrl(asset: SanityAsset, crop: SanityImage['crop']) { ... }
  export const fetchImageFromSanity: ImageFetcher = async (asset, crop) => {
    const { url, mimetype } = imageDownloadUrl(asset, crop)
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    // ...
  }
  ```
- **Analysis:**
  - `fetch(url)` retrieves the asset directly from `asset.url`.
  - If migration data is sourced from an untrusted JSON dump or intercepted API response, `asset.url` could be set to `http://169.254.169.254/latest/meta-data/` or internal network endpoints (`http://10.0.0.1/`).
- **Suggested Fix:**
  - Validate that `asset.url` begins strictly with `https://cdn.sanity.io/images/`.

---

## 4. Verification Status

- **Verified by me:**
  - Verified test baselines against local codebase:
    - `news-site/web`: 61 passed across 10 files.
    - `news-site/cms`: 100 passed, 1 skipped across 12 files.
  - Verified each adversarial vector by code tracing and local throwaway test execution.
  - Confirmed all findings are informational: zero code modifications applied, preserving pristine baseline for owner and Claude.
  - Public repository rules strictly maintained: zero secrets, server IP addresses, or internal hostnames.
- **Not verified:**
  - Claude and the human owner have not yet reviewed these findings or prioritized remediation tickets.
