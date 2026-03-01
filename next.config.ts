import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable typedRoutes once all route segments are created
    // typedRoutes: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
