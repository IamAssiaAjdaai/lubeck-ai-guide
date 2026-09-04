import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LUBECK_HISTORIC_TOUR_ID,
  TOUR_CONTEXT_VERSION,
} from "@/lib/tourContext";

import {
  InvalidTourContextError,
  resolveTourContext,
} from "@/lib/tourContext.server";

describe(
  "resolveTourContext",
  () => {
    it(
      "resolves trusted multi-stop context",
      () => {
        const context =
          resolveTourContext({
            input: {
              version:
                TOUR_CONTEXT_VERSION,

              tourId:
                LUBECK_HISTORIC_TOUR_ID,

              currentStop:
                "rathaus",

              /*
               * Deliberately sent
               * out of order.
               */
              visitedStops: [
                "marienkirche",
                "holstentor",
              ],
            },

            locale: "en",

            expectedCurrentStop:
              "rathaus",
          });

        expect(context).not.toBeNull();

        expect(
          context?.currentStop.slug,
        ).toBe("rathaus");

        expect(
          context?.currentStopNumber,
        ).toBe(3);

        expect(
          context?.totalStops,
        ).toBe(5);

        expect(
          context?.visitedStops.map(
            (stop) => stop.slug,
          ),
        ).toEqual([
          "holstentor",
          "marienkirche",
        ]);

        expect(
          context?.remainingStops.map(
            (stop) => stop.slug,
          ),
        ).toEqual([
          "heiligen-geist-hospital",
          "buddenbrookhaus",
        ]);

        expect(
          context?.nextStop?.slug,
        ).toBe(
          "heiligen-geist-hospital",
        );

        /*
         * Privacy regression test.
         */
        expect(
          JSON.stringify(context),
        ).not.toMatch(
          /latitude|longitude|"lat"|"lng"/i,
        );
      },
    );

    it(
      "removes duplicates and the current stop",
      () => {
        const context =
          resolveTourContext({
            input: {
              version: 1,
              tourId:
                LUBECK_HISTORIC_TOUR_ID,
              currentStop:
                "marienkirche",
              visitedStops: [
                "holstentor",
                "holstentor",
                "marienkirche",
              ],
            },
            locale: "en",
            expectedCurrentStop:
              "marienkirche",
          });

        expect(
          context?.visitedStops.map(
            (stop) => stop.slug,
          ),
        ).toEqual([
          "holstentor",
        ]);
      },
    );

    it(
      "rejects a current-stop mismatch",
      () => {
        expect(() =>
          resolveTourContext({
            input: {
              version: 1,
              tourId:
                LUBECK_HISTORIC_TOUR_ID,
              currentStop:
                "rathaus",
              visitedStops: [],
            },
            locale: "en",
            expectedCurrentStop:
              "holstentor",
          }),
        ).toThrow(
          InvalidTourContextError,
        );
      },
    );

    it(
      "rejects unknown tour stops",
      () => {
        expect(() =>
          resolveTourContext({
            input: {
              version: 1,
              tourId:
                LUBECK_HISTORIC_TOUR_ID,
              currentStop:
                "rathaus",
              visitedStops: [
                "fake-place",
              ],
            },
            locale: "en",
            expectedCurrentStop:
              "rathaus",
          }),
        ).toThrow(
          InvalidTourContextError,
        );
      },
    );

    it(
      "keeps old requests compatible",
      () => {
        expect(
          resolveTourContext({
            input: undefined,
            locale: "en",
            expectedCurrentStop:
              "holstentor",
          }),
        ).toBeNull();
      },
    );
  },
);