import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['cloudinary'],
  experimental: {
    // Increase body size limit for API routes (AWS Amplify limit is 6MB)
    serverComponentsExternalPackages: ['cloudinary'],
  },
  // Configure API route body size limit
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

export default nextConfig;
