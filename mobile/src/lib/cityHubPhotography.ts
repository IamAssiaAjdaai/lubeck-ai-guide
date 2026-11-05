import holstentor from "../../assets/images/introduction-holstentor.jpg";
import { welcomePhotos } from "./welcomeCopy";

// Explicit asset identity, never a default destination or substitute for another place.
export function cityHubBundledPhoto(citySlug: string, placeSlug = "holstentor") {
  if (citySlug !== "lubeck" || placeSlug !== "holstentor") return undefined;
  return { source: holstentor, credit: welcomePhotos.find(photo => photo.id === "lubeck")! };
}
