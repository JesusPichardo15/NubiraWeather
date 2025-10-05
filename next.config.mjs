/** @type {import('next').NextConfig} */
const nextConfig = {
  // Help Next.js correctly identify the workspace root when multiple lockfiles exist
  outputFileTracingRoot: process.cwd(),
  // Expose HF base at build time for client hints if needed (non-secret)
  env: {
    NEXT_PUBLIC_HF_SPACE_BASE: process.env.HF_SPACE_BASE || ''
  },
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
