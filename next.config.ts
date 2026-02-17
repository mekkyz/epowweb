import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  serverExternalPackages: ['better-sqlite3'],
  onDemandEntries: {
    // Keep pages in memory longer to reduce WebGL context recreation
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
