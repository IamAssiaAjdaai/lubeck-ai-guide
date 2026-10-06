import { describe, expect, it } from "vitest";

import {
  marketingCampaignInputFromFormData,
  marketingContentInputFromFormData,
  marketingPageInputFromFormData,
} from "@/lib/admin/marketing/formData";

describe("Marketing form data", () => {
  it("parses campaign fields and optional dates", () => {
    const form = new FormData();
    form.set("cityId", "4");
    form.set("slug", "weekend-walk");
    form.set("name", "Weekend walk");
    form.set("objective", "Start walks");
    form.set("audience", "Weekend visitors");
    form.set("message", "Plan less");
    form.set("cta", "Build my walk");
    form.set("startsOn", "");
    form.set("endsOn", "");

    expect(marketingCampaignInputFromFormData(form)).toEqual({
      cityId: 4,
      slug: "weekend-walk",
      name: "Weekend walk",
      objective: "Start walks",
      audience: "Weekend visitors",
      message: "Plan less",
      cta: "Build my walk",
      startsOn: undefined,
      endsOn: undefined,
    });
  });

  it("parses optional page and campaign relations", () => {
    const page = new FormData();
    page.set("cityId", "4");
    page.set("campaignId", "");
    page.set("kind", "blog");
    page.set("slug", "hidden-lubeck");
    page.set("path", "/lubeck/hidden");
    page.set("title", "Hidden Lübeck");
    page.set("body", "Draft body");
    page.set("seoTitle", "");
    page.set("seoDescription", "");
    page.set("cta", "Explore Lübeck");

    expect(marketingPageInputFromFormData(page)).toMatchObject({
      cityId: 4,
      campaignId: undefined,
      kind: "blog",
      slug: "hidden-lubeck",
      path: "/lubeck/hidden",
      cta: "Explore Lübeck",
    });

    const social = new FormData();
    social.set("cityId", "4");
    social.set("campaignId", "2");
    social.set("pageId", "3");
    social.set("contentCode", "CW-LUB-HIDDEN-001");
    social.set("platform", "youtube");
    social.set("format", "short");
    social.set("hook", "One hidden Lübeck stop");
    social.set("script", "");
    social.set("caption", "");
    social.set("cta", "");

    expect(marketingContentInputFromFormData(social)).toMatchObject({
      cityId: 4,
      campaignId: 2,
      pageId: 3,
      contentCode: "CW-LUB-HIDDEN-001",
      script: undefined,
    });
  });
});
