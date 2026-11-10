import { routePreviewCopy } from "./routePreviewCopy";

export { publishedRouteTiming } from "@citywalk/traveler-core";

export function publishedVisitTimeLabel(visitMinutes: number | undefined, locale: string) {
  const copy = routePreviewCopy(locale);
  return visitMinutes === undefined
    ? copy.visitsUnknown
    : copy.visits.replace("{minutes}", String(visitMinutes));
}
