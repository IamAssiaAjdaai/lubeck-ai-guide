import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AccountDeletionPage, { metadata as deletionMetadata } from "@/app/account-deletion/page";
import SupportPage from "@/app/support/page";
import { CITYWALK_BRAND } from "@/lib/brand";
import { PublicInfoLayout } from "./PublicInfoLayout";

vi.mock("@/components/account/AccountDeletionRequestPanel", () => ({
  AccountDeletionRequestPanel: () => <div data-testid="deletion-panel">Deletion request panel</div>,
}));

afterEach(cleanup);

describe("public information layout", () => {
  it.each([
    { name: "legal", element: <PublicInfoLayout><h1>Legal notice</h1></PublicInfoLayout> },
    { name: "support", element: <SupportPage /> },
    { name: "deletion", element: <AccountDeletionPage /> },
  ])("provides brand, skip link, landmarks and complete navigation for $name", ({ element }) => {
    const { container } = render(element);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByRole("link", { name: "CITYWALK home" }).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#public-info-content");
    expect(screen.getByRole("main").id).toBe("public-info-content");
    expect(container.firstElementChild?.getAttribute("style")).toContain(CITYWALK_BRAND.colors.canvas);
    const nav = screen.getByRole("navigation", { name: "Legal navigation" });
    expect(Array.from(nav.querySelectorAll("a")).map(a => a.getAttribute("href"))).toEqual([
      "/privacy", "/terms", "/imprint", "/support", "/account-deletion",
    ]);
  });

  it("retains the deletion panel, subscription links and indexable resource", () => {
    render(<AccountDeletionPage />);
    expect(screen.getByTestId("deletion-panel")).toBeDefined();
    expect(screen.getByRole("link", { name: "Manage Apple subscriptions" }).getAttribute("href")).toBe("https://apps.apple.com/account/subscriptions");
    expect(screen.getByRole("link", { name: "Manage Google Play subscriptions" }).getAttribute("href")).toBe("https://play.google.com/store/account/subscriptions");
    expect(deletionMetadata.robots).toEqual({ index: true, follow: true });
  });
});
