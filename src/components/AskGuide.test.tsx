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

    expect(screen.getByRole("dialog", { name: "Holstentor" })).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText(labels.placeholder), {
      target: { value: "What is this landmark?" },
    });
    fireEvent.click(screen.getByRole("button", { name: labels.send }));

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(await screen.findByText("A verified answer.")).not.toBeNull();
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
});
