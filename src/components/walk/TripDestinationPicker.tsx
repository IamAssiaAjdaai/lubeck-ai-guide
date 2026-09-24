import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Locale } from "@/lib/i18n";
import { walkCopy } from "@/lib/walk/copy";
export default function TripDestinationPicker({
  mode,
  places,
  candidate,
  select,
  onContinue,
  onStart,
  cancel,
  locale,
}: {
  mode: "add" | "back";
  places: readonly DiscoveryPlace[];
  candidate: string;
  select: (slug: string) => void;
  onContinue: () => void;
  onStart: () => void;
  cancel: () => void;
  locale: Locale;
}) {
  const t = walkCopy(locale);
  return (
    <section className="surface-card my-4 p-4">
      <h3 className="font-semibold">{mode === "add" ? t.add : t.takeBack}</h3>
      {mode === "back" && (
        <button className="button-secondary mt-3 w-full" onClick={onStart}>
          {t.tripStart}
        </button>
      )}
      <label className="mt-3 block text-sm">
        {t.chooseLocation}
        <select
          className="walk-input"
          value={candidate}
          onChange={(e) => select(e.target.value)}
        >
          <option value="">{t.selectPlace}</option>
          {places.map((place) => (
            <option key={place.slug} value={place.slug}>
              {place.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!places.some((place) => place.slug === candidate)}
        className="button-primary mt-3 w-full"
        onClick={onContinue}
      >
        {t.continue}
      </button>
      <button className="button-tertiary w-full" onClick={cancel}>
        {t.back}
      </button>
    </section>
  );
}
