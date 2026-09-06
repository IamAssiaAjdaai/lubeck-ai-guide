import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  audioPlayer,
  connection,
  getContentSource,
  getPublicCitySnapshot,
} = vi.hoisted(() => ({
  audioPlayer: vi.fn(),
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  connection,
}));

vi.mock("@/lib/content/source", () => ({
  getContentSource,
}));

vi.mock("@/lib/content/publicRepository.server", () => ({
  getPublicCitySnapshot,
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
import { lubeckPlaces } from "@/data/places";
import type { PublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { getTranslations } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

const cmsEnglishAudio: PublicMedia = {
  assetKey: "lubeck/places/holstentor/audio/en/approved.mp3",
  kind: "audio",
  purpose: "audio",
  url: "/api/media/lubeck%2Fplaces%2Fholstentor%2Faudio%2Fen%2Fapproved.mp3",
  mimeType: "audio/mpeg",
  locale: "en",
};

function createSnapshot(
  placeMedia: Readonly<Record<string, readonly PublicMedia[]>> = {},
): PublicCitySnapshot {
  return {
    city: {
      slug: "lubeck",
      content: {
        en: { name: "Lübeck" },
      },
    },
    places: lubeckPlaces,
    tours: [],
    media: {
      city: [],
      places: placeMedia,
      tours: {},
    },
  };
}

describe("LandmarkPage audio", () => {
  beforeEach(() => {
    getContentSource.mockReturnValue("code");
    getPublicCitySnapshot.mockResolvedValue(createSnapshot());
    connection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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

  it("passes eligible exact-locale CMS audio to AudioPlayer", async () => {
    getContentSource.mockReturnValue("database");
    getPublicCitySnapshot.mockResolvedValue(
      createSnapshot({ holstentor: [cmsEnglishAudio] }),
    );

    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "en",
          slug: "holstentor",
        }),
      }),
    );

    expect(connection).toHaveBeenCalledOnce();
    expect(audioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        src: cmsEnglishAudio.url,
        locale: "en",
        city: "lubeck",
        landmark: "holstentor",
      }),
    );
  });

  it.each(["de", "ar"] as const)(
    "does not use English CMS audio for a %s page",
    async (locale) => {
      getContentSource.mockReturnValue("auto");
      getPublicCitySnapshot.mockResolvedValue(
        createSnapshot({ holstentor: [cmsEnglishAudio] }),
      );

      render(
        await LandmarkPage({
          params: Promise.resolve({
            locale,
            slug: "holstentor",
          }),
        }),
      );

      if (locale === "de") {
        expect(audioPlayer).toHaveBeenCalledWith(
          expect.objectContaining({
            src: "/audio/holstentor-de.mp3",
            locale: "de",
          }),
        );
      } else {
        expect(audioPlayer).not.toHaveBeenCalled();
        expect(screen.queryByTestId("audio-player")).toBeNull();
      }
    },
  );

  it("falls back to exact-locale legacy audio when CMS lacks that locale", async () => {
    getContentSource.mockReturnValue("database");
    getPublicCitySnapshot.mockResolvedValue(
      createSnapshot({ holstentor: [cmsEnglishAudio] }),
    );

    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "fr",
          slug: "holstentor",
        }),
      }),
    );

    expect(audioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "/audio/holstentor-fr.mp3",
        locale: "fr",
      }),
    );
  });

  it("keeps code source legacy-only even if CMS media is present", async () => {
    getContentSource.mockReturnValue("code");
    getPublicCitySnapshot.mockResolvedValue(
      createSnapshot({ holstentor: [cmsEnglishAudio] }),
    );

    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "en",
          slug: "holstentor",
        }),
      }),
    );

    expect(connection).not.toHaveBeenCalled();
    expect(audioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "/audio/holstentor-en.mp3",
        locale: "en",
      }),
    );
  });
});
