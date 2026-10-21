/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore eslint errors during builds as well
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;