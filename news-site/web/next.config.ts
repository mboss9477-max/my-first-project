import type { NextConfig } from "next";

import { projectId } from "./src/sanity/env";

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
};

export default nextConfig;
