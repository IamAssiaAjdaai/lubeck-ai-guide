import {
  lubeckLandmarks,
  type LandmarkPlace,
} from "@/data/places";

import {
  languages,
  type Locale,
} from "@/lib/i18n";

import type {
  ResolvedTourContext,
  TourStopContext,
} from "@/lib/tourContext";

function formatFacts(
  facts: readonly {
    label: string;
    value: string;
  }[],
): string {
  return facts
    .map(
      (fact) =>
        `${fact.label}: ${fact.value}`,
    )
    .join("\n");
}

function buildVerifiedPlaceReference(
  place: LandmarkPlace,
  locale: Locale,
): string {
  const content =
    place.content[locale];

  return `
PLACE: ${content.name}

DESCRIPTION:
${content.description}

STORY:
${content.story}

FACTS:
${formatFacts(content.facts)}
`.trim();
}

function findLandmark(
  slug: string,
): LandmarkPlace | null {
  return (
    lubeckLandmarks.find(
      (place) =>
        place.slug === slug,
    ) ?? null
  );
}

function formatStopList(
  stops: readonly TourStopContext[],
): string {
  if (stops.length === 0) {
    return "None";
  }

  return stops
    .map(
      (stop) =>
        `- ${stop.name} (${stop.slug})`,
    )
    .join("\n");
}

function buildTourReference({
  tourContext,
  locale,
}: {
  tourContext: ResolvedTourContext;
  locale: Locale;
}): string {
  /*
   * Historical reference is intentionally
   * limited to places useful for continuity:
   * visited stops + next stop.
   *
   * Current place has its own dedicated
   * verified section.
   */
  const referenceSlugs =
    Array.from(
      new Set([
        ...tourContext.visitedStops.map(
          (stop) => stop.slug,
        ),

        ...(tourContext.nextStop
          ? [
              tourContext.nextStop
                .slug,
            ]
          : []),
      ]),
    );

  const references =
    referenceSlugs.flatMap(
      (slug) => {
        const place =
          findLandmark(slug);

        return place
          ? [
              buildVerifiedPlaceReference(
                place,
                locale,
              ),
            ]
          : [];
      },
    );

  return references.length > 0
    ? references.join(
        "\n\n---\n\n",
      )
    : "None";
}

export function buildGuideSystemPrompt({
  currentLandmark,
  locale,
  tourContext,
}: {
  currentLandmark: LandmarkPlace;
  locale: Locale;
  tourContext:
    | ResolvedTourContext
    | null;
}): string {
  const currentPlace =
    buildVerifiedPlaceReference(
      currentLandmark,
      locale,
    );

  const tourState =
    tourContext
      ? `
TOUR:
${tourContext.tourId}

PROGRESS:
${tourContext.currentStopNumber} of ${tourContext.totalStops}

CURRENT STOP:
${tourContext.currentStop.name}

VISITED STOPS:
${formatStopList(
  tourContext.visitedStops,
)}

REMAINING STOPS:
${formatStopList(
  tourContext.remainingStops,
)}

NEXT STOP:
${
  tourContext.nextStop
    ? tourContext.nextStop.name
    : "None"
}

TOUR THEME:
${tourContext.narrative}

VERIFIED LOOK-FOR CUES:
${
  tourContext.lookFor.length > 0
    ? tourContext.lookFor
        .map(
          (cue) => `- ${cue}`,
        )
        .join("\n")
    : "None"
}
`.trim()
      : "No active tour context.";

  const tourReference =
    tourContext
      ? buildTourReference({
          tourContext,
          locale,
        })
      : "None";

  return `
You are CITYWALK, a friendly local city guide for Lübeck, Germany.

Answer in ${languages[locale].aiLanguageName}.

Your goal is to make the visit feel like one continuous guided walk, not isolated encyclopedia answers.

GUIDE STYLE:

Observation → Curiosity → Story → Historical context → Connection

Use that pattern only when it fits the tourist's question. Do not force every step into every answer.

IMPORTANT GROUNDING RULES:

- Historical and factual claims may come ONLY from VERIFIED CURRENT PLACE CONTENT or VERIFIED TOUR REFERENCE below.
- TOUR STATE tells you where the visitor is in the experience. It is not an independent historical source.
- Never invent dates, people, events, anecdotes, prices, opening hours, architecture details, or visual observations.
- You may reference previously visited stops only when the connection is supported by verified information.
- You may mention or invite the visitor to notice a visual detail ONLY when it appears under VERIFIED LOOK-FOR CUES.
- If there are no verified look-for cues, do not invent something for the visitor to look at.
- Never claim the visitor personally noticed, heard, or learned something unless the conversation supports that claim.
- Previous conversation messages help resolve follow-up questions, but they never override verified content.
- If there is not enough verified information, say so clearly.
- Keep answers conversational and useful while walking.
- Prefer 2 to 5 sentences.
- When useful, connect the answer to the previous stop, current stop, or next stop.

VERIFIED CURRENT PLACE CONTENT:

${currentPlace}

TOUR STATE:

${tourState}

VERIFIED TOUR REFERENCE:

${tourReference}
`.trim();
}