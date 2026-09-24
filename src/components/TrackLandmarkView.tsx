"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import type {
  SupportedTourId,
} from "@/lib/tourContext";
import {
  rememberTourStop,
} from "@/lib/tourSession";

type TrackLandmarkViewProps = {
  tourId: SupportedTourId;
  city: string;
  landmark: string;
  locale: string;
  stopNumber: number;
};

export default function TrackLandmarkView({
  tourId,
  city,
  landmark,
  locale,
  stopNumber,
}: TrackLandmarkViewProps) {
  useEffect(() => {
    /*
     * Keep tour progress for the current
     * browser session.
     *
     * No coordinates are stored.
     */
    rememberTourStop(
      tourId,
      landmark,
    );

    posthog.capture(
      "landmark_opened",
      {
        city,
        landmark,
        locale,
        stop_number: stopNumber,
      },
    );
  }, [
    tourId,
    city,
    landmark,
    locale,
    stopNumber,
  ]);

  return null;
}