"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

type TourCompletionTrackerProps = {
  city: string;
  locale: string;
  totalStops: number;
};

export default function TourCompletionTracker({
  city,
  locale,
  totalStops,
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
        How was your tour?
      </p>

      <div className="mt-4 flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRating(rating)}
            aria-label={`${rating} star rating`}
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
          Thanks for your feedback!
        </p>
      )}
    </div>
  );
}