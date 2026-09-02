"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

import type { Locale } from "@/lib/i18n";

type TourCompletionTrackerProps = {
  city: string;
  locale: Locale;
  totalStops: number;
  ratingQuestion: string;
  thankYou: string;
  starRating: string;
};

export default function TourCompletionTracker({
  city,
  locale,
  totalStops,
  ratingQuestion,
  thankYou,
  starRating,
}: TourCompletionTrackerProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  useEffect(() => {
    posthog.capture("tour_completed", {
      city,
      locale,
      total_stops: totalStops,
    });
  }, [city, locale, totalStops]);

  const handleRating = (rating: number) => {
    setSelectedRating(rating);

    posthog.capture("tour_rated", {
      city,
      locale,
      rating,
    });
  };
  return (
    <div className="mt-8 text-center">
      <p className="font-semibold">
        {ratingQuestion}
      </p>

      <div className="mt-4 flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRating(rating)}
            aria-label={starRating.replace("{rating}", String(rating))}
            className="text-3xl transition hover:scale-110"
          >
            {selectedRating !== null && rating <= selectedRating
              ? "★"
              : "☆"}
          </button>
        ))}
      </div>

      {selectedRating && (
        <p className="mt-3 text-sm text-zinc-500">
          {thankYou}
        </p>
      )}
    </div>
  );
}
