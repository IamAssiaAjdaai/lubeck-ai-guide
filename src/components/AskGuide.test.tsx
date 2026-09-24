import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AskGuide from "@/components/AskGuide";
import { getTranslations } from "@/lib/i18n";

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
});
