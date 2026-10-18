import type { MetadataRoute } from "next";
import { TEAM_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${TEAM_NAME} Curling`,
    short_name: TEAM_NAME,
    description: "Schedule, lineups and scores for the team",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1f3d",
    theme_color: "#0f1f3d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
