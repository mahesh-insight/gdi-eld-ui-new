import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Node.js deployment
  output: 'standalone',
  
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

  // Page caching configuration for better performance
  experimental: {
    // Enable partial pre-rendering for better performance
    ppr: false, // Keep disabled to ensure proper SSR caching
    // Enable staleTimes for page-level caching
    staleTimes: {
      dynamic: 30, // 30 seconds for dynamic pages
      static: 300, // 5 minutes for static pages
    }
  },

  // Set headers for better caching
  async headers() {
    return [
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600, stale-while-revalidate=300', // 10 min cache
          },
        ],
      },
      {
        source: '/invoices/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600, stale-while-revalidate=300', // 10 min cache
          },
        ],
      },
      {
        source: '/azure-invoice/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600, stale-while-revalidate=300', // 10 min cache
          },
        ],
      },
    ];
  },
  webpack(config, { isServer }) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'gdi_eld_ui',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './AzureSpendWidget': './src/app/dashboard/components/AzureSpendWidgetFederated',
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
        },
        extraOptions: {
          skipSharingNextInternals: false,
        },
      })
    );
    return config;
  },
};

export default nextConfig;
