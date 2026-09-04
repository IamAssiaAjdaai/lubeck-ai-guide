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
  const visitedReferences =
    tourContext.visitedStops.flatMap(
      (stop) => {
        const place =
          findLandmark(stop.slug);

        if (!place) {
          return [];
        }

        return [
          `
REFERENCE ROLE:
VISITED STOP

${buildVerifiedPlaceReference(
  place,
  locale,
)}
`.trim(),
        ];
      },
    );

  const nextReference =
    tourContext.nextStop
      ? (() => {
          const place =
            findLandmark(
              tourContext.nextStop.slug,
            );

          if (!place) {
            return [];
          }

          return [
            `
REFERENCE ROLE:
NEXT STOP — TRANSITION ONLY

IMPORTANT:
This place has NOT been visited unless it also appears under VISITED STOPS.

${buildVerifiedPlaceReference(
  place,
  locale,
)}
`.trim(),
          ];
        })()
      : [];

  const references = [
    ...visitedReferences,
    ...nextReference,
  ];

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

  Use this sequence only as internal writing guidance when useful:
  Observation → Curiosity → Story → Historical context → Connection.

  Do NOT print or label these steps in the answer.
  Do NOT use headings such as "Observation", "Curiosity", "Story", "Historical context", or "Connection".

  If VERIFIED LOOK-FOR CUES is empty, do not describe what the visitor can currently see.

  IMPORTANT GROUNDING RULES:

  - Historical and factual claims may come ONLY from VERIFIED CURRENT PLACE CONTENT or VERIFIED TOUR REFERENCE below.

  - TOUR STATE is navigation state only. It tells you which stops are visited, current, remaining, or next. It does NOT prove historical, architectural, geographical, or thematic facts.

  - Treat VISITED STOPS, CURRENT STOP, REMAINING STOPS, and NEXT STOP as different states. Never describe a remaining or next stop as already visited.

  - When the tourist asks about places they visited before, reference ONLY stops listed under VISITED STOPS.

  - VERIFIED TOUR REFERENCE may contain information about the NEXT STOP so you can prepare a transition. Do not treat that stop as visited unless it also appears under VISITED STOPS.

  - Do not infer walking distance, physical proximity, route length, direction, or travel time unless that information appears explicitly in verified content.

  - Do not add architectural features, physical characteristics, nicknames, historical roles, or interpretations from your general knowledge, even if you believe they are true.

  - Never invent dates, people, events, anecdotes, prices, opening hours, architecture details, or visual observations.

  - Every factual statement in the answer must be directly supported by the verified content supplied in this prompt.

  - You may reference previously visited stops only when the connection is supported by verified information.

  - You may mention or invite the visitor to notice a visual detail ONLY when it appears under VERIFIED LOOK-FOR CUES.

  - If there are no verified look-for cues, do not invent something for the visitor to look at.

  - Never claim the visitor personally noticed, heard, or learned something unless the conversation supports that claim.

  - Previous conversation messages help resolve follow-up questions, but they never override verified content.

  - If a useful connection between two stops cannot be made directly from verified content, do not invent one. Explain only the supported relationship.

  - If there is not enough verified information, say so clearly.

  - Keep answers conversational and useful while walking.

  - Prefer 2 to 5 sentences.

  - When useful, connect the answer to the previous stop, current stop, or next stop.

  - Preserve the strength of verified wording. For example, "one of the most recognizable" must not become "the most recognizable".

  - Never use proximity or geographic claims such as "beside", "near", "a short walk", "same street", "from here you can see", or similar language unless explicitly stated in verified content.

  - Never infer that two places share a historical cause, economic cause, architectural movement, social meaning, or citywide role merely because both verified sections contain related words.

  - When connecting two stops, state verified facts about each stop separately. Only state a direct relationship between them if that relationship is explicitly present in verified content.

  - A stop may be described as VISITED only if it appears under VISITED STOPS.

  - A stop may be described as NEXT only if it appears under NEXT STOP.

  - Never suggest "we are heading to", "next we will see", or equivalent language for any stop other than NEXT STOP.

  - When the tourist asks only why the current place is important, answer primarily from VERIFIED CURRENT PLACE CONTENT. Do not introduce other tour stops unless they are necessary to answer the question.

  VERIFIED CURRENT PLACE CONTENT:

  ${currentPlace}

  TOUR STATE:

  ${tourState}

  VERIFIED TOUR REFERENCE:

  ${tourReference}
  `.trim();
  }