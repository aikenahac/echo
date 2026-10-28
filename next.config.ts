import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Uploaded collection covers / profile pictures are served from S3 (or a CDN in
// front of it). Must be set at build time for next/image to allow the host.
const s3PublicUrl = process.env.AWS_S3_PUBLIC_URL
  ? new URL(process.env.AWS_S3_PUBLIC_URL)
  : null;

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  experimental: {
    agentUpgrade: "security",
  },
  images: {
    remotePatterns: [
      ...(s3PublicUrl
        ? [
            {
              protocol: s3PublicUrl.protocol.replace(":", "") as "http" | "https",
              hostname: s3PublicUrl.hostname,
              pathname: `${s3PublicUrl.pathname.replace(/\/$/, "")}/**`,
            },
          ]
        : []),
    ]
  }
};

export default withNextIntl(nextConfig);
