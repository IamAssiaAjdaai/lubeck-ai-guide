import { isLocale, type Locale } from "@/lib/i18n";

export type VisitorJourneyEvent =
  | Readonly<{
      eventName: "city_opened";
      properties: Readonly<{
        city: string;
        locale: Locale;
      }>;
    }>
  | Readonly<{
      eventName: "place_viewed";
      properties: Readonly<{
        city: string;
        place: string;
        locale: Locale;
      }>;
    }>;

export function getVisitorJourneyEvent(
  pathname: string,
): VisitorJourneyEvent | undefined {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2 || !isLocale(segments[0])) {
    return undefined;
  }

  const locale = segments[0];
  const city = segments[1];

  if (!city) return undefined;

  if (segments.length === 2) {
    return {
      eventName: "city_opened",
      properties: { city, locale },
    };
  }

  if (segments.length === 3) {
    const place = segments[2];

    if (!place || (city === "lubeck" && place === "complete")) {
      return undefined;
    }

    return {
      eventName: "place_viewed",
      properties: { city, place, locale },
    };
  }

  return undefined;
}
