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
  trackLandmarkView,
  askGuide,
  getPremiumPlaceAudio,
  getSession,
  getCityPassAccessState,
  getActiveCityPassOffer,
} = vi.hoisted(() => ({
  audioPlayer: vi.fn(),
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
  trackLandmarkView: vi.fn(),
  askGuide: vi.fn(),
  getPremiumPlaceAudio: vi.fn(),
  getSession: vi.fn(),
  getCityPassAccessState: vi.fn(),
  getActiveCityPassOffer: vi.fn(),
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

vi.mock("@/lib/commerce/premiumMedia.server", () => ({
  getPremiumPlaceAudio,
}));

vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/commerce/cityPassAccess.server", () => ({
  getCityPassAccessState,
}));

vi.mock("@/lib/commerce/queries.server", () => ({
  getActiveCityPassOffer,
  formatMinorCurrency: vi.fn().mockReturnValue("€6.99"),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div role="img" aria-label={alt} data-src={src} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
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
  default: (props: Record<string, unknown>) => {
    askGuide(props);
    return <div data-testid="ask-guide" />;
  },
}));

vi.mock("@/components/TrackLandmarkView", () => ({
  default: (props: Record<string, unknown>) => {
    trackLandmarkView(props);
    return null;
  },
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

import LandmarkPage, {
  generateStaticParams,
} from "@/app/[locale]/lubeck/[slug]/page";
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
  durationSeconds: 97,
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
    getPremiumPlaceAudio.mockResolvedValue(undefined);
    getSession.mockResolvedValue(null);
    getCityPassAccessState.mockResolvedValue({ active: false });
    getActiveCityPassOffer.mockResolvedValue(undefined);
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

  it.each([
    [38, "0:38"],
    [87, "1:27"],
    [124, "2:04"],
  ] as const)("renders selected CMS audio duration %s as %s", async (durationSeconds, expected) => {
    getContentSource.mockReturnValue("database");
    getPublicCitySnapshot.mockResolvedValue(
      createSnapshot({ holstentor: [{ ...cmsEnglishAudio, durationSeconds }] }),
    );

    render(
      await LandmarkPage({
        params: Promise.resolve({ locale: "en", slug: "holstentor" }),
      }),
    );

    expect(screen.getByText(`Audio guide · ${expected}`)).not.toBeNull();
  });

  it("omits duration when the selected audio has no reliable metadata", async () => {
    getContentSource.mockReturnValue("database");
    getPublicCitySnapshot.mockResolvedValue(
      createSnapshot({
        holstentor: [{ ...cmsEnglishAudio, durationSeconds: undefined }],
      }),
    );

    render(
      await LandmarkPage({
        params: Promise.resolve({ locale: "en", slug: "holstentor" }),
      }),
    );

    expect(audioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ src: cmsEnglishAudio.url }),
    );
    expect(screen.getByText("Audio guide")).not.toBeNull();
    expect(screen.queryByText(/Audio guide ·/)).toBeNull();
    expect(screen.queryByText("2 min")).toBeNull();
    expect(screen.queryByText("30 min")).toBeNull();
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
    expect(screen.getByText("Audio guide · 1:37")).not.toBeNull();
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

  it("keeps canonical tour progress, tracking, and AI context unchanged", async () => {
    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "en",
          slug: "holstentor",
        }),
      }),
    );

    expect(screen.getByText("Stop 1 of 5")).not.toBeNull();
    expect(
      screen.getByRole("link", { name: /Next Stop/i }).getAttribute("href"),
    ).toBe("/en/lubeck/marienkirche");
    expect(trackLandmarkView).toHaveBeenCalledWith(
      expect.objectContaining({
        landmark: "holstentor",
        stopNumber: 1,
      }),
    );
    expect(askGuide).toHaveBeenCalledWith(
      expect.objectContaining({
        citySlug: "lubeck",
        placeSlug: "holstentor",
      }),
    );
  });

  it("renders a simple non-tour place detail without tour-only behavior or fake audio", async () => {
    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "en",
          slug: "cafe-niederegger",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: /Café Niederegger/i }),
    ).not.toBeNull();
    expect(screen.getByText("Eat")).not.toBeNull();
    expect(screen.queryByTestId("audio-player")).toBeNull();
    expect(screen.queryByTestId("ask-guide")).toBeNull();
    expect(screen.queryByText(/Stop 1 of 5/i)).toBeNull();
    expect(trackLandmarkView).not.toHaveBeenCalled();
    expect(askGuide).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Back" }).getAttribute("href"),
    ).toBe("/en/lubeck");
  });

  it("uses CMS place imagery on non-tour details without changing RTL navigation", async () => {
    const cmsImage: PublicMedia = {
      assetKey: "place-hero",
      kind: "image",
      purpose: "hero",
      url: "/api/media/place-hero",
      mimeType: "image/jpeg",
    };
    getContentSource.mockReturnValue("database");
    getPublicCitySnapshot.mockResolvedValue(
      createSnapshot({ "cafe-niederegger": [cmsImage] }),
    );

    render(
      await LandmarkPage({
        params: Promise.resolve({
          locale: "ar",
          slug: "cafe-niederegger",
        }),
      }),
    );

    expect(
      screen.getByRole("img").getAttribute("data-src"),
    ).toBe(cmsImage.url);
    const heading = screen.getByRole("heading", {
      name: /Café Niederegger/i,
    });
    expect(heading.getAttribute("lang")).toBe("en");
    expect(heading.getAttribute("dir")).toBe("ltr");
    const backLink = screen.getByRole("link", {
      name: getTranslations("ar").common.back,
    });
    expect(backLink.closest("main")?.getAttribute("dir")).toBe("rtl");
    expect(backLink.querySelector(".lucide-arrow-right")).not.toBeNull();
  });

  it("prepares static params for all 25 code-catalog places", () => {
    const params = generateStaticParams();

    expect(params).toHaveLength(27 * 25);
    expect(
      params.filter(({ locale }) => locale === "en"),
    ).toHaveLength(25);
    expect(params).toContainEqual({
      locale: "en",
      slug: "cafe-niederegger",
    });
  });

  it("shows a configured exact-locale premium trigger while keeping the free place open", async () => {
    getContentSource.mockReturnValue("database");
    getPremiumPlaceAudio.mockResolvedValue({
      assetKey: "123e4567-e89b-42d3-a456-426614174000",
      src: "/api/commerce/media/123e4567-e89b-42d3-a456-426614174000",
      locale: "en",
      durationSeconds: 87,
    });
    getActiveCityPassOffer.mockResolvedValue({
      priceId: 7,
      productSlug: "lubeck-digital-guide-pass-72h",
      currency: "eur",
      unitAmount: 699,
    });

    render(
      await LandmarkPage({
        params: Promise.resolve({ locale: "en", slug: "fuechtingshof" }),
      }),
    );

    expect(screen.getByRole("heading", { name: /F.chtingshof/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Premium narration" })).not.toBeNull();
    expect(screen.queryByText(/Unlock Hidden Lübeck/)).toBeNull();
  });

  it("bypasses the paywall and renders protected audio for an active entitlement", async () => {
    getContentSource.mockReturnValue("database");
    getPremiumPlaceAudio.mockResolvedValue({
      assetKey: "123e4567-e89b-42d3-a456-426614174000",
      src: "/api/commerce/media/123e4567-e89b-42d3-a456-426614174000",
      locale: "en",
      durationSeconds: 87,
    });
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getCityPassAccessState.mockResolvedValue({
      active: true,
      expiresAt: new Date("2030-01-04T12:00:00Z"),
    });

    render(
      await LandmarkPage({
        params: Promise.resolve({ locale: "en", slug: "fuechtingshof" }),
      }),
    );

    expect(screen.getByText("Hidden Lübeck premium audio")).not.toBeNull();
    expect(audioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "/api/commerce/media/123e4567-e89b-42d3-a456-426614174000",
        premiumAnalytics: expect.objectContaining({
          entitlement_scope: "city:lubeck",
        }),
      }),
    );
    expect(screen.queryByRole("button", { name: "Premium narration" })).toBeNull();
  });
});
