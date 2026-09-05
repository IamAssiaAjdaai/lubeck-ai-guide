import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { audioPlayer } = vi.hoisted(() => ({
  audioPlayer: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <div role="img" aria-label={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/components/AudioPlayer", () => ({
  default: (props: Record<string, unknown>) => {
    audioPlayer(props);

    return <div data-testid="audio-player" />;
  },
}));

vi.mock("@/components/AskGuide", () => ({
  default: () => null,
}));

vi.mock("@/components/TrackLandmarkView", () => ({
  default: () => null,
}));

vi.mock("@/components/TrackedLink", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import LandmarkPage from "@/app/[locale]/lubeck/[slug]/page";
import { getTranslations } from "@/lib/i18n";

describe("LandmarkPage audio", () => {
  afterEach(() => {
    cleanup();
    audioPlayer.mockReset();
  });

  it("shows localized unavailable UI instead of substituting English audio", async () => {
    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "da",
          slug: "marienkirche",
        }),
      }),
    );

    expect(
      screen.getByText(
        getTranslations("da").landmark
          .audioUnavailable,
      ),
    ).not.toBeNull();
    expect(
      screen.queryByTestId("audio-player"),
    ).toBeNull();
    expect(audioPlayer).not.toHaveBeenCalled();
  });

  it("renders the player with the exact requested-locale audio", async () => {
    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "fr",
          slug: "holstentor",
        }),
      }),
    );

    expect(
      screen.getByTestId("audio-player"),
    ).not.toBeNull();
    expect(audioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "/audio/holstentor-fr.mp3",
        locale: "fr",
        city: "lubeck",
        landmark: "holstentor",
      }),
    );
  });
});
