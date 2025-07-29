import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Pass backend WebSocket port to client
  env: {
    NEXT_PUBLIC_WS_PORT: process.env['PORT_SERVER'] || process.env['PORT'] || '3001',
  },
  // Proxy websocket and API endpoints to backend server on port 3001
  async rewrites() {
    return [
      {
        source: '/primus/:path*',
        destination: 'http://localhost:3001/primus/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
