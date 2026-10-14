import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Almost every page depends on the signed-in user, so the app renders per
  // request rather than opting into Cache Components.
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
