import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
        // Scoped to this Sanity project's assets.
        pathname: "/images/crji8h2y/**",
        // `search` intentionally omitted: the Sanity image URL builder appends
        // query params (w, h, auto=format, fit) that must be allowed through.
      },
    ],
  },
};

export default nextConfig;
