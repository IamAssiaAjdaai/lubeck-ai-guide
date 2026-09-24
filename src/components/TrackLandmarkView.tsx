"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type TrackLandmarkViewProps = {
  city: string;
  landmark: string;
  locale: string;
  stopNumber: number;
};

export default function TrackLandmarkView({
  city,
  landmark,
  locale,
  stopNumber,
}: TrackLandmarkViewProps) {
  useEffect(() => {
    posthog.capture("landmark_opened", {
      city,
      landmark,
      locale,
      stop_number: stopNumber,
    });
  }, [city, landmark, locale, stopNumber]);

  return null;
}