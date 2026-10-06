import { describe, expect, it } from "vitest";

import {
  MarketingValidationError,
  validateMarketingCampaignInput,
  validateMarketingContentInput,
  validateMarketingPageInput,
} from "@/lib/admin/marketing/validation";

function expectValidationError(run: () => unknown, message: string) {
  expect(run).toThrowError(MarketingValidationError);
  expect(run).toThrowError(message);
}

describe("Marketing draft validation", () => {
  it("normalizes a valid campaign and rejects inverted dates", () => {
    expect(
      validateMarketingCampaignInput({
        cityId: 1,
        slug: " two-hours-in-lubeck ",
        name: " 2 Hours in Lübeck ",
        objective: " Start more walks ",
        audience: " Train travelers ",
        message: " Plan less ",
        cta: " Build my walk ",
        startsOn: "2026-10-10",
        endsOn: "2026-10-20",
      }),
    ).toMatchObject({
      slug: "two-hours-in-lubeck",
      name: "2 Hours in Lübeck",
      cta: "Build my walk",
    });

    expectValidationError(
      () =>
        validateMarketingCampaignInput({
          cityId: 1,
          slug: "launch",
          name: "Launch",
          objective: "Acquire walkers",
          audience: "Visitors",
          message: "Explore more",
          cta: "Start",
          startsOn: "2026-10-20",
          endsOn: "2026-10-10",
        }),
      "Campaign end date cannot be before its start date.",
    );
  });

  it("requires page paths to be public-path shaped", () => {
    expectValidationError(
      () =>
        validateMarketingPageInput({
          cityId: 1,
          kind: "landing",
          slug: "2-hours",
          path: "lubeck/2 hours",
          title: "Two hours",
          body: "Body",
        }),
      "Page path must start with / and cannot contain spaces.",
    );
  });

  it("requires stable uppercase social content codes", () => {
    expectValidationError(
      () =>
        validateMarketingContentInput({
          cityId: 1,
          contentCode: "cw-lub-001",
          platform: "instagram",
          format: "reel-short",
          hook: "A hook",
        }),
      "Content code must use uppercase letters, numbers and hyphens only.",
    );

    expect(
      validateMarketingContentInput({
        cityId: 1,
        campaignId: 2,
        pageId: 3,
        contentCode: " CW-LUB-TIME-001 ",
        platform: " instagram ",
        format: " reel-short ",
        hook: " A hook ",
      }),
    ).toMatchObject({
      contentCode: "CW-LUB-TIME-001",
      platform: "instagram",
      format: "reel-short",
      hook: "A hook",
    });
  });
});
