import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture } }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { CityPassPaywall } from "@/components/commerce/CityPassPaywall";
import { getCityPassCopy } from "@/lib/commerce/cityPassCopy";

describe("CityPassPaywall", () => {
  afterEach(() => {
    cleanup();
    capture.mockReset();
  });

  it("appears only after the deliberate premium selection and dismisses to free", () => {
    const copy = getCityPassCopy("en");
    render(
      <CityPassPaywall
        locale="en"
        copy={copy}
        returnPath="/en/lubeck/glandorps-gang?premium=1#premium-audio"
        signedIn={false}
        offer={{ priceId: 7, formattedPrice: "€6.99", productSlug: "lubeck-digital-guide-pass-72h" }}
      />,
    );
    expect(screen.queryByRole("heading", { name: copy.title })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.premiumLabel }));
    expect(screen.getByRole("heading", { name: copy.title })).not.toBeNull();
    expect(screen.getByRole("link", { name: copy.signInToUnlock }).getAttribute("href"))
      .toContain("/en/account?next=");
    fireEvent.click(screen.getByText(copy.continueFree));
    expect(screen.queryByRole("heading", { name: copy.title })).toBeNull();
    expect(capture).toHaveBeenCalledWith("premium_feature_selected", expect.objectContaining({ city_slug: "lubeck" }));
    expect(capture).toHaveBeenCalledWith("paywall_viewed", expect.objectContaining({ pass_duration_hours: 72 }));
  });

  it("renders the Arabic value proposition RTL without inventing a price", () => {
    const copy = getCityPassCopy("ar");
    const { container } = render(
      <CityPassPaywall
        locale="ar"
        copy={copy}
        returnPath="/ar/lubeck/glandorps-gang?premium=1#premium-audio"
        signedIn={false}
        initiallyOpen
      />,
    );
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByText(copy.unavailable)).not.toBeNull();
    expect(screen.queryByText(/€6\.99/)).toBeNull();
  });
});
