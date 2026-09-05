import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles" workspace root warning
  outputFileTracingRoot: path.join(__dirname),

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
