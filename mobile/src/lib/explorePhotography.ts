import type { PublicPlaceCard } from "./api/contracts";
import { selectImageUrl, selectPrimaryImageMedia } from "./api/media";
import { cityHubBundledPhoto } from "./cityHubPhotography";

/** Public approved media or an explicitly credited matching asset; never borrow another POI's photo. */
export function explorePhotography(citySlug: string, place: PublicPlaceCard) {
  const media = selectPrimaryImageMedia(place.media);
  const uri = selectImageUrl(media, undefined, undefined, "card");
  if (uri) return { uri, attribution: media?.attribution };
  const bundled = cityHubBundledPhoto(citySlug, place.slug);
  return bundled ? { source: bundled.source, credit: bundled.credit } : undefined;
}
