import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Vercel's on-demand image optimization is capped on the free plan
    // (1,000 source images/month) and starts returning 402s past that —
    // Supabase Storage already serves these at a reasonable size, so skip
    // Next's optimizer and serve them as-is instead.
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Product photo uploads (multiple images per product, straight from a
      // phone camera) exceed the framework's 1MB default well before
      // client-side compression can help on its own.
      bodySizeLimit: "10mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
