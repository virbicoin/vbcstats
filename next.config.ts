import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16+ default)
  turbopack: {
    resolveAlias: {
      '@': '.',
    },
  },

  // Server external packages
  serverExternalPackages: ['geoip-lite'],
};

export default nextConfig;
