import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CITYWALK – AI Walking Guide",
    short_name: "CITYWALK",
    description: "Explore more. Plan less. Build personalized city walks with CITYWALK.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#0E2C44",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
