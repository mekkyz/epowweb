import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  onDemandEntries: {
    // Keep pages in memory longer to reduce WebGL context recreation
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
