"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
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
    <div className="surface-card mt-7 p-5 text-center">
      <p className="text-[15px] font-semibold">
        {ratingQuestion}
      </p>

      <div className="mt-3 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRating(rating)}
            aria-label={starRating.replace("{rating}", String(rating))}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-amber-50 ${selectedRating !== null && rating <= selectedRating ? "text-rating" : "text-text-muted"}`}
          >
            <Star aria-hidden="true" size={24} strokeWidth={1.8} fill={selectedRating !== null && rating <= selectedRating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>

      {selectedRating && (
        <p className="mt-3 text-sm text-text-secondary">
          {thankYou}
        </p>
      )}
    </div>
  );
}
