import {
  cleanup,
  fireEvent,
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

import TourBuilder from "@/components/travel/TourBuilder";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import TourPreferences from "@/components/travel/TourPreferences";
import { localizePlaceCategories } from "@/data/placeCategories";
import {
  getDirection,
  getTranslations,
  locales,
  type Locale,
} from "@/lib/i18n";

const { capture } = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: { capture },
}));

vi.mock("@/components/TrackedLink", () => ({
  default: ({
    children,
    href,
  }: React.PropsWithChildren<{
    href: string;
  }>) => <a href={href}>{children}</a>,
}));

const tourId = "lubeck_historic_center";
const origin = { lat: 53.8662, lng: 10.6797 };

const places = [
  {
    slug: "catalog-history",
    category: "see",
    name: "Catalog History",
    shortDescription: "Catalog first",
    duration: "50 min",
    durationMinutes: 50,
    tags: ["history"],
    coordinates: {
      lat: origin.lat + 0.004,
      lng: origin.lng,
    },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
  },
  {
    slug: "near-history",
    category: "see",
    name: "Near History",
    shortDescription: "Nearby history",
    duration: "50 min",
    durationMinutes: 50,
    tags: ["architecture"],
    coordinates: {
      lat: origin.lat + 0.001,
      lng: origin.lng,
    },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
  },
  {
    slug: "closed-place",
    category: "fun",
    name: "Closed Place",
    shortDescription: "Unavailable",
    duration: "10 min",
    durationMinutes: 10,
    tags: ["history"],
    status: "closed",
    coordinates: origin,
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
  },
] as const satisfies readonly DiscoveryPlace[];

function renderBuilder(
  options: Readonly<{
    locale?: Locale;
    builderPlaces?: readonly DiscoveryPlace[];
    withPreferences?: boolean;
  }> = {},
) {
  const locale = options.locale ?? "en";
  const t = getTranslations(locale);
  const categories =
    localizePlaceCategories(t);
  const builderPlaces =
    options.builderPlaces ?? places;

  return render(
    <div dir={getDirection(locale)}>
      {options.withPreferences ? (
        <TourPreferences
          places={builderPlaces}
          categories={categories}
          labels={t.tourPreferences}
          locale={locale}
          tourId={tourId}
          rankingOrigin={origin}
        />
      ) : null}
      <TourBuilder
        places={builderPlaces}
        categories={categories}
        labels={t.tourBuilder}
        locale={locale}
        tourId={tourId}
        origin={origin}
      />
    </div>,
  );
}

function routeText(): string {
  return (
    screen.queryByTestId(
      "personalized-tour-stops",
    )?.textContent ?? ""
  );
}

describe("TourBuilder", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    capture.mockReset();
    vi.restoreAllMocks();
  });

  it("supports accessible time selection and renders an ordered route summary", () => {
    renderBuilder();

    const ninety = screen.getByRole("radio", {
      name: "90 min",
    }) as HTMLInputElement;
    const sixty = screen.getByRole("radio", {
      name: "60 min",
    }) as HTMLInputElement;

    expect(ninety.checked).toBe(true);
    fireEvent.click(sixty);
    expect(sixty.checked).toBe(true);
    expect(ninety.checked).toBe(false);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Your route",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Total time")).toBeTruthy();
    expect(screen.getByText("Walking time")).toBeTruthy();
    expect(
      screen.getByText("Approx. distance"),
    ).toBeTruthy();
    expect(
      screen.getByTestId(
        "personalized-tour-stops",
      ).tagName,
    ).toBe("OL");
    expect(routeText()).toContain("Near History");
    expect(routeText()).not.toContain(
      "Closed Place",
    );
  });

  it("uses current CW-09 interests for the next explicit build", () => {
    renderBuilder({ withPreferences: true });

    fireEvent.click(
      screen.getByRole("button", {
        name: "History",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );

    expect(routeText()).toContain(
      "Catalog History",
    );
    expect(routeText()).not.toContain(
      "Near History",
    );
  });

  it("uses the synchronized less-walking preference on rebuild", () => {
    renderBuilder({ withPreferences: true });

    fireEvent.click(
      screen.getByRole("button", {
        name: "History",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );
    expect(routeText()).toContain(
      "Catalog History",
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Less walking",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Rebuild route",
      }),
    );

    expect(routeText()).toContain("Near History");
    expect(routeText()).not.toContain(
      "Catalog History",
    );
  });

  it("shows localized estimation and availability safeguards", () => {
    renderBuilder();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );

    expect(
      screen.getByText(
        "Distance is estimated between stops and may differ from the actual walking route.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Places known to be closed, under renovation or seasonal are excluded.",
      ),
    ).toBeTruthy();
  });

  it("preserves Arabic RTL chrome and fallback content direction", () => {
    renderBuilder({ locale: "ar" });

    fireEvent.click(
      screen.getByRole("button", {
        name: getTranslations("ar").tourBuilder
          .build,
      }),
    );

    expect(
      screen
        .getByText(
          getTranslations("ar").tourBuilder
            .title,
        )
        .closest("[dir]")
        ?.getAttribute("dir"),
    ).toBe("rtl");
    expect(
      screen
        .getByText("Near History")
        .closest("[lang]")
        ?.getAttribute("dir"),
    ).toBe("ltr");
  });

  it("renders a safe no-fit state", () => {
    renderBuilder({
      builderPlaces: [
        {
          ...places[0],
          duration: "120 min",
          durationMinutes: 120,
        },
      ],
    });

    fireEvent.click(
      screen.getByRole("radio", {
        name: "60 min",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );

    expect(
      screen.getByRole("status").textContent,
    ).toBe(
      "No suitable route fits the selected time and preferences.",
    );
    expect(
      screen.queryByTestId(
        "personalized-tour-stops",
      ),
    ).toBeNull();
  });

  it("fires privacy-safe analytics only on explicit build", () => {
    renderBuilder();

    expect(capture).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("radio", {
        name: "60 min",
      }),
    );
    expect(capture).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      "personalized_tour_built",
      expect.objectContaining({
        tour_id: tourId,
        locale: "en",
        time_budget_minutes: 60,
        selected_interests: [],
        walking_preference: "standard",
        stop_count: 1,
      }),
    );
    expect(
      JSON.stringify(capture.mock.calls),
    ).not.toMatch(
      /coordinates|latitude|longitude|\blat\b|\blng\b/,
    );
  });

  it("does not invent links for places without detail pages", () => {
    renderBuilder();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Build my tour",
      }),
    );

    expect(
      screen
        .getByText("Near History")
        .closest("a"),
    ).toBeNull();
  });
});

describe("tour builder translations", () => {
  it("provides every builder key in all supported locales", () => {
    for (const locale of locales) {
      const values = Object.values(
        getTranslations(locale).tourBuilder,
      );

      expect(values).toHaveLength(18);
      expect(
        values.every(
          (value) => value.trim().length > 0,
        ),
      ).toBe(true);
    }
  });

  it.each([
    ["de", "Persönliche Tour erstellen"],
    ["en", "Build a personalized tour"],
    ["da", "Byg en personlig tur"],
    ["nl", "Bouw een persoonlijke tour"],
    ["sv", "Skapa en personlig tur"],
    ["fr", "Créez un circuit personnalisé"],
    ["tr", "Kişiselleştirilmiş tur oluştur"],
    ["ar", "أنشئ جولة مخصّصة"],
  ] as const)(
    "uses explicit %s builder copy",
    (locale, expectedTitle) => {
      expect(
        getTranslations(locale).tourBuilder
          .title,
      ).toBe(expectedTitle);
    },
  );
});
