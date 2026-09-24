import { describe, expect, it } from "vitest";

import {
  DEFAULT_ARRIVAL_RADIUS_METERS,
  findArrivalMatch,
  isWithinArrivalRadius,
} from "@/lib/arrival";

const holstentor = {
  slug: "holstentor",
  coordinates: {
    lat: 53.8662,
    lng: 10.6797,
  },
  detailHref: "/en/lubeck/holstentor",
};

describe("arrival detection", () => {
  it("uses a 50 meter default radius", () => {
    expect(DEFAULT_ARRIVAL_RADIUS_METERS).toBe(50);
  });

  it("detects a user inside the arrival radius", () => {
    expect(
      isWithinArrivalRadius(
        {
          lat: 53.8664,
          lng: 10.6797,
        },
        holstentor.coordinates,
      ),
    ).toBe(true);
  });

  it("does not detect a user outside the arrival radius", () => {
    expect(
      isWithinArrivalRadius(
        {
          lat: 53.8672,
          lng: 10.6797,
        },
        holstentor.coordinates,
      ),
    ).toBe(false);
  });

  it("supports a configurable radius", () => {
    expect(
      isWithinArrivalRadius(
        {
          lat: 53.8672,
          lng: 10.6797,
        },
        holstentor.coordinates,
        150,
      ),
    ).toBe(true);
  });

  it("ignores places without a detail route", () => {
    const match = findArrivalMatch(
      [
        {
          slug: "restaurant",
          coordinates: holstentor.coordinates,
        },
      ],
      holstentor.coordinates,
      new Set(),
    );

    expect(match).toBeUndefined();
  });

  it("ignores places that were already prompted", () => {
    const match = findArrivalMatch(
      [holstentor],
      holstentor.coordinates,
      new Set(["holstentor"]),
    );

    expect(match).toBeUndefined();
  });

  it("returns the nearest eligible place", () => {
    const match = findArrivalMatch(
      [
        holstentor,
        {
          slug: "nearer-place",
          coordinates: {
            lat: 53.86621,
            lng: 10.6797,
          },
          detailHref: "/en/lubeck/nearer-place",
        },
      ],
      {
        lat: 53.8662,
        lng: 10.6797,
      },
      new Set(),
    );

    expect(match?.place.slug).toBe("holstentor");
    expect(match?.distanceMeters).toBe(0);
  });
});