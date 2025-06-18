import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Vercel Blob Storage
  images: {
    // Allow images from Vercel Blob Storage domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
