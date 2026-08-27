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
      // The legacy /admin/sync paths point straight at the run history rather
      // than at /admin/imports, which is itself only a redirect now.
      {
        source: "/admin/sync/courses",
        destination: "/admin/imports/courses",
        permanent: false,
      },
      {
        source: "/admin/sync/preview",
        destination: "/admin/imports/sync",
        permanent: false,
      },
      {
        source: "/admin/sync",
        destination: "/admin/imports/sync",
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
