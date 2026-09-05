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

import TourCard from "@/components/travel/TourCard";
import TourPreferences from "@/components/travel/TourPreferences";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import { localizePlaceCategories } from "@/data/placeCategories";
import {
  getDirection,
  getTranslations,
  locales,
  type Locale,
} from "@/lib/i18n";
import { getTourPreferencesStorageKey } from "@/lib/tourPreferencesStorage";

const { capture, trackedLink } = vi.hoisted(
  () => ({
    capture: vi.fn(),
    trackedLink: vi.fn(),
  }),
);

vi.mock("posthog-js", () => ({
  default: { capture },
}));

vi.mock("@/components/TrackedLink", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<
    Record<string, unknown>
  >) => {
    trackedLink(props);

    return (
      <a href={String(props.href)}>
        {children}
      </a>
    );
  },
}));

const tourId = "lubeck_historic_center";
const rankingOrigin = {
  lat: 53.8662,
  lng: 10.6797,
};

const places = [
  {
    slug: "architecture-place",
    category: "see",
    name: "Architecture Place",
    shortDescription: "Architecture description",
    duration: "20 min",
    durationMinutes: 20,
    tags: ["architecture"],
    coordinates: { lat: 53.89, lng: 10.72 },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
    detailHref: "/en/lubeck/architecture-place",
  },
  {
    slug: "history-place",
    category: "see",
    name: "History Place",
    shortDescription: "History description",
    duration: "20 min",
    durationMinutes: 20,
    tags: ["history"],
    coordinates: { lat: 53.88, lng: 10.7 },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
  },
  {
    slug: "hidden-place",
    category: "fun",
    name: "Hidden Place",
    shortDescription: "Hidden description",
    duration: "20 min",
    durationMinutes: 20,
    tags: ["hidden-gem"],
    coordinates: { lat: 53.87, lng: 10.69 },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
  },
  {
    slug: "family-place",
    category: "fun",
    name: "Family Place",
    shortDescription: "Family description",
    duration: "20 min",
    durationMinutes: 20,
    tags: ["family"],
    coordinates: rankingOrigin,
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
  },
] as const satisfies readonly DiscoveryPlace[];

function renderPreferences(
  locale: Locale = "en",
  recommendationPlaces:
    readonly DiscoveryPlace[] = places,
) {
  const t = getTranslations(locale);

  return render(
    <div dir={getDirection(locale)}>
      <TourPreferences
        places={recommendationPlaces}
        categories={localizePlaceCategories(t)}
        labels={t.tourPreferences}
        locale={locale}
        tourId={tourId}
        rankingOrigin={rankingOrigin}
      />
    </div>,
  );
}

function recommendationText(): string {
  return (
    screen.getByTestId(
      "tour-recommendations",
    ).textContent ?? ""
  );
}

function firstRecommendationText(): string {
  return (
    screen.getByTestId(
      "tour-recommendations",
    ).firstElementChild?.textContent ?? ""
  );
}

describe("TourPreferences", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    capture.mockReset();
    trackedLink.mockReset();
    vi.restoreAllMocks();
  });

  it("supports multi-select interests and updates recommendations immediately", () => {
    renderPreferences();

    const history = screen.getByRole(
      "button",
      { name: "History" },
    );
    const architecture = screen.getByRole(
      "button",
      { name: "Architecture" },
    );

    fireEvent.click(history);
    fireEvent.click(architecture);

    expect(
      history.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      architecture.getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(
      recommendationText().indexOf(
        "Architecture Place",
      ),
    ).toBeLessThan(
      recommendationText().indexOf(
        "Hidden Place",
      ),
    );
    expect(capture).toHaveBeenLastCalledWith(
      "tour_preferences_changed",
      {
        tour_id: tourId,
        locale: "en",
        selected_interests: [
          "history",
          "architecture",
        ],
        walking_preference: "standard",
      },
    );
  });

  it("uses a single radio selection and less-walking proximity ranking", () => {
    renderPreferences();

    const standard = screen.getByRole(
      "radio",
      { name: "Standard" },
    );
    const lessWalking = screen.getByRole(
      "radio",
      { name: "Less walking" },
    );

    expect(
      (standard as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (lessWalking as HTMLInputElement).checked,
    ).toBe(false);

    fireEvent.click(lessWalking);

    expect(
      (standard as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (lessWalking as HTMLInputElement).checked,
    ).toBe(true);
    expect(firstRecommendationText()).toContain(
      "Family Place",
    );
  });

  it("persists preferences across remounts", async () => {
    const firstRender = renderPreferences();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hidden gems",
      }),
    );
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Less walking",
      }),
    );
    firstRender.unmount();

    renderPreferences();

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", {
            name: "Hidden gems",
          })
          .getAttribute("aria-pressed"),
      ).toBe("true");
      expect(
        (
          screen.getByRole("radio", {
            name: "Less walking",
          }) as HTMLInputElement
        ).checked,
      ).toBe(true);
    });
    expect(firstRecommendationText()).toContain(
      "Hidden Place",
    );
  });

  it("resets persisted and visible preferences", () => {
    renderPreferences();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Family",
      }),
    );
    expect(recommendationText()).toContain(
      "Family Place",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset",
      }),
    );

    expect(
      screen
        .getByRole("button", {
          name: "Family",
        })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      (
        screen.getByRole("radio", {
          name: "Standard",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      window.sessionStorage.getItem(
        getTourPreferencesStorageKey(
          tourId,
        ),
      ),
    ).toBeNull();
  });

  it("preserves RTL chrome and the actual language direction of fallback content", () => {
    const fallbackPlace = {
      ...places[2],
      requestedLocale: "ar",
      actualLocale: "en",
      contentDirection: "ltr",
    } as const satisfies DiscoveryPlace;

    renderPreferences("ar", [fallbackPlace]);

    const content = screen
      .getByText("Hidden Place")
      .closest("[lang]");

    expect(
      screen
        .getByText(
          getTranslations("ar")
            .tourPreferences.title,
        )
        .closest("[dir]")
        ?.getAttribute("dir"),
    ).toBe("rtl");
    expect(content?.getAttribute("lang")).toBe(
      "en",
    );
    expect(content?.getAttribute("dir")).toBe(
      "ltr",
    );
  });

  it("does not emit analytics on render or leak location data", () => {
    renderPreferences();

    expect(capture).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "History",
      }),
    );

    expect(
      JSON.stringify(capture.mock.calls),
    ).not.toMatch(
      /coordinates|latitude|longitude|\blat\b|\blng\b/,
    );
  });
});

describe("TourCard regression", () => {
  afterEach(() => {
    cleanup();
    trackedLink.mockReset();
  });

  it("keeps the canonical Holstentor start and tour_started analytics", () => {
    render(
      <TourCard
        eyebrow="Walking Tour"
        title="Historic Centre"
        duration="45 min"
        stops="5 stops"
        ctaLabel="Start Tour"
        href="/en/lubeck/holstentor"
        locale="en"
        tourId={tourId}
        startLandmarkSlug="holstentor"
      />,
    );

    expect(trackedLink).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "/en/lubeck/holstentor",
        eventName: "tour_started",
        properties: {
          locale: "en",
          start_landmark_slug: "holstentor",
          tour_id: tourId,
        },
      }),
    );
  });
});

describe("tour preference translations", () => {
  it("provides every key in every supported locale", () => {
    for (const locale of locales) {
      const values = Object.values(
        getTranslations(locale)
          .tourPreferences,
      );

      expect(values).toHaveLength(12);
      expect(
        values.every(
          (value) => value.trim().length > 0,
        ),
      ).toBe(true);
    }
  });

  it.each([
    ["de", "Deine Entdeckungen personalisieren"],
    ["en", "Personalize your discoveries"],
    ["da", "Tilpas dine oplevelser"],
    ["nl", "Personaliseer je ontdekkingen"],
    ["sv", "Anpassa dina upptäckter"],
    ["fr", "Personnalisez vos découvertes"],
    ["tr", "Keşiflerini kişiselleştir"],
    ["ar", "خصّص اكتشافاتك"],
  ] as const)(
    "uses explicit %s preference copy",
    (locale, expectedTitle) => {
      expect(
        getTranslations(locale)
          .tourPreferences.title,
      ).toBe(expectedTitle);
    },
  );
});
