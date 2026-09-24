import { Check } from "lucide-react";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import { formatMessage, type Locale } from "@/lib/i18n";
import { formatDistance } from "@/lib/distance";
import { walkCopy } from "@/lib/walk/copy";
import { Itinerary } from "./RouteSummary";
export default function FinishWalkScreen({
  locale,
  citySlug,
  cityName,
  visited,
  historyDistance,
  elapsedMinutes,
  save,
  setMessage,
  feedback,
  customize,
}: {
  locale: Locale;
  citySlug: string;
  cityName: string;
  visited: DiscoveryPlace[];
  historyDistance: number;
  elapsedMinutes: number;
  save: () => void;
  setMessage: (value: string) => void;
  feedback: (key: string, value: string) => void;
  customize: () => void;
}) {
  const t = walkCopy(locale);
  return (
    <>
      <Check size={42} className="finish-check mb-5 text-success" />
      <h2 id="walk-title" className="text-3xl font-bold">
        {formatMessage(t.finished, { city: cityName })}
      </h2>
      <dl className="finish-summary my-6 grid grid-cols-3 gap-3 rounded-2xl bg-surface p-5">
        <div>
          <dt className="text-sm text-text-secondary">{t.placesVisited}</dt>
          <dd className="text-xl font-bold">{visited.length}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">{t.distance}</dt>
          <dd className="text-xl font-bold">
            {formatDistance(historyDistance, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">{t.timeExplored}</dt>
          <dd className="text-xl font-bold">
            {formatMessage(t.minutes, { minutes: elapsedMinutes })}
          </dd>
        </div>
      </dl>
      <h3 className="font-semibold">{t.highlights}</h3>
      {visited.length ? (
        <Itinerary places={visited} />
      ) : (
        <p className="mt-2 text-sm text-text-secondary">{t.noVisited}</p>
      )}
      <button className="button-primary mt-5 w-full" onClick={save}>
        {t.save}
      </button>
      <button
        className="button-secondary mt-2 w-full"
        onClick={async () => {
          try {
            await navigator.share({
              title: "CITYWALK",
              text: formatMessage(t.finished, { city: cityName }),
              url: `${window.location.origin}/${locale}/${citySlug}`,
            });
          } catch {
            setMessage(t.shareFailed);
          }
        }}
      >
        {t.share}
      </button>
      <fieldset className="mt-6">
        <legend className="font-semibold">{t.rate}</legend>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              className="button-secondary min-w-0 flex-1 px-2"
              key={value}
              onClick={() => feedback("rating", String(value))}
              aria-label={`${value} / 5`}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="mt-6 font-semibold">{t.fit}</p>
      <div className="mt-3 flex gap-3">
        <button
          className="button-secondary flex-1"
          onClick={() => feedback("fit", "yes")}
        >
          {t.yes}
        </button>
        <button
          className="button-secondary flex-1"
          onClick={() => feedback("fit", "no")}
        >
          {t.no}
        </button>
      </div>
      <button className="button-secondary mt-5 w-full" onClick={customize}>
        {t.build}
      </button>
    </>
  );
}
