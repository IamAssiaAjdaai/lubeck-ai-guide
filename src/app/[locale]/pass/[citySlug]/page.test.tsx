import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CityPassLandingPage from "./page";
import { getCityPassAccessState } from "@/lib/commerce/cityPassAccess.server";
import { getActiveCityPassOffer } from "@/lib/commerce/queries.server";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: string; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/auth/server", () => ({ getAuth: () => ({ api: { getSession: vi.fn(async () => null) } }) }));
vi.mock("@/lib/commerce/cityPassAccess.server", () => ({ getCityPassAccessState: vi.fn() }));
vi.mock("@/lib/commerce/queries.server", () => ({
  getActiveCityPassOffer: vi.fn(),
  formatMinorCurrency: () => "€6.99",
}));
vi.mock("@/components/commerce/CityPassPaywall", () => ({
  CityPassPaywall: ({ returnPath, offer, pass }: { returnPath: string; offer?: { priceId: number }; pass: { citySlug: string; featureId: string } }) => (
    <div data-return-path={returnPath} data-offer-price-id={offer?.priceId} data-city-slug={pass.citySlug} data-feature-id={pass.featureId}>CITYWALK PASS checkout</div>
  ),
}));

describe("city-scoped pass landing for native guide upgrades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCityPassAccessState).mockResolvedValue({ status: "none", active: false });
    vi.mocked(getActiveCityPassOffer).mockResolvedValue(undefined);
  });

  it("uses the existing city-scoped offer and safe checkout return intent", async () => {
    vi.mocked(getActiveCityPassOffer).mockResolvedValue({
      priceId: 1, productSlug: "lubeck-digital-guide-pass-72h", unitAmount: 699,
      currency: "eur", productName: "Lübeck City Pass", description: null, durationDays: 3,
    });
    const html = renderToStaticMarkup(await CityPassLandingPage({ params: Promise.resolve({ locale: "en", citySlug: "lubeck" }) }));
    expect(html).toContain("CITYWALK PASS checkout");
    expect(html).toContain('data-return-path="/en/pass/lubeck"');
    expect(html).toContain('data-offer-price-id="1"');
    expect(html).toContain('data-city-slug="lubeck"');
    expect(html).toContain('data-feature-id="verified_ai_guide"');
    expect(getActiveCityPassOffer).toHaveBeenCalledWith("lubeck");
  });

  it("shows active access instead of another checkout and rejects unconfigured cities", async () => {
    vi.mocked(getCityPassAccessState).mockResolvedValue({ status: "active", active: true });
    const html = renderToStaticMarkup(await CityPassLandingPage({ params: Promise.resolve({ locale: "de", citySlug: "lubeck" }) }));
    expect(html).toContain("CITYWALK PASS");
    expect(html).not.toContain("CITYWALK PASS checkout");
    expect(getActiveCityPassOffer).not.toHaveBeenCalled();
    await expect(CityPassLandingPage({ params: Promise.resolve({ locale: "en", citySlug: "test-city" }) })).rejects.toThrow("NOT_FOUND");
  });
});
