import {
  getPlaceSources,
  type PlaceSource,
} from "@/data/placeSources";

import type {
  LubeckPlaceSlug,
} from "@/data/places";

import type {
  KnowledgeChunk,
} from "@/lib/knowledge";

function requireOfficialSource(
  slug: LubeckPlaceSlug,
): PlaceSource {
  const source =
    getPlaceSources(slug).find(
      (candidate) =>
        candidate.type ===
        "official",
    );

  if (!source) {
    throw new Error(
      `Missing official knowledge source for lubeck/${slug}`,
    );
  }

  return source;
}

const holstentorSource =
  requireOfficialSource(
    "holstentor",
  );

const marienkircheSource =
  requireOfficialSource(
    "marienkirche",
  );

const rathausSource =
  requireOfficialSource(
    "rathaus",
  );

const hospitalSource =
  requireOfficialSource(
    "heiligen-geist-hospital",
  );

const buddenbrookhausSource =
  requireOfficialSource(
    "buddenbrookhaus",
  );

function requireSource(
  slug: LubeckPlaceSlug,
  url: string,
): PlaceSource {
  const source =
    getPlaceSources(slug).find(
      (candidate) =>
        candidate.type === "official" &&
        candidate.url === url,
    );

  if (!source) {
    throw new Error(
      `Missing verified source ${url} for lubeck/${slug}`,
    );
  }

  return source;
}

export const lubeckKnowledgeChunks =
  [
    {
      id: "holstentor-history",
      city: "lubeck",
      placeSlug: "holstentor",
      locale: "en",

      text:
        "The Holstentor was built between 1464 and 1478. It protected the city while also showing Lübeck's wealth and importance during the Hanseatic era.",

      topics: [
        "history",
        "construction",
        "hanseatic",
        "city-gate",
        "importance",
      ],

      priority: 100,

      source: holstentorSource,
    },

    {
      id: "holstentor-architecture",
      city: "lubeck",
      placeSlug: "holstentor",
      locale: "en",

      text:
        "The Holstentor is a medieval city gate built in Brick Gothic architecture and is a symbol of Lübeck.",

      topics: [
        "architecture",
        "brick-gothic",
        "symbol",
      ],

      priority: 80,

      source: holstentorSource,
    },

    {
      id: "marienkirche-history",
      city: "lubeck",
      placeSlug: "marienkirche",
      locale: "en",

      text:
        "A market church already existed at the site of St. Mary's around 1160. As Lübeck grew into one of the leading cities of the Hanseatic League, St. Mary's became an important church for the city's merchants and council.",

      topics: [
        "history",
        "1160",
        "hanseatic",
        "merchants",
        "council",
      ],

      priority: 100,

      source: marienkircheSource,
    },

    {
      id: "marienkirche-1942",
      city: "lubeck",
      placeSlug: "marienkirche",
      locale: "en",

      text:
        "During an air raid on the night of 28 to 29 March 1942, St. Mary's was severely damaged. After the Second World War, the church was gradually rebuilt.",

      topics: [
        "1942",
        "air-raid",
        "war",
        "reconstruction",
      ],

      priority: 70,

      source: marienkircheSource,
    },

    {
      id: "rathaus-construction",
      city: "lubeck",
      placeSlug: "rathaus",
      locale: "en",

      text:
        "Construction of Lübeck Town Hall began around 1230 and was completed in 1308. Later expansions and alterations produced its mixture of Brick Gothic and Renaissance architecture.",

      topics: [
        "construction",
        "1230",
        "1308",
        "architecture",
        "brick-gothic",
        "renaissance",
      ],

      priority: 90,

      source: rathausSource,
    },

    {
      id: "rathaus-political-role",
      city: "lubeck",
      placeSlug: "rathaus",
      locale: "en",

      text:
        "Lübeck Town Hall was closely connected to the city's political importance during the Hanseatic era and remains the seat of the city administration and local parliament today.",

      topics: [
        "politics",
        "hanseatic",
        "administration",
        "parliament",
        "importance",
      ],

      priority: 100,

      source: rathausSource,
    },

    {
      id: "hospital-foundation",
      city: "lubeck",
      placeSlug:
        "heiligen-geist-hospital",
      locale: "en",

      text:
        "The Heiligen-Geist-Hospital is one of Europe's oldest medieval social institutions. It was established at the Koberg between about 1260 and 1286 and was created to care for sick, poor and elderly people.",

      topics: [
        "history",
        "foundation",
        "1260",
        "1286",
        "social-care",
        "hospital",
        "importance",
      ],

      priority: 100,

      source: hospitalSource,
    },

    {
      id: "hospital-residents",
      city: "lubeck",
      placeSlug:
        "heiligen-geist-hospital",
      locale: "en",

      text:
        "The hospital could accommodate more than one hundred residents. Its small wooden chambers were added in the early 19th century to provide more privacy, and the building continued to serve elderly residents until 1970.",

      topics: [
        "residents",
        "wooden-chambers",
        "19th-century",
        "1970",
        "social-care",
      ],

      priority: 75,

      source: hospitalSource,
    },

    {
      id: "buddenbrookhaus-family",
      city: "lubeck",
      placeSlug:
        "buddenbrookhaus",
      locale: "en",

      text:
        "The Buddenbrookhaus at Mengstraße 4 was built in 1758 for the merchant Johann Michael Croll. Johann Siegmund Mann purchased it in 1841, and it remained in the Mann family until 1891.",

      topics: [
        "history",
        "1758",
        "mann-family",
        "merchant",
      ],

      priority: 85,

      source:
        buddenbrookhausSource,
    },

    {
      id: "buddenbrookhaus-literature",
      city: "lubeck",
      placeSlug:
        "buddenbrookhaus",
      locale: "en",

      text:
        "The house became famous through Thomas Mann's novel Buddenbrooks, published in 1901. The fictional family home was inspired by the real building, and today the house is a literary museum and research center dedicated to the Mann family.",

      topics: [
        "literature",
        "thomas-mann",
        "buddenbrooks",
        "1901",
        "museum",
      ],

      priority: 100,

      source:
        buddenbrookhausSource,
    },
  ] as const satisfies
    readonly KnowledgeChunk[];