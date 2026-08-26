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
      {
        source: "/admin/sync/courses",
        destination: "/admin/imports/new",
        permanent: false,
      },
      {
        source: "/admin/sync/preview",
        destination: "/admin/imports/new",
        permanent: false,
      },
      {
        source: "/admin/sync",
        destination: "/admin/imports",
        permanent: false,
      },
      {
        source: "/admin/sync/:path*",
        destination: "/admin/imports/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
