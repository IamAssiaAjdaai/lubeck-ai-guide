import type { CityManifestSource } from "@/lib/admin/content/cityManifest";
import type { Locale } from "@/lib/i18n";

export const lubeckCityContent = {
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
} as const satisfies Readonly<Partial<Record<Locale, Readonly<{
  name: string;
  shortDescription: string;
  description: string;
}>>>>;

export const lubeckCitySources = [
  {
    publisher: "Lübeck und Travemünde Marketing GmbH",
    title: "Lübecker Altstadt entdecken",
    canonicalUrl: "https://www.luebeck-tourismus.de/altstadt",
    verifiedAt: "2026-09-09",
  },
  {
    publisher: "UNESCO World Heritage Centre",
    title: "Hanseatic City of Lübeck",
    canonicalUrl: "https://whc.unesco.org/en/list/272/",
    verifiedAt: "2026-09-09",
  },
] as const satisfies readonly CityManifestSource[];

export const lubeckReadinessProfile = {
  targetPlaceCount: 25,
  requiredContentLocales: ["de", "en"],
  reviewedContentLocales: [],
  requiredAudioLocales: ["de", "en"],
  audioTargetPlaceCount: 5,
  minimumVerifiedAiPlaceCount: 5,
  webQaStatus: "pending",
  nativeQaStatus: "pending",
  travelerQaStatus: "pending",
  premiumContentStatus: "pending",
  notes:
    "Lübeck city copy is source-backed but remains unreviewed in the launch profile; approved CMS key imagery and exact-locale audio are audited from live media.",
} as const;
