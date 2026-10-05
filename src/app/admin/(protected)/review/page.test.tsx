import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminCapability: vi.fn(),
  listAuthorizedCities: vi.fn(),
  listAuthorizedPlaces: vi.fn(),
  listAuthorizedTours: vi.fn(),
  listMarketingReviewQueue: vi.fn(),
}));

vi.mock("@/lib/admin/authorization.server", () => ({
  requireAdminCapability: mocks.requireAdminCapability,
}));
vi.mock("@/lib/admin/content/service.server", () => ({
  listAuthorizedCities: mocks.listAuthorizedCities,
  listAuthorizedPlaces: mocks.listAuthorizedPlaces,
  listAuthorizedTours: mocks.listAuthorizedTours,
}));
vi.mock("@/lib/admin/marketing/workflow.server", () => ({
  listMarketingReviewQueue: mocks.listMarketingReviewQueue,
}));

import ReviewQueuePage from "./page";

describe("review queue", () => {
  beforeEach(() => {
    mocks.requireAdminCapability.mockResolvedValue({});
    mocks.listAuthorizedCities.mockResolvedValue([
      {
        id: 1,
        slug: "lubeck",
        name: "Lübeck",
        publicationStatus: "in_review",
        localizations: [{ name: "Lübeck" }],
      },
    ]);
    mocks.listAuthorizedPlaces.mockResolvedValue([
      {
        id: 2,
        slug: "holstentor",
        publicationStatus: "in_review",
        city: { slug: "lubeck" },
        localizations: [{ name: "Holstentor" }],
      },
    ]);
    mocks.listAuthorizedTours.mockResolvedValue([
      {
        id: 3,
        slug: "historic-center",
        publicationStatus: "published",
        city: { slug: "lubeck" },
        localizations: [{ title: "Historic center" }],
      },
    ]);
    mocks.listMarketingReviewQueue.mockResolvedValue([
      {
        type: "Marketing page",
        id: 4,
        title: "2 Hours in Lübeck",
        cityName: "Lübeck",
        status: "in_review",
        href: "/admin/marketing/pages/4",
      },
      {
        type: "Social",
        id: 5,
        title: "CW-LUB-TIME-001",
        cityName: "Lübeck",
        status: "in_review",
        href: "/admin/marketing/social/5",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows editorial and Marketing content waiting for review", async () => {
    render(await ReviewQueuePage());

    expect(mocks.requireAdminCapability).toHaveBeenCalledWith("publishing:review");
    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByText("4 items waiting for review.")).toBeInTheDocument();
    expect(screen.getAllByText("Lübeck")).toHaveLength(3);
    expect(screen.getByText("Holstentor")).toBeInTheDocument();
    expect(screen.getByText("2 Hours in Lübeck")).toBeInTheDocument();
    expect(screen.getByText("CW-LUB-TIME-001")).toBeInTheDocument();
    expect(screen.queryByText("Historic center")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Review" })).toHaveLength(4);
  });
});
