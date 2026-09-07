import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

import { FeaturedCityCard } from "@/components/travel/CityCard";

describe("FeaturedCityCard", () => {
  afterEach(cleanup);

  it("renders a compact, filled, single-line city action after authored content", () => {
    render(
      <FeaturedCityCard
        actionLabel="Explore Lübeck"
        contentDirection="ltr"
        contentLocale="en"
        description="A concise authored city description."
        href="/en/lubeck"
        image="/city.jpg"
        interfaceDirection="ltr"
        interfaceLocale="en"
        name="Lübeck"
      />,
    );

    const image = screen.getByRole("img", { name: "Lübeck" });
    const name = screen.getByRole("heading", { name: "Lübeck" });
    const description = screen.getByText("A concise authored city description.");
    const action = screen.getByRole("link", { name: "Explore Lübeck" });

    expect(action.getAttribute("href")).toBe("/en/lubeck");
    expect(action.className).toContain("button-primary");
    expect(action.className).toContain("h-14");
    expect(action.className).toContain("w-full");
    expect(action.className).toContain("justify-between");
    expect(action.className).toContain("gap-3");
    expect(action.className).toContain("rounded-2xl");
    expect(action.className).toContain("whitespace-nowrap");
    expect(action.className).toContain("font-semibold");
    const label = action.querySelector("span");
    expect(label?.className).toContain("shrink-0");
    expect(label?.className).not.toContain("truncate");
    expect(label?.className).not.toContain("overflow-hidden");
    expect(label?.className).not.toContain("text-ellipsis");
    expect(action.querySelector(".lucide-arrow-right")).not.toBeNull();
    expect(image.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(name.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps optional missing information out of the hierarchy", () => {
    render(
      <FeaturedCityCard
        actionLabel="Explore Ghent"
        contentDirection="ltr"
        contentLocale="en"
        href="/en/ghent"
        interfaceDirection="ltr"
        interfaceLocale="en"
        name="Ghent"
      />,
    );

    expect(screen.getByRole("heading", { name: "Ghent" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Explore Ghent" })).not.toBeNull();
    expect(screen.queryByRole("paragraph")).toBeNull();
  });

  it("uses the RTL arrow direction while preserving a single-line action", () => {
    render(
      <FeaturedCityCard
        actionLabel="استكشف Lübeck"
        contentDirection="rtl"
        contentLocale="ar"
        href="/ar/lubeck"
        interfaceDirection="rtl"
        interfaceLocale="ar"
        name="Lübeck"
      />,
    );

    const action = screen.getByRole("link", { name: "استكشف Lübeck" });
    expect(action.getAttribute("dir")).toBe("rtl");
    expect(action.querySelector(".lucide-arrow-left")).not.toBeNull();
    expect(action.className).toContain("whitespace-nowrap");
    expect(action.textContent).toBe("استكشف Lübeck");
  });
});
