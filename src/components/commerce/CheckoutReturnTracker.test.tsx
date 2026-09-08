import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capture, refresh } = vi.hoisted(() => ({
  capture: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: { capture } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { CheckoutReturnTracker } from "@/components/commerce/CheckoutReturnTracker";
import { CITY_PASS_RETURN_STORAGE_KEY } from "@/lib/commerce/cityPassReturn";

describe("CheckoutReturnTracker", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    capture.mockReset();
    refresh.mockReset();
    vi.useRealTimers();
  });

  it("offers the validated original premium destination without granting access", async () => {
    window.sessionStorage.setItem(
      CITY_PASS_RETURN_STORAGE_KEY,
      "/en/lubeck/fuechtingshof?premium=1#premium-audio",
    );
    render(
      <CheckoutReturnTracker
        outcome="success"
        locale="en"
        activeCitySlugs={[]}
        returnLabel="Continue premium experience"
      />,
    );
    const link = await screen.findByRole("link", {
      name: "Continue premium experience",
    });
    expect(link.getAttribute("href")).toBe(
      "/en/lubeck/fuechtingshof?premium=1#premium-audio",
    );
    expect(capture).toHaveBeenCalledWith(
      "checkout_returned",
      expect.objectContaining({ return_outcome: "success" }),
    );
  });

  it("never follows an external stored return path", async () => {
    window.sessionStorage.setItem(
      CITY_PASS_RETURN_STORAGE_KEY,
      "https://evil.example/steal",
    );
    render(
      <CheckoutReturnTracker
        outcome="canceled"
        locale="en"
        activeCitySlugs={[]}
        returnLabel="Continue premium experience"
      />,
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Continue premium experience" }),
      ).toBeNull(),
    );
  });

  it("keeps checkout return analytics and active access city-scoped", async () => {
    window.sessionStorage.setItem(
      CITY_PASS_RETURN_STORAGE_KEY,
      "/en/test-city/museum?premium=1#premium-audio",
    );
    render(
      <CheckoutReturnTracker
        outcome="success"
        locale="en"
        activeCitySlugs={["lubeck"]}
        returnLabel="Continue premium experience"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Continue premium experience" })
          .getAttribute("href"),
      ).toBe("/en/test-city/museum?premium=1#premium-audio"),
    );
    expect(capture).toHaveBeenCalledWith(
      "checkout_returned",
      expect.not.objectContaining({ city_slug: "lubeck" }),
    );
  });
});
