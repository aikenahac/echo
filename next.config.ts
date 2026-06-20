import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const baseUrl = new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: baseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: baseUrl.hostname,
        ...(baseUrl.port ? { port: baseUrl.port } : {}),
        pathname: "/api/cdn/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
