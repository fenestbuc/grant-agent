import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://grant-agent-backend-90747239762.us-central1.run.app"}/:path*`, // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
