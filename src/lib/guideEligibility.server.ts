import "server-only";

import {
  getPublicCitySnapshot,
  type PublicCitySnapshot,
} from "@/lib/content/publicRepository.server";
import {
  getContentSource,
  type ContentSource,
} from "@/lib/content/source";
import { GUIDE_KNOWLEDGE_SOURCE_LOCALE } from "@/lib/guideKnowledge.server";
import {
  getVerifiedKnowledgeProvider,
  type VerifiedKnowledgeProvider,
} from "@/lib/verifiedKnowledge.server";

type GuideEligibilityInput = Readonly<{
  citySlug: string;
  placeSlug: string;
  source?: ContentSource;
  snapshot?: PublicCitySnapshot;
  provider?: VerifiedKnowledgeProvider;
}>;

export async function getGuideEligibility({
  citySlug,
  placeSlug,
  source = getContentSource(),
  snapshot,
  provider = getVerifiedKnowledgeProvider(source),
}: GuideEligibilityInput): Promise<boolean> {
  let publicSnapshot = snapshot;

  if (!publicSnapshot) {
    try {
      publicSnapshot = await getPublicCitySnapshot(citySlug, source);
    } catch {
      return false;
    }
  }

  if (
    publicSnapshot.city.slug !== citySlug ||
    !publicSnapshot.places.some((place) => place.slug === placeSlug)
  ) {
    return false;
  }

  let chunks;
  try {
    chunks = await provider.listVerifiedChunks({
      citySlug,
      placeSlug,
      locale: GUIDE_KNOWLEDGE_SOURCE_LOCALE,
    });
  } catch {
    return false;
  }

  return chunks.length > 0;
}
