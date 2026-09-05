import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AskGuide from "@/components/AskGuide";
import { getTranslations } from "@/lib/i18n";
import {
  LUBECK_HISTORIC_TOUR_ID,
} from "@/lib/tourContext";

const { capture } = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: { capture },
}));

describe("AskGuide", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    capture.mockReset();
    window.sessionStorage.clear();
  });
  it("opens and submits even when analytics is unavailable", async () => {
    capture.mockImplementation(() => {
      throw new Error("tracker blocked");
    });

    const request = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
             answer:
             "A verified answer.",
              sources: [
                {
                  label:
                    "Museum Holstentor — The Holstentor",

                  url:
                    "https://museum-holstentor.de/about-holstentor",

                  verifiedAt:
                    "2026-09-04",

                  placeSlug:
                    "holstentor",

                  chunkIds: [
                    "holstentor-history",
                  ],
                },
              ],
            }),
         {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", request);

    const labels = getTranslations("en").ai;

    render(
      <AskGuide
        tourId={LUBECK_HISTORIC_TOUR_ID}
        landmark="holstentor"
        landmarkName="Holstentor"
        locale="en"
        direction="ltr"
        buttonLabel={labels.open}
        closeLabel="Close"
        labels={labels}
        suggestions={[labels.suggestionFamous, labels.suggestionBuilt, labels.suggestionStory]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: labels.open }));

    expect(screen.getByRole("dialog", { name: "Holstentor" })).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText(labels.placeholder), {
      target: { value: "What is this landmark?" },
    });
    fireEvent.click(screen.getByRole("button", { name: labels.send }));

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(await screen.findByText("A verified answer.")).not.toBeNull();
    const sourceLink =
    await screen.findByRole(
      "link",
      {
        name:
          "Museum Holstentor — The Holstentor",
      },
    );

      expect(
        sourceLink.getAttribute(
          "href",
        ),
      ).toBe(
        "https://museum-holstentor.de/about-holstentor",
      );
  });
  it("disables new questions after five successful answers", async () => {
    const request = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ answer: "A verified answer." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", request);

    const labels = getTranslations("en").ai;

    render(
      <AskGuide
        tourId={LUBECK_HISTORIC_TOUR_ID}
        landmark="holstentor"
        landmarkName="Holstentor"
        locale="en"
        direction="ltr"
        buttonLabel={labels.open}
        closeLabel="Close"
        labels={labels}
        suggestions={[labels.suggestionFamous, labels.suggestionBuilt, labels.suggestionStory]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: labels.open }));
    const input = screen.getByPlaceholderText(labels.placeholder) as HTMLInputElement;

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      fireEvent.change(input, { target: { value: `Question ${questionNumber}` } });
      fireEvent.click(screen.getByRole("button", { name: labels.send }));
      await waitFor(() => expect(request).toHaveBeenCalledTimes(questionNumber));
      await waitFor(() => expect(screen.getByText(`${questionNumber}/5 ${labels.questionsUsed}`)).not.toBeNull());
    }

    expect(input.disabled).toBe(true);
  });
  it(
  "sends tour progress without coordinates",
  async () => {
    const request = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              answer:
                "A contextual answer.",
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          ),
        ),
      );

    vi.stubGlobal(
      "fetch",
      request,
    );

    window.sessionStorage.setItem(
      "citywalk:tour:visited:lubeck_historic_center",
      JSON.stringify([
        "holstentor",
        "marienkirche",
      ]),
    );

    const labels =
      getTranslations("en").ai;

    render(
      <AskGuide
        tourId={
          LUBECK_HISTORIC_TOUR_ID
        }
        landmark="marienkirche"
        landmarkName="St. Mary's Church"
        locale="en"
        direction="ltr"
        buttonLabel={labels.open}
        closeLabel="Close"
        labels={labels}
        suggestions={[
          labels.suggestionFamous,
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: labels.open,
        },
      ),
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        labels.placeholder,
      ),
      {
        target: {
          value:
            "How does this connect to Holstentor?",
        },
      },
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: labels.send,
        },
      ),
    );

    await waitFor(() =>
      expect(request)
        .toHaveBeenCalledOnce(),
    );

    const requestInit =
      request.mock.calls[0][1];

    const body = JSON.parse(
      requestInit.body as string,
    );

    expect(
      body.tourContext,
    ).toEqual({
      version: 1,
      tourId:
        "lubeck_historic_center",
      currentStop:
        "marienkirche",

      /*
       * Current stop must not appear
       * as previously visited.
       */
      visitedStops: [
        "holstentor",
      ],
    });

    expect(
      JSON.stringify(
        body.tourContext,
      ),
    ).not.toMatch(
      /latitude|longitude|"lat"|"lng"/i,
    );
  },
  );
  it(
    "restores the same tour conversation after navigating to another stop",
    async () => {
      const request = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              answer:
                "Holstentor was built between 1464 and 1478.",
              sources: [
              {
                label:
                  "Museum Holstentor — The Holstentor",

                url:
                  "https://museum-holstentor.de/about-holstentor",

                verifiedAt:
                  "2026-09-04",

                placeSlug:
                  "holstentor",

                chunkIds: [
                  "holstentor-history",
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: {
                        "Content-Type":
                          "application/json",
                      },
                    },
          ),
        );

      vi.stubGlobal(
        "fetch",
        request,
      );

      const labels =
        getTranslations("en").ai;

      /*
      * Stop 1
      */
      render(
        <AskGuide
          tourId={
            LUBECK_HISTORIC_TOUR_ID
          }
          landmark="holstentor"
          landmarkName="Holstentor"
          locale="en"
          direction="ltr"
          buttonLabel={labels.open}
          closeLabel="Close"
          labels={labels}
          suggestions={[
            labels.suggestionFamous,
          ]}
        />,
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: labels.open,
          },
        ),
      );

      fireEvent.change(
        screen.getByPlaceholderText(
          labels.placeholder,
        ),
        {
          target: {
            value:
              "When was it built?",
          },
        },
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: labels.send,
          },
        ),
      );

      await screen.findByText(
        "Holstentor was built between 1464 and 1478.",
      );

      expect(
        screen.getByText(
          `1/5 ${labels.questionsUsed}`,
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole(
          "link",
          {
            name:
              "Museum Holstentor — The Holstentor",
          },
        ),
      ).not.toBeNull();

      /*
      * Simulate route navigation.
      *
      * React state disappears,
      * sessionStorage must survive.
      */
      cleanup();

      /*
      * Stop 2
      */
      render(
        <AskGuide
          tourId={
            LUBECK_HISTORIC_TOUR_ID
          }
          landmark="marienkirche"
          landmarkName="Marienkirche"
          locale="en"
          direction="ltr"
          buttonLabel={labels.open}
          closeLabel="Close"
          labels={labels}
          suggestions={[
            labels.suggestionFamous,
          ]}
        />,
      );
      const restoredSource =
        screen.getByRole(
          "link",
          {
            name:
              "Museum Holstentor — The Holstentor",
          },
        );

      expect(
        restoredSource.getAttribute(
          "href",
        ),
      ).toBe(
        "https://museum-holstentor.de/about-holstentor",
      );
      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: labels.open,
          },
        ),
      );

      /*
      * Previous stop conversation
      * is still visible.
      */
      expect(
        screen.getByText(
          "When was it built?",
        ),
      ).not.toBeNull();

      expect(
        screen.getByText(
          "Holstentor was built between 1464 and 1478.",
        ),
      ).not.toBeNull();

      /*
      * Counter belongs to the tour,
      * not the landmark.
      */
      expect(
        screen.getByText(
          `1/5 ${labels.questionsUsed}`,
        ),
      ).not.toBeNull();
    },
  );
  it(
    "restores the five-question tour limit on another stop",
    () => {
      const labels =
        getTranslations("en").ai;

      window.sessionStorage.setItem(
        "citywalk:tour:conversation:lubeck_historic_center",
        JSON.stringify({
          messages: [
            {
              role: "user",
              text: "Question 5",
            },
            {
              role: "assistant",
              text: "Answer 5",
            },
          ],
          questionCount: 5,
        }),
      );

      render(
        <AskGuide
          tourId={
            LUBECK_HISTORIC_TOUR_ID
          }
          landmark="rathaus"
          landmarkName="Lübeck Rathaus"
          locale="en"
          direction="ltr"
          buttonLabel={labels.open}
          closeLabel="Close"
          labels={labels}
          suggestions={[
            labels.suggestionFamous,
          ]}
        />,
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: labels.open,
          },
        ),
      );

      expect(
        screen.getByText(
          `5/5 ${labels.questionsUsed}`,
        ),
      ).not.toBeNull();

      expect(
        screen.getByText(
          labels.limit,
        ),
      ).not.toBeNull();

      const input =
        screen.getByPlaceholderText(
          labels.limit,
        ) as HTMLInputElement;

      expect(
        input.disabled,
      ).toBe(true);
    },
  );
});
