import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next"; 

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEV_AUTH: process.env.NODE_ENV === "production" ? "" : "true",
  },
  experimental: {
    optimizePackageImports: ["@xyflow/react"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
};

export default withWorkflow(nextConfig);
