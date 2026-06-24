/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@prisma/client"],
    webpackBuildWorker: false,
  },
};

export default nextConfig;
