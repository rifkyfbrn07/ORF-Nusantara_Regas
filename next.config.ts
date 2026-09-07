import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables Vercel Skew Protection for Server Actions and client chunks
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined,

  // Ensure deterministic build ID based on git commit if available
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || null;
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Prevent stale HTML caching on browser/CDN edge so client bundle hashes are always current
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|images|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
