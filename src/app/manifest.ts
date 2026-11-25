import type { MetadataRoute } from "next";

// Web app manifest: lets phones (and desktop Chrome/Edge) install the site to the home screen
// as its own app window. Icons come from scripts/make_brand.py.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Cardcaptor Stuart",
    short_name: "Cardcaptor",
    description: "A play-night menu built from one Magic collection: sealed boxes ready to draft and Commander decks grouped into pods.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FFF8FB",
    theme_color: "#FFF8FB",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Play Box", url: "/play-box", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Decks", url: "/decks", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
