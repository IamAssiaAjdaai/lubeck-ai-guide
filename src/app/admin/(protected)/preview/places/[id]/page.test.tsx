import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, unoptimized: _unoptimized, ...imgProps } = props;
    return <img {...imgProps} />;
  },
}));
vi.mock("@/lib/admin/content/service.server", () => ({
  getAuthorizedPlace: vi.fn(async () => ({
    id: 41,
    slug: "draft-place",
    category: "see",
    durationMinutes: 45,
    publicationStatus: "draft",
    city: { id: 6, name: "Hamburg", slug: "hamburg" },
    sourceLinks: [{ source: { canonicalUrl: "https://example.com" }, required: true }],
    localizations: [{
      locale: "en",
      name: "Elbphilharmonie",
      shortDescription: "Hamburg landmark on the Elbe.",
      description: "Protected preview content.",
      story: "The brick base meets the glass wave.",
      visitNotes: "Check current Plaza access before visiting.",
      facts: [
        { label: "Plaza height", value: "37 metres" },
        { label: "Location", value: "HafenCity" },
      ],
    }],
  })),
}));
vi.mock("@/lib/media/service.server", () => ({
  getAuthorizedPlacePreviewMedia: vi.fn(async () => ({
    alt: "Elbphilharmonie Hamburg",
    url: "/api/admin/media/local-object?objectKey=hero.jpg",
  })),
}));

import AdminPlacePreviewPage, { metadata } from "./page";
import { getAuthorizedPlace } from "@/lib/admin/content/service.server";
import { getAuthorizedPlacePreviewMedia } from "@/lib/media/service.server";

describe("protected traveler place preview", () => {
  it("renders draft CMS content in a mobile traveler hierarchy", async () => {
    render(await AdminPlacePreviewPage({
      params: Promise.resolve({ id: "41" }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByText("Traveler preview — Draft content, not published")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Elbphilharmonie", level: 1 })).toBeTruthy();
    expect(screen.getByText("45 min visit")).toBeTruthy();
    expect(screen.getByText("Protected preview content.")).toBeTruthy();
    expect(screen.getByText("Check current Plaza access before visiting.")).toBeTruthy();
    expect(screen.getByText("Plaza height")).toBeTruthy();
    expect(screen.getByText("37 metres")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Elbphilharmonie" })).toBeTruthy();
    expect(screen.getByText(/mirrors the traveler place-detail hierarchy/i)).toBeTruthy();
    expect(getAuthorizedPlace).toHaveBeenCalledWith(41);
    expect(getAuthorizedPlacePreviewMedia).toHaveBeenCalledWith(41);
  });

  it("stays protected from indexing and caching", () => {
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
    });
  });
});
