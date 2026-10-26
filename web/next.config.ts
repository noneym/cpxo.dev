import type { NextConfig } from "next";

// Keep the request body limit in step with MAX_FILE_MB (default 4 GB), plus headroom.
const maxFileMb = Math.max(1, Number(process.env.MAX_FILE_MB ?? 4096));

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    proxyClientMaxBodySize: `${maxFileMb + 16}mb`,
  } as never,
};

export default nextConfig;
