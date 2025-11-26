// next.config.js
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

module.exports = (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */
  const nextConfig = {
    // You can manage environment variables here for the client-side
    // Server-side variables are handled via Next.js environment variables.
    env: {
      API_BASE_URL: process.env.API_BASE_URL,
      // ... other environment variables you need to expose to the client
    },
    
    // Configure assets and static files
    images: {
      unoptimized: true, // Optional: if you don't need Next.js image optimization
    },
    
    // Webpack customization (optional, but good for SVG)
    webpack: (config, { isServer }) => {
      // Allows Next.js to handle SVG imports with react-svg-loader or similar
      config.module.rules.push({
        test: /\.svg$/,
        issuer: {
        and: [/\.(js|ts|md)x?$/], // Only apply to JS/TS files
      },
        use: ['@svgr/webpack'],
      });
      
      // Handle the 'react-dom/server' alias if needed, though often unnecessary in Next.js
      if (!isServer) {
        config.resolve.alias['react-dom/server'] = 'react-dom/server.browser.js';
      }

      return config;
    },
  };

  return nextConfig;
};