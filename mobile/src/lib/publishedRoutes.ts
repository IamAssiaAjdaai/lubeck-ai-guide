import { TOUR_TIME_BUDGETS, type TourTimeBudget } from "@citywalk/traveler-core";
import type { PublicPlaceCard, PublicTour } from "./api/contracts";
import { selectImageUrl, selectPrimaryImageMedia } from "./api/media";
import { explorePhotography } from "./explorePhotography";

export const routeTimeBudgets = TOUR_TIME_BUDGETS.filter(minutes => minutes !== 90);
export function filterPublishedRoutes(tours: readonly PublicTour[], budget?: TourTimeBudget) {
  return budget === undefined ? tours : tours.filter(tour => tour.estimatedDurationMinutes !== undefined && tour.estimatedDurationMinutes <= budget);
}
export function publishedRoutePresentation(citySlug: string, tour: PublicTour, places: readonly PublicPlaceCard[]) {
  const stops = [...tour.stops].sort((a, b) => a.position - b.position)
    .flatMap(stop => { const place = places.find(place => place.slug === stop.placeSlug); return place ? [place] : []; });
  const media = selectPrimaryImageMedia(tour.media);
  const uri = selectImageUrl(media, undefined, undefined, "card");
  const photo = uri ? { uri, attribution: media?.attribution } : stops[0] ? explorePhotography(citySlug, stops[0]) : undefined;
  return { stops, photo, photoPlace: uri ? undefined : stops[0], themes: [...new Set(stops.flatMap(place => place.tags ?? []))] };
}
export const walkingRoutesCopy = {
  en: { title: "Walking routes\nfor your visit", introduction: "Explore at your own pace, one local story at a time.", all: "All", budget: "Up to {minutes} min", preview: "Preview route", routes: "Published routes", empty: "No routes for this time", emptyDescription: "Try another time filter to see the available published routes.", noRoutes: "Routes are on their way", noRoutesDescription: "No curated routes are published for this city yet. You can still build your own walk.", reset: "Show all routes", build: "Build my walk", saved: "Saved walks", city: "City hub", more: "All walking routes", noPhoto: "Route photo unavailable", photoStop: "Photo: {place}", unknownDuration: "Duration not provided" },
  de: { title: "Spaziergänge\nfür deinen Besuch", introduction: "Entdecke die Stadt in deinem Tempo – eine Geschichte nach der anderen.", all: "Alle", budget: "Bis {minutes} Min.", preview: "Route ansehen", routes: "Veröffentlichte Routen", empty: "Keine Route für diese Zeit", emptyDescription: "Wähle einen anderen Zeitfilter, um verfügbare Routen zu sehen.", noRoutes: "Routen folgen", noRoutesDescription: "Für diese Stadt sind noch keine kuratierten Routen veröffentlicht. Du kannst deinen eigenen Spaziergang planen.", reset: "Alle Routen anzeigen", build: "Meinen Spaziergang planen", saved: "Gespeicherte Spaziergänge", city: "Stadtübersicht", more: "Alle Spaziergänge", noPhoto: "Kein Routenfoto verfügbar", photoStop: "Foto: {place}", unknownDuration: "Keine Zeitangabe" },
} as const;
export function routesCopy(locale: string) { return locale === "de" ? walkingRoutesCopy.de : walkingRoutesCopy.en; }
