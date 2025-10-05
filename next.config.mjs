/** @type {import('next').NextConfig} */
const nextConfig = {
  // Help Next.js correctly identify the workspace root when multiple lockfiles exist
  outputFileTracingRoot: process.cwd(),
  images: {
    domains: ['cdnjs.cloudflare.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
