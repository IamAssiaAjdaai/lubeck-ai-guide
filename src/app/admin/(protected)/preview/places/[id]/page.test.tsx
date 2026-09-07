import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/admin/content/service.server", () => ({
  getAuthorizedPlace: vi.fn(async () => ({
    id: 41,
    slug: "draft-place",
    publicationStatus: "in_review",
    localizations: [{
      locale: "en",
      name: "Draft place",
      shortDescription: "Not public yet.",
      description: "Protected preview content.",
      story: null,
    }],
  })),
}));

import AdminPlacePreviewPage, { metadata } from "./page";
import { getAuthorizedPlace } from "@/lib/admin/content/service.server";

describe("protected editorial preview", () => {
  it("renders an explicit unpublished banner and disables indexing/cache", async () => {
    render(await AdminPlacePreviewPage({
      params: Promise.resolve({ id: "41" }),
      searchParams: Promise.resolve({}),
    }));
    expect(screen.getByText("Preview — Not published")).toBeTruthy();
    expect(screen.getByText("Protected preview content.")).toBeTruthy();
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
    });
    expect(getAuthorizedPlace).toHaveBeenCalledWith(41);
  });
});
