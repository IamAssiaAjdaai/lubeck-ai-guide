import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  preferences: vi.fn(),
  builder: vi.fn(),
}));

vi.mock("@/components/travel/TourPreferences", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.preferences(props);
    return <div>Preferences panel</div>;
  },
}));

vi.mock("@/components/travel/TourBuilder", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.builder(props);
    return <div>Builder panel</div>;
  },
}));

import CustomTourPlanner from "@/components/travel/CustomTourPlanner";
import { localizePlaceCategories } from "@/data/placeCategories";
import { getTranslations } from "@/lib/i18n";
import { getCityScopedPlannerId } from "@/lib/tourIdentity";

describe("CustomTourPlanner", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps preferences inside the collapsed custom-tour flow", () => {
    const t = getTranslations("en");

    render(
      <CustomTourPlanner
        places={[]}
        categories={localizePlaceCategories(t)}
        preferenceLabels={t.tourPreferences}
        builderLabels={t.tourBuilder}
        locale="en"
        citySlug="test-city"
        plannerId="test-tour"
        origin={{ lat: 53.8662, lng: 10.6797 }}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: t.tourBuilder.build,
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Preferences panel")).toBeNull();
    expect(screen.queryByText("Builder panel")).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Preferences panel")).not.toBeNull();
    expect(screen.getByText("Builder panel")).not.toBeNull();
  });

  it("uses a deterministic city-scoped identity for arbitrary cities", () => {
    const t = getTranslations("en");

    render(
      <CustomTourPlanner
        places={[]}
        categories={localizePlaceCategories(t)}
        preferenceLabels={t.tourPreferences}
        builderLabels={t.tourBuilder}
        locale="en"
        citySlug="ghent"
        origin={{ lat: 51.057, lng: 3.721 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: t.tourBuilder.build }));

    expect(getCityScopedPlannerId("ghent")).toBe("citywalk:ghent:custom-tour");
    expect(mocks.preferences).toHaveBeenCalledWith(
      expect.objectContaining({ tourId: "citywalk:ghent:custom-tour" }),
    );
    expect(mocks.builder).toHaveBeenCalledWith(
      expect.objectContaining({ tourId: "citywalk:ghent:custom-tour" }),
    );
  });
});
