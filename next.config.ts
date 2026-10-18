import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Keep visited pages in the client router cache for 30s, so flipping between Games and League
    // (or coming back from a game) is instant. Server actions still refresh via revalidatePath.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      {
        // App icons: named files that never change in place, so let phones keep them.
        source: "/:file(icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        // The service worker must be re-checked so push handling updates roll out.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
