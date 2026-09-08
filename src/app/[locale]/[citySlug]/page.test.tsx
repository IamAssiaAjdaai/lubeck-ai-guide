import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));
vi.mock("@/lib/content/source", () => ({
  getContentSource: mocks.getContentSource,
}));
vi.mock("@/lib/content/publicRepository.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/content/publicRepository.server")
  >("@/lib/content/publicRepository.server");
  return {
    ...actual,
    getPublicCitySnapshot: mocks.getPublicCitySnapshot,
  };
});

import { GenericCityContent } from "@/app/[locale]/[citySlug]/page";

describe("generic public city landing", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getContentSource.mockReturnValue("database");
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a discoverable published city and its published places", async () => {
    render(await renderPage("en", "ghent"));

    expect(screen.getByRole("heading", { name: "Ghent", level: 1 })).not.toBeNull();
    expect(screen.getByText("A compact published city description.")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Gravensteen", level: 3 })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Gravensteen" }).getAttribute("href"))
      .toBe("/en/ghent/gravensteen");
    expect(screen.getByRole("img", { name: "Ghent" }).getAttribute("src"))
      .toBe("/api/media/city-hero");
    expect(mocks.getPublicCitySnapshot).toHaveBeenCalledWith("ghent", "database");
  });

  it("uses semantic language and direction for fallback content", async () => {
    render(await renderPage("ar", "ghent"));

    const heading = screen.getByRole("heading", { name: "Ghent", level: 1 });
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("rtl");
    expect(heading.closest("[lang]")?.getAttribute("lang")).toBe("en");
    expect(heading.closest("[dir]")?.getAttribute("dir")).toBe("ltr");
  });

  it.each([
    ["en", "unknown"],
    ["en", "draft-city"],
    ["en", "published-without-places"],
  ])("returns not found for unavailable city %s/%s", async (locale, citySlug) => {
    mocks.getPublicCitySnapshot.mockRejectedValue(new Error("unavailable"));

    await expect(renderPage(locale, citySlug)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("returns not found for an invalid locale without reading content", async () => {
    await expect(renderPage("xx", "ghent")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getPublicCitySnapshot).not.toHaveBeenCalled();
    expect(mocks.connection).not.toHaveBeenCalled();
  });
});

function renderPage(locale: string, citySlug: string) {
  return GenericCityContent({
    params: Promise.resolve({ locale, citySlug }),
  });
}

function snapshot() {
  return {
    city: {
      slug: "ghent",
      content: {
        en: {
          name: "Ghent",
          shortDescription: "A compact published city description.",
        },
      },
    },
    places: [{
      slug: "gravensteen",
      city: "ghent",
      category: "see",
      coordinates: { lat: 51.057, lng: 3.721 },
      durationMinutes: 45,
      environment: "mixed",
      pricing: "paid",
      tags: ["history"],
      content: {
        en: {
          name: "Gravensteen",
          shortDescription: "A published place description.",
        },
      },
    }],
    tours: [],
    media: {
      city: [{
        assetKey: "city-hero",
        kind: "image",
        purpose: "hero",
        url: "/api/media/city-hero",
        mimeType: "image/jpeg",
      }],
      places: {},
      tours: {},
    },
  };
}
