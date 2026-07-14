import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["http://21.0.11.106:81", "http://21.0.11.106:3000", "http://localhost:3000"],
};

export default nextConfig;
