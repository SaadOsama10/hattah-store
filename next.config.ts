import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // Custom loader: product photos have pre-generated small WebP variants in Supabase
    // Storage (see lib/image-variants.ts), so no dependence on Vercel's capped optimizer.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
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
