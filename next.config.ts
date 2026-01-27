import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16+ default)
  turbopack: {
    resolveAlias: {
      '@': '.',
    },
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_WS_PORT: process.env['PORT_SERVER'] || '5000',
  },

  // Server external packages
  serverExternalPackages: ['geoip-lite'],

  // Proxy websocket and API endpoints to backend server (development only)
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    
    const backendPort = process.env['PORT_SERVER'] || '5000';
    return [
      {
        source: '/primus/:path*',
        destination: `http://localhost:${backendPort}/primus/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `http://localhost:${backendPort}/api/:path*`,
      },
      {
        source: '/external/:path*',
        destination: `http://localhost:${backendPort}/external/:path*`,
      },
    ];
  },

  // Headers configuration
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
