"use client";

import { ChevronDown, Route } from "lucide-react";
import { useId, useState } from "react";

import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import TourBuilder from "@/components/travel/TourBuilder";
import TourPreferences from "@/components/travel/TourPreferences";
import type { LocalizedPlaceCategory } from "@/data/placeCategories";
import type { Locale, Translations } from "@/lib/i18n";

type CustomTourPlannerProps = Readonly<{
  places: readonly DiscoveryPlace[];
  categories: readonly LocalizedPlaceCategory[];
  preferenceLabels: Translations["tourPreferences"];
  builderLabels: Translations["tourBuilder"];
  locale: Locale;
  tourId: string;
  origin: Readonly<{
    lat: number;
    lng: number;
  }>;
}>;

export default function CustomTourPlanner({
  places,
  categories,
  preferenceLabels,
  builderLabels,
  locale,
  tourId,
  origin,
}: CustomTourPlannerProps) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="button-secondary w-full justify-between text-start"
      >
        <span className="inline-flex items-center gap-2.5">
          <Route aria-hidden="true" size={19} strokeWidth={1.8} />
          {builderLabels.build}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={19}
          strokeWidth={1.8}
          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div id={panelId} className="mt-3 grid gap-3">
          <TourPreferences
            places={places}
            categories={categories}
            labels={preferenceLabels}
            locale={locale}
            tourId={tourId}
            rankingOrigin={origin}
          />
          <TourBuilder
            places={places}
            categories={categories}
            labels={builderLabels}
            locale={locale}
            tourId={tourId}
            origin={origin}
          />
        </div>
      ) : null}
    </section>
  );
}
