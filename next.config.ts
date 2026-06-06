import type { NextConfig } from 'next';

const nextConfig = {
  // Server external packages
  serverExternalPackages: ['geoip-lite'],
} satisfies NextConfig;

export default nextConfig;
