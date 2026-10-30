import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Los recursos descargables de las lecciones se suben por Server Action.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
