import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MarketingLandingTracker from "@/components/marketing/MarketingLandingTracker";

const { capture, hasOptedOut } = vi.hoisted(() => ({
  capture: vi.fn(),
  hasOptedOut: vi.fn(() => false),
}));

vi.mock("posthog-js", () => ({
  default: {
    capture,
    has_opted_out_capturing: hasOptedOut,
  },
}));

describe("MarketingLandingTracker", () => {
  afterEach(() => {
    cleanup();
    capture.mockReset();
    hasOptedOut.mockReset();
    hasOptedOut.mockReturnValue(false);
  });

  it("tracks landing_view and the CTA with the same UTM attribution", async () => {
    render(
      <MarketingLandingTracker
        city="lubeck"
        landingVariant="2-hours"
        campaignSlug="two-hours-in-lubeck"
        attribution={{
          source: "instagram",
          medium: "social",
          campaign: "two-hours-in-lubeck",
          contentId: "CW-LUB-TIME-001",
        }}
        ctaHref="/en/lubeck?utm_source=instagram"
        ctaLabel="Build my walk"
      />,
    );

    const expectedProperties = {
      city: "lubeck",
      landing_variant: "2-hours",
      source: "instagram",
      medium: "social",
      campaign: "two-hours-in-lubeck",
      content_id: "CW-LUB-TIME-001",
    };

    await waitFor(() =>
      expect(capture).toHaveBeenCalledWith("landing_view", expectedProperties),
    );

    fireEvent.click(screen.getByRole("link", { name: "Build my walk" }));

    expect(capture).toHaveBeenCalledWith(
      "build_walk_clicked",
      expectedProperties,
    );
  });

  it("uses linked campaign context for direct traffic without blocking the CTA", async () => {
    render(
      <MarketingLandingTracker
        city="lubeck"
        landingVariant="2-hours"
        campaignSlug="two-hours-in-lubeck"
        attribution={{}}
        ctaHref="/en/lubeck"
        ctaLabel="Build my walk"
      />,
    );

    await waitFor(() =>
      expect(capture).toHaveBeenCalledWith("landing_view", {
        city: "lubeck",
        landing_variant: "2-hours",
        source: "direct",
        campaign: "two-hours-in-lubeck",
      }),
    );

    expect(
      screen.getByRole("link", { name: "Build my walk" }).getAttribute("href"),
    ).toBe("/en/lubeck");
  });

  it("keeps the page usable when analytics is opted out", async () => {
    hasOptedOut.mockReturnValue(true);

    render(
      <MarketingLandingTracker
        city="lubeck"
        landingVariant="2-hours"
        attribution={{ source: "tiktok" }}
        ctaHref="/en/lubeck"
        ctaLabel="Build my walk"
      />,
    );

    await waitFor(() => expect(hasOptedOut).toHaveBeenCalled());
    expect(capture).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Build my walk" })).not.toBeNull();
  });
});
