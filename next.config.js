/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  experimental: {
    // Remove serverActions as it's now the default in Next.js 15
    optimizeCss: true, // Enable CSS optimization
    scrollRestoration: true, // Improve scroll performance
  },
  // External packages via transpilePackages instead of serverExternalPackages
  transpilePackages: ['sharp', 'onnxruntime-node'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'res.cloudinary.com',
      'img.clerk.com',
      'uploadthing.com',
      'utfs.io'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all hostnames
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400, // 24 hour cache for images
  },
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfills for browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
      };
      
      // Add buffer polyfill
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );
      
      // Add DefinePlugin to explicitly set browser environment
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.browser': true,
        })
      );
    }
    return config;
  },
  // Add response compression
  compress: true,
  // Add header configuration for caching static assets
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      },
      {
        // Cache static assets longer
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Add specific caching for CSS files
        source: '/_next/static/css/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate'
          }
        ]
      },
      {
        // Add specific caching for images
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000'
          }
        ]
      },
      {
        // Cache API responses
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300'
          }
        ]
      }
    ]
  },
  // Improve build output and minimize request size
  output: 'standalone',
  poweredByHeader: false,
};

module.exports = nextConfig; 