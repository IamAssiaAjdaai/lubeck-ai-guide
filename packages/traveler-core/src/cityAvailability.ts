/** Launch availability is independent of CMS publication and source verification. */
export type CityAvailability = "available" | "coming_soon" | "unpublished";
export const cityLaunches: Readonly<
  Record<
    string,
    {
      status: CityAvailability;
      name: string;
      coordinates: { lat: number; lng: number };
      heroImage?: string;
      credit?: { text: string; href: string; license: string };
    }
  >
> = {
  lubeck: {
    status: "available",
    name: "Lübeck",
    coordinates: { lat: 53.8655, lng: 10.6866 },
    heroImage: "/landmarks/holstentor.jpg",
  },
  hamburg: {
    status: "coming_soon",
    name: "Hamburg",
    heroImage: "/images/city-hamburg.webp",
    credit: {
      text: "Avda · resized",
      href: "https://commons.wikimedia.org/wiki/File:Hamburg_-_Elbphilharmonie_-_2016-2.jpg",
      license: "https://creativecommons.org/licenses/by-sa/3.0/",
    },
    coordinates: { lat: 53.55, lng: 9.99 },
  },
  duesseldorf: {
    status: "coming_soon",
    name: "Düsseldorf",
    heroImage: "/images/city-duesseldorf.webp",
    credit: {
      text: "Turmfalke · CC0",
      href: "https://commons.wikimedia.org/wiki/File:Rheinturm,_Duesseldorf.jpg",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    coordinates: { lat: 51.2277, lng: 6.7735 },
  },
};
export function isCityLaunched(slug: string) {
  return !cityLaunches[slug] || cityLaunches[slug].status === "available";
}
