/** @type {import('next').NextConfig} */
const nextConfig = {
  // Response compression configuration
  // Next.js automatically compresses responses in production with gzip/brotli
  compress: true, // Enable compression (default in production)

  // Performance optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;

