import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.14"],
  reactCompiler: true,
  transpilePackages: ["@citywalk/i18n", "@citywalk/traveler-core"],
};

export default nextConfig;
