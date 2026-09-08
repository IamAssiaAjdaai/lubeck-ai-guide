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
        citySlug="lubeck"
        placeSlug="holstentor"
        placeName="Holstentor"
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
  it("leaves the rolling allowance to the server instead of a stale client cap", async () => {
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
        citySlug="lubeck"
        placeSlug="holstentor"
        placeName="Holstentor"
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

    for (let questionNumber = 1; questionNumber <= 6; questionNumber += 1) {
      fireEvent.change(input, { target: { value: `Question ${questionNumber}` } });
      fireEvent.click(screen.getByRole("button", { name: labels.send }));
      await waitFor(() => expect(request).toHaveBeenCalledTimes(questionNumber));
      await waitFor(() => expect(screen.getByText(`${questionNumber} ${labels.questionsUsed}`)).not.toBeNull());
    }

    expect(input.disabled).toBe(false);
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
        citySlug="lubeck"
        placeSlug="marienkirche"
        placeName="St. Mary's Church"
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
          citySlug="lubeck"
          placeSlug="holstentor"
          placeName="Holstentor"
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
          `1 ${labels.questionsUsed}`,
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
          citySlug="lubeck"
          placeSlug="marienkirche"
          placeName="Marienkirche"
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
          `1 ${labels.questionsUsed}`,
        ),
      ).not.toBeNull();
    },
  );
  it(
    "restores conversation count without treating it as the rolling allowance",
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
          citySlug="lubeck"
          placeSlug="rathaus"
          placeName="Lübeck Rathaus"
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
          `5 ${labels.questionsUsed}`,
        ),
      ).not.toBeNull();

      const input =
        screen.getByPlaceholderText(
          labels.placeholder,
        ) as HTMLInputElement;

      expect(
        input.disabled,
      ).toBe(false);
    },
  );

  it("uses actual generic city/place identity and a place-scoped conversation", async () => {
    const request = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ answer: "A verified generic answer.", sources: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", request);
    const labels = getTranslations("en").ai;

    render(
      <AskGuide
        citySlug="ghent"
        placeSlug="gravensteen"
        placeName="Gravensteen"
        locale="en"
        direction="ltr"
        buttonLabel={labels.open}
        closeLabel="Close"
        labels={labels}
        suggestions={[labels.suggestionFamous]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: labels.open }));
    fireEvent.change(screen.getByPlaceholderText(labels.placeholder), {
      target: { value: "When was this built?" },
    });
    fireEvent.click(screen.getByRole("button", { name: labels.send }));
    await screen.findByText("A verified generic answer.");

    const body = JSON.parse(request.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      citySlug: "ghent",
      placeSlug: "gravensteen",
      locale: "en",
    });
    expect(body.tourContext).toBeUndefined();
    expect(capture).toHaveBeenCalledWith("ai_question_asked", expect.objectContaining({
      city: "ghent",
      place: "gravensteen",
    }));
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(/latitude|longitude|"lat"|"lng"/i);
    expect(window.sessionStorage.getItem(
      "citywalk:guide:conversation:place:ghent:gravensteen",
    )).toContain("A verified generic answer.");
    expect(window.sessionStorage.getItem(
      "citywalk:guide:conversation:place:ghent:other-place",
    )).toBeNull();
  });
});
