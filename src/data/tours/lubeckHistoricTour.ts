import {
  LUBECK_HISTORIC_TOUR_ID,
} from "@/lib/tourContext";

export const lubeckHistoricTourGuide = {
  id: LUBECK_HISTORIC_TOUR_ID,

  narrative:
    "Hanseatic Lübeck: trade, civic power, faith, social care, and literature.",

  /*
   * Only cues already supported by
   * verified CITYWALK content.
   *
   * Empty is better than inventing.
   */
  lookFor: {
    holstentor: [],

    marienkirche: [],

    rathaus: [
      "the mix of Brick Gothic and Renaissance architecture",
    ],

    "heiligen-geist-hospital": [
      "the small wooden chambers inside",
    ],

    buddenbrookhaus: [],
  },
} as const;

export function getLubeckTourLookFor(
  slug: string,
): readonly string[] {
  const cues =
    lubeckHistoricTourGuide.lookFor[
      slug as keyof typeof lubeckHistoricTourGuide.lookFor
    ];

  return cues ?? [];
}