import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      {
        source: "/auth/sign-in",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/auth/sign-up",
        destination: "/signup",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
