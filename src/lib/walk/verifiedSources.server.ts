import "server-only";
import { getVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";
import { GUIDE_KNOWLEDGE_SOURCE_LOCALE } from "@/lib/guideKnowledge.server";
import type { ContentSource } from "@/lib/content/source";
import type { PlaceSource } from "@/data/placeSources";
/** Call only after resolving the published place. CMS publication alone is not verification. */
export async function getWalkVerifiedSources(
  citySlug: string,
  placeSlug: string,
  source: ContentSource,
): Promise<readonly PlaceSource[]> {
  try {
    const chunks = await getVerifiedKnowledgeProvider(
      source,
    ).listVerifiedChunks({
      citySlug,
      placeSlug,
      locale: GUIDE_KNOWLEDGE_SOURCE_LOCALE,
    });
    return [
      ...new Map(
        chunks
          .filter(
            (chunk) =>
              chunk.citySlug === citySlug && chunk.placeSlug === placeSlug,
          )
          .map((chunk) => [chunk.source.url, chunk.source]),
      ).values(),
    ].filter(
      (item) =>
        /^https?:\/\//.test(item.url) &&
        !Number.isNaN(Date.parse(item.verifiedAt)),
    );
  } catch {
    return [];
  }
}
