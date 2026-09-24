export const cities = {
  lubeck: {
    slug: "lubeck",
    name: "Lübeck",
    countryCode: "DE",
    timezone: "Europe/Berlin",
    heroImage: "/landmarks/holstentor.jpg",
    landmarkCount: 5,
    estimatedMinutes: 45,
    tourId: "lubeck_historic_center",
    startLandmarkSlug: "holstentor",
    legacyContent: {
      de: {
        name: "Lübeck",
        shortDescription:
          "Hansestadt mit UNESCO-Altstadt, Backsteingotik und verwinkelten Gängen am Wasser.",
        description:
          "Lübecks Altstadt liegt auf einer von Wasser umgebenen Insel. Beim Spaziergang verbinden sich der mittelalterliche Stadtgrundriss, Kaufmannshäuser, Kirchen und das Holstentor zu einem kompakten Einblick in die Geschichte der Hansestadt. Die Altstadt gehört seit 1987 zum UNESCO-Welterbe.",
      },
      en: {
        name: "Lübeck",
        shortDescription:
          "A Hanseatic city of UNESCO-listed streets, Brick Gothic landmarks and waterside lanes.",
        description:
          "Lübeck's Old Town occupies an island encircled by water. A walk through its medieval street plan links merchants' houses, churches and the Holstentor in a compact introduction to the Hanseatic city's history. The Old Town has been a UNESCO World Heritage property since 1987.",
      },
    },
  },
} as const;

export const brandHeroImage = "/images/citywalk-hero.png";

export type CitySlug = keyof typeof cities;
