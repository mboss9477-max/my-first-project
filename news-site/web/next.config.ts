import type { NextConfig } from "next";

import { projectId } from "./src/sanity/env";

/**
 * A nonce-based CSP (Next's recommended strict approach) requires reading a
 * per-request nonce, which forces dynamic rendering on every page — that would
 * undo the SSG on every article/category/topic/author route. This is the
 * static alternative: real restrictions, applied at the header layer so it
 * costs nothing at build time.
 *
 * 'unsafe-inline' on script-src covers Next's own inline hydration data and
 * the inline JSON-LD blocks on article/category/breadcrumb pages; without
 * nonces there is no tighter option that does not break those.
 */
// Dev needs 'unsafe-eval' for React's debugging callstacks; production never
// uses eval and must not carry the relaxation.
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // cdn.sanity.io: real hero/body images. picsum.photos: the placeholder
  // fallback only — remove once src/lib/placeholder-articles.ts is deleted.
  "img-src 'self' data: blob: https://cdn.sanity.io https://picsum.photos",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
        // Scoped to this Sanity project's assets.
        pathname: `/images/${projectId}/**`,
        // `search` intentionally omitted: the Sanity image URL builder appends
        // query params (w, h, auto=format, fit) that must be allowed through.
      },
      {
        // Placeholder photos for the fake articles, used only while the Sanity
        // dataset is empty. Remove alongside src/lib/placeholder-articles.ts.
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/seed/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
