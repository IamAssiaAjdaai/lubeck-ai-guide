import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import AudioPlayer from "@/components/AudioPlayer";
import { getTranslations } from "@/lib/i18n";

const { capture } = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: { capture },
}));

function renderPlayer(
  locale: "en" | "da" = "en",
) {
  const t = getTranslations(locale);

  return render(
    <AudioPlayer
      src="/audio/holstentor-en.mp3"
      title={`Holstentor ${t.landmark.audioGuide}`}
      city="lubeck"
      landmark="holstentor"
      locale={locale}
      listenLabel={t.landmark.listenStory}
      playLabel={t.common.play}
      pauseLabel={t.common.pause}
      unavailableLabel={t.landmark.audioUnavailable}
    />,
  );
}

describe("AudioPlayer", () => {
  afterEach(() => {
    cleanup();
    capture.mockReset();
    vi.restoreAllMocks();
  });

  it("tracks audio_played only after the first successful playback", async () => {
    let finishPlaybackStart:
      | (() => void)
      | undefined;
    const play = vi
      .spyOn(
        HTMLMediaElement.prototype,
        "play",
      )
      .mockImplementation(
        () =>
          new Promise<void>((resolvePlay) => {
            finishPlaybackStart = resolvePlay;
          }),
      );

    renderPlayer();

    expect(capture).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: /play/i,
      }),
    );

    expect(play).toHaveBeenCalledOnce();
    expect(capture).not.toHaveBeenCalled();

    finishPlaybackStart?.();

    await waitFor(() =>
      expect(capture).toHaveBeenCalledWith(
        "audio_played",
        {
          city: "lubeck",
          landmark: "holstentor",
          locale: "en",
        },
      ),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /pause/i,
      }),
    );

    expect(capture).toHaveBeenCalledOnce();
  });

  it("shows the localized fallback and does not track failed playback", async () => {
    const playbackError = new Error(
      "Playback failed",
    );

    vi.spyOn(
      HTMLMediaElement.prototype,
      "play",
    ).mockRejectedValue(playbackError);
    vi.spyOn(
      console,
      "error",
    ).mockImplementation(() => undefined);

    renderPlayer("da");

    fireEvent.click(
      screen.getByRole("button", {
        name: /afspil/i,
      }),
    );

    expect(
      await screen.findByText(
        getTranslations("da").landmark
          .audioUnavailable,
      ),
    ).not.toBeNull();

    expect(capture).not.toHaveBeenCalled();
  });

  it("handles a media loading error without tracking or crashing", () => {
    const { container } = renderPlayer();
    const audio =
      container.querySelector("audio");

    expect(audio).not.toBeNull();

    if (!audio) {
      return;
    }

    fireEvent.error(audio);

    expect(
      screen.getByText(
        getTranslations("en").landmark
          .audioUnavailable,
      ),
    ).not.toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });
});
