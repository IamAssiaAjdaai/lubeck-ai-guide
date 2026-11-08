import type { PublicImageVariantUrls, PublicMedia, PublicPlace } from "./api/contracts";
import { selectPrimaryImageMedia as selectCandidateImage } from "./api/media";
export { selectExactLocaleAudio } from "./api/media";

/** No owner-approved hashed release manifest exists. Publication is not rights clearance.
 * Deliberately fail closed for every CMS image, including cached media and legacy
 * image/imageVariants. Enabling an asset requires a separately reviewed manifest.
 * Bundled, individually verified photographs use their existing explicit imports.
 */
export function selectPrimaryImageMedia(media: readonly PublicMedia[]): PublicMedia | undefined {
  return selectCandidateImage(media.filter(isReleaseImageApproved));
}
function isReleaseImageApproved(_media: PublicMedia): boolean {
  return false;
}
export function selectImageUrl(
  _media: PublicMedia | undefined,
  _fallback: string | undefined,
  _fallbackVariants: PublicPlace["imageVariants"],
  _use: keyof PublicImageVariantUrls,
): string | undefined {
  return undefined;
}
