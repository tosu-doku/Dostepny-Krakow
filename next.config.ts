import type { NextConfig } from "next";

const isExport = process.env.OUTPUT_EXPORT === 'true';
const basePath = process.env.BASE_PATH || '';

const nextConfig: NextConfig = {
  output: isExport ? 'export' : undefined,
  basePath: basePath || undefined,
  images: {
    unoptimized: isExport,
  },
};

export default nextConfig;
