import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next"; 

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@xyflow/react"],
  },
};

export default withWorkflow(nextConfig); 