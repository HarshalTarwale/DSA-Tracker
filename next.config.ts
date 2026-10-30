import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off: every page reads the session cookie and live
  // progress data, so the app uses fully dynamic rendering (see README → Decisions).
  reactCompiler: true,
  serverExternalPackages: ["exceljs"],
  experimental: {
    // JSON backup import is sent through a Server Action.
    serverActions: { bodySizeLimit: "8mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
