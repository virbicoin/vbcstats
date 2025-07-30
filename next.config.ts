import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Pass backend WebSocket port to client
  env: {
    NEXT_PUBLIC_WS_PORT: process.env['PORT_SERVER'] || '5000',
  },
  // Disable HTTP/2 for compatibility
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Output configuration for production
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' as const }),
  // Proxy websocket and API endpoints to backend server (development only)
  async rewrites() {
    // Only use proxy in development environment
    if (process.env.NODE_ENV === 'development') {
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
    }
    return [];
  },
  // WebSocket support for development and optimization
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Handle geoip-lite data files for server-side usage
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('geoip-lite/data');
    }
    
    // Optimize chunk splitting for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
              maxSize: 200000, // Limit chunk size to 200KB
            },
          },
        },
      };
    }
    
    return config;
  },
  // Headers configuration to handle HTTP/2 issues
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
  /* config options here */
};

export default nextConfig;
