/** @type {import('next').NextConfig} */
let versionInfo = { version: "1.3.0", displayVersion: "v1.3.0", fullVersion: "v1.3.0" };
try {
  versionInfo = require("./src/version.json");
} catch (e) {}

const nextConfig = {
  // output: "standalone",
  basePath: "/admin",
  reactStrictMode: false,
  swcMinify: true,
  env: {
    // For Local Server
    API_PROD_URL: "https://mstore.primeads.ai/api/",
    // API_PROD_URL: "http://127.0.0.1:8000/api",
    // API_PROD_URL: "https://laravel.pixelstrap.net/Mstore/api/",
    NEXT_PUBLIC_APP_VERSION: versionInfo.version,
    NEXT_PUBLIC_APP_DISPLAY_VERSION: versionInfo.displayVersion,
    NEXT_PUBLIC_APP_FULL_VERSION: versionInfo.fullVersion,
    NEXT_PUBLIC_APP_BUILD_DATE: versionInfo.buildDate || "",
    NEXT_PUBLIC_APP_GIT_COMMIT: versionInfo.gitCommit || "",
  },
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/en/dashboard",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "10.0.2.2",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "10.0.2.2",
      },
      {
        protocol: "https",
        hostname: "laravel.pixelstrap.net",
      },
      {
        protocol: "https",
        hostname: "mstore.primeads.ai",
      },
    ],
  },
  devIndicators: {
    buildActivity: false,
  },
};

module.exports = nextConfig;
