/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true, // Re-enabled with proper deduplication in components
  
  // Show detailed error overlay in development
  devIndicators: {
    buildActivity: true,
  },
  
  // Enable ESLint during builds (fail on errors)
  eslint: {
    // Don't ignore ESLint errors during build
    ignoreDuringBuilds: false,
  },
  
  // Enable TypeScript checking during builds
  typescript: {
    // Don't ignore TypeScript errors during build
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
