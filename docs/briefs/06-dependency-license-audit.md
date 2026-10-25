# Dependency and License Audit Report

Date: 2026-10-25  
Target Scope: `news-site/web` and `news-site/cms` in `C:\Users\mboss\Projects\my-first-project`.  
Methodology: Read-only audit executing `npm ci && npm audit --omit=dev`, `npm outdated`, and `npx license-checker --production` in each workspace. Zero modifications to `package.json` or `package-lock.json`.

---

## 1. Executive Summary

A comprehensive dependency security and legal licensing audit was conducted on October 25, 2026.

Key Takeaways:
- **Pinning Strategy Confirmed**: The public website is intentionally pinned to **Next.js 16.3.1** and the CMS to **Next.js 16.3.3** (required by Payload CMS v3 peer dependencies).
- **Vulnerability Reachability**: While `npm audit --omit=dev` flags 24 vulnerabilities in `web` and 13 in `cms`, **none of the vulnerable code paths are exposed to or reachable by public website visitors or unauthenticated users**. Transitive vulnerabilities stem from internal build tools (Vite, esbuild, Drizzle CLI), dev/test runners (Vitest), or admin-only controls (Monaco editor). Furthermore, SVG parsing vulnerabilities in `sharp` and Next.js Image Optimization are neutralised because SVG uploads are explicitly rejected by CMS MIME type rules and public media routes.
- **Licensing Compliance**: The vast majority of production dependencies use standard permissive open-source licenses (MIT, ISC, BSD-2/3, Apache-2.0). Packages using non-standard licenses (MPL-2.0, LGPL-3.0, BlueOak-1.0.0, CC-BY-4.0) were analyzed: **none impose copyleft or source disclosure obligations on the newsroom's private codebase**.

---

## 2. Workspace 1: `news-site/web`

### 2.1 Security Vulnerabilities (`npm audit --omit=dev`)
- **Total Production Vulnerabilities**: **24** (4 Critical, 10 High, 10 Moderate, 0 Low).
- **Total Dependencies Audited**: 270 prod, 254 dev, 167 optional, 774 peer (1,399 total tree).

#### Breakdown & Code Path Reachability
| Vulnerable Package | Severity | Advisory / CVE | Transitive Dependency Chain | Is Code Path Used by Us? | Reachability Analysis |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **`dompurify`** | **Critical** | GHSA-p98j-92pf-mc4p<br>GHSA-6688-9rhm-gjv2 | `next-sanity` -> `sanity` -> `@sanity/cli` -> `isomorphic-dompurify` -> `dompurify` | **NO** | `dompurify` is not imported or invoked anywhere in `news-site/web/src`. Content is rendered via structured React components (`@portabletext/react` and `LexicalBody`), never raw HTML innerHTML injection. |
| **`adm-zip`** | **High** | GHSA-vwc7-r8mq-g2x9<br>GHSA-7q85-xj36-vmfc | `next-sanity` -> `@sanity/cli` -> `@module-federation/vite` -> `@module-federation/dts-plugin` -> `adm-zip` | **NO** | ZIP archive extraction tool used exclusively inside Sanity CLI module federation tooling during build/type extraction. Never executed at runtime. |
| **`brace-expansion`** | **High** | GHSA-q2hr-2g5m-vwhr<br>GHSA-qhr7-859c-m2p7 | `next-sanity` -> `@sanity/cli` -> `@oclif/core` -> `brace-expansion` | **NO** | CLI argument expansion library in Sanity CLI. Not executed by website request handlers. |
| **`zod`** | **High** | GHSA-mrhx-c7xc-m3w5 | `next-sanity` -> `sanity` -> `zod` | **NO** | `zod` is not imported or used for request validation on the website. Website forms use simple regex pattern checks (`EMAIL_PATTERN`). |
| **`vite` / `@vitest/mocker` / `tinypool`** | **Critical** (via Vitest) | GHSA-82fw-gwwq-j7x9<br>GHSA-qxg6-89mg-rqv8 | `vitest` -> `@vitest/mocker`, `vite` | **NO** | Vitest testing framework and Vite dev middleware. Executed only locally during `npm test`, completely absent from production runtime builds. |
| **`undici`** | **Moderate** | GHSA-xjj6-f33q-929c | Transitive in `@module-federation/dts-plugin`, `jsdom`, Sanity CLI | **NO** | Next.js and Node 20+ runtime use the native global `fetch` API. |
| **`uuid`** | **Moderate** | GHSA-w5hq-g745-h8pq | `next-sanity` -> `@sanity/cli` -> `typeid-js` -> `uuid` | **NO** | CLI identifier generation only. |

### 2.2 Outdated Packages (`npm outdated`)
Packages more than one major version behind:
| Package | Current | Wanted | Latest | Major Versions Behind | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`@types/node`** | `20.19.43` | `20.19.43` | `26.6.5` | **6** | Node types kept aligned with Node 20 runtime target (`engines.node: ">=20"`). |
| **`typescript`** | `5.9.3` | `5.9.3` | `7.0.2` | **2** | Pinned to TypeScript 5.9; stable compiler. |
| **`vitest`** | `3.2.7` | `3.2.7` | `5.0.5` | **2** | Test runner; works reliably with existing test suites. |
| **`eslint`** | `9.39.5` | `9.39.5` | `10.13.0` | **1** | ESLint 9 flat-config; v10 is recent major release. |

*(Note: `next` is on 16.3.1 on purpose; `lucide-react` is on 1.31.0; `motion` on 13.1.1).*

### 2.3 Production License Summary (`web`)
- **Total Packages Analyzed**: 948
- **Permissive Standard Licenses**:
  - `MIT`: **816**
  - `Apache-2.0`: **39**
  - `ISC`: **38**
  - `BSD-2-Clause`: **14**
  - `BSD-3-Clause`: **9**
  - `0BSD`: **1**
  - `CC0-1.0` / `Public Domain` / `MIT-0`: **6**
- **Non-Standard & Non-Permissive Licenses**:
  - `BlueOak-1.0.0`: **8** (`@isaacs/ttlcache`, `chownr`, `isexe`, `lru-cache`, `minimatch`, `minipass`, `tar`, `yallist`)
  - `MPL-2.0`: **5** (`@vercel/stega@1.1.0`, `lightningcss@1.32.0`, `lightningcss@1.33.0`, `lightningcss-win32-x64-msvc`)
  - `Apache-2.0 AND LGPL-3.0-or-later`: **1** (`@img/sharp-win32-x64@0.35.3`)
  - `(MPL-2.0 OR Apache-2.0)`: **1** (`dompurify@3.4.13`)
  - `Python-2.0`: **1** (`argparse@2.0.1`)
  - `CC-BY-4.0`: **1** (`caniuse-lite@1.0.30001809`)
  - `UNLICENSED`: **1** (`web@0.1.0` root private package)

---

## 3. Workspace 2: `news-site/cms`

### 3.1 Security Vulnerabilities (`npm audit --omit=dev`)
- **Total Production Vulnerabilities**: **13** (2 Critical, 4 High, 6 Moderate, 1 Low).

#### Breakdown & Code Path Reachability
| Vulnerable Package | Severity | Advisory / CVE | Transitive Dependency Chain | Is Code Path Used by Us? | Reachability Analysis |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **`next`** | **Critical** | GHSA-vcvr-r3jv-pc5j<br>GHSA-3w37-wq28-93x7<br>GHSA-4jqv-mc3x-m676<br>GHSA-cjq9-62q9-8jv4 | Direct dependency (`next@16.3.3`) | **NO** | 1) `next/og ImageResponse` RCE is not used (CMS generates no OG images). 2) `use cache` leaks do not apply (CMS uses no experimental `use cache`). 3) SSG/ISR cache poisoning does not apply (CMS endpoints are dynamic API routes with `cache-control: no-store`). 4) SVG RCE in Image Optimization does not apply (CMS does not expose Next image optimizer). |
| **`dompurify`** | **Critical** | GHSA-p98j-92pf-mc4p<br>GHSA-6688-9rhm-gjv2 | `payload` -> `monaco-editor` -> `dompurify` | **NO** | Monaco Editor is rendered only inside authenticated Payload admin panels (`/admin*`). Public API routes never invoke Monaco Editor or DOMPurify. |
| **`sharp`** | **High** | GHSA-wq5f-xc86-pv6w (librsvg CVE-2026-96889) | Direct dependency (`sharp@0.35.4`) | **NO** | In `news-site/cms/src/collections/Media.ts`, allowed MIME types are strictly restricted to `['image/jpeg', 'image/png', 'image/webp', 'image/avif']`. SVG files are rejected before image processing, preventing `librsvg` invocation. Media upload is further restricted to authenticated staff (`access.create: isStaff`). |
| **`happy-dom`** | **High** | GHSA-834v-8h66-3h79 | `@payloadcms/richtext-lexical` -> `@lexical/headless` -> `happy-dom` | **NO** | Lexical headless DOM is used server-side only for serializing sanitized Lexical AST nodes to plaintext. Does not execute untrusted external web scripts. |
| **`esbuild`** | **Moderate** | GHSA-67mh-4wv8-2f99 | `@payloadcms/db-postgres` / `db-sqlite` -> `drizzle-kit` -> `@esbuild-kit/esm-loader` -> `esbuild` | **NO** | Drizzle ORM migration CLI tool. Never runs as an active HTTP dev server in production. |

### 3.2 Outdated Packages (`npm outdated`)
Packages more than one major version behind:
| Package | Current | Wanted | Latest | Major Versions Behind | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`@types/node`** | `22.19.9` | `22.19.9` | `26.6.5` | **4** | Node types aligned with Node 24 target for the CMS. |
| **`cross-env`** | `7.0.3` | `7.0.3` | `10.1.0` | **3** | CLI environment variable utility used in test/build scripts. |
| **`typescript`** | `5.7.3` | `5.7.3` | `7.0.2` | **2** | Stable TypeScript compiler pinned for Payload v3 compatibility. |
| **`graphql`** | `16.14.2` | `16.14.2` | `17.0.2` | **1** | Dependency of Payload GraphQL adapter. |
| **`vitest`** | `4.0.18` | `4.0.18` | `5.0.5` | **1** | Test runner. |

*(Note: `next` is pinned to 16.3.3 on purpose as required by Payload CMS; `sharp` is on 0.35.4).*

### 3.3 Production License Summary (`cms`)
- **Total Packages Analyzed**: 407
- **Permissive Standard Licenses**:
  - `MIT`: **361**
  - `BSD-3-Clause`: **14**
  - `ISC`: **13**
  - `Apache-2.0`: **9**
  - `BSD-2-Clause`: **1**
  - `0BSD`: **1**
- **Non-Standard & Non-Permissive Licenses**:
  - `Apache-2.0 AND LGPL-3.0-or-later`: **1** (`@img/sharp-win32-x64@0.35.4`)
  - `BlueOak-1.0.0`: **1** (`sax@1.6.1`)
  - `Python-2.0`: **1** (`argparse@2.0.1`)
  - `CC-BY-4.0`: **1** (`caniuse-lite@1.0.30001819`)
  - `(MPL-2.0 OR Apache-2.0)`: **1** (`dompurify@3.4.15`)
  - `WTFPL` / `WTFPL OR ISC` / `WTFPL OR MIT`: **3** (`sanitize-filename`, `truncate-utf8-bytes`, `utf8-byte-length`)
  - `UNLICENSED`: **1** (`cs-news-cms@0.1.0` root private package)

---

## 4. Plain-Language Legal Assessment of Non-Standard Licenses

What these licenses mean for a digital news publishing organization:

1. **MPL-2.0 (Mozilla Public License 2.0)**:
   - *Where found*: `@vercel/stega`, `lightningcss`.
   - *Legal meaning*: MPL-2.0 is a "file-level copyleft" license. If you edit or modify the actual source code files of `@vercel/stega` or `lightningcss`, you must publish those modified files under MPL-2.0. However, merely importing, bundling, or executing these packages alongside our custom newsroom software (Next.js components, CMS collections, articles) does **NOT** cause our software to become open-source. Because we use upstream unmodified packages, there is **zero copyleft risk**.
2. **LGPL-3.0-or-later (GNU Lesser General Public License v3)**:
   - *Where found*: `@img/sharp-win32-x64` (precompiled native image processing libraries such as libvips/glib).
   - *Legal meaning*: LGPL-3.0 requires that recipients of distributed software binaries have the freedom to relink or replace the LGPL library. Because CS NEWS is a self-hosted cloud web application where visitors only download rendered web pages and processed images over HTTP (Software-as-a-Service, not distributed client software like a desktop installer), standard LGPL distribution terms are **not triggered**. There is no requirement to disclose editorial code or CMS logic.
3. **BlueOak-1.0.0 (Blue Oak Model License 1.0.0)**:
   - *Where found*: Isaacs caching utilities (`lru-cache`, `minimatch`, `tar`), `sax`.
   - *Legal meaning*: A modern, clear, attorney-drafted permissive license published by the Blue Oak Council. It provides universal rights to use, modify, and distribute with zero copyleft obligations (strictly equivalent to MIT/Apache). **Safe for commercial and journalistic operations**.
4. **CC-BY-4.0 (Creative Commons Attribution 4.0)**:
   - *Where found*: `caniuse-lite` (database of browser CSS feature support used by Autoprefixer).
   - *Legal meaning*: Requires maintaining attribution in package notices. It does not contaminate application source code. **Safe**.
5. **Python-2.0**:
   - *Where found*: `argparse`.
   - *Legal meaning*: Permissive BSD-style license used by Python Software Foundation. **Safe**.
6. **WTFPL**:
   - *Where found*: UTF-8 byte calculation helper libraries.
   - *Legal meaning*: Public-domain dedication giving unconditional permission to do anything with the code. Imposes zero compliance overhead. **Safe**.
7. **UNLICENSED**:
   - *Where found*: `web@0.1.0` and `cs-news-cms@0.1.0`.
   - *Legal meaning*: This is our own code, designated `"private": true` to protect proprietary newsroom assets from accidental publication to public npm registries.

---

## 5. Verification Status

Verified by me:
- Clean execution of `npm ci && npm audit --omit=dev` and `npm outdated` in both `news-site/web` and `news-site/cms` on 2026-10-25.
- Analyzed all 24 web vulnerabilities and 13 CMS vulnerabilities against imported symbols and execution paths in application code.
- License census executed via `npx license-checker --production` across 948 packages in `web` and 407 packages in `cms`.
- Confirmed zero modifications to any `package.json` or `package-lock.json` file.
- Confirmed intentional Next.js version pinning: `16.3.1` (web) and `16.3.3` (cms).

Not verified:
- Potential dev-only vulnerabilities in build-time CLI tools executed during development outside production runtime (`--omit=dev`).
- Dynamic linking behaviors on alternative Linux distributions outside the standard Coolify/Docker production deployment container.
