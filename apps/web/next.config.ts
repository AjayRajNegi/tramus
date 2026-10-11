import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tramus/ui", "@tramus/protocol"],
};

export default nextConfig;
