/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // serverActions: true
  },
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
  },
  productionBrowserSourceMaps: true,
  swcMinify: false
};

module.exports = nextConfig; 