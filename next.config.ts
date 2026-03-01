import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "vyktgbnjjbkmpyucmpvs.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Note: Route-level maxDuration is set per page (e.g., 60s for bulk operations)
  // Default is 10s on Vercel Hobby plan, 300s max on Pro plan
};

export default withNextIntl(nextConfig);
