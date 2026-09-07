export const cities = {
  lubeck: {
    slug: "lubeck",
    name: "Lübeck",
    heroImage: "/landmarks/holstentor.jpg",
    landmarkCount: 5,
    estimatedMinutes: 45,
    tourId: "lubeck_historic_center",
    startLandmarkSlug: "holstentor",
  },
} as const;

export const brandHeroImage = "/images/citywalk-hero.png";

export type CitySlug = keyof typeof cities;
