import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Keep installation identity stable if the display name changes later.
    id: "/app",
    name: brand.name,
    short_name: brand.name,
    description:
      "Your days, in a bigger picture. Explore your sleep, readiness and activity over time.",
    lang: "en",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f8f8f5",
    theme_color: "#f8f8f5",
    icons: [
      {
        src: brand.assets.icon(192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: brand.assets.icon(512),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: brand.assets.icon(512),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
