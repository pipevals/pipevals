import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next"; 

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@xyflow/react"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
};

export default withWorkflow(nextConfig);
