import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LandingPreviewPage from "@/app/landing-preview/page";
import { LandingFaq, LandingFooter, LandingLaunchSection } from "./LandingClosing";

describe("landing launch / FAQ / footer checkpoint", () => {
  afterEach(cleanup);

  it("keeps both app platforms planned and does not collect subscriber data", () => {
    const { container } = render(<LandingLaunchSection />);
    expect(screen.getByRole("region", { name: "Your next walk is waiting." })).toBeDefined();
    expect(screen.getAllByText("Planned")).toHaveLength(2);
    expect(container.querySelector("form, input, button, iframe")).toBeNull();
    expect(container.querySelector('a[href*="apps.apple.com"], a[href*="play.google.com"]')).toBeNull();
    expect(screen.getByRole("link", { name: /Contact CITYWALK/ }).getAttribute("href")).toBe("mailto:support@getcitywalk.com");
    expect(screen.getByText(/Contacting support does not subscribe you to launch emails/)).toBeDefined();
  });

  it("uses four native disclosures, all closed on first render", () => {
    const { container } = render(<LandingFaq />);
    const details = [...container.querySelectorAll("details")];
    expect(details).toHaveLength(4);
    for (const item of details) {
      expect(item.hasAttribute("open")).toBe(false);
      expect(item.firstElementChild?.tagName).toBe("SUMMARY");
      expect(item.querySelector("p")?.textContent?.length).toBeGreaterThan(30);
    }
    expect(container.querySelector("button, input, form")).toBeNull();
  });

  it("shows the approved launch pricing without promising unlimited or full-offline access", () => {
    render(<LandingFaq />);
    expect(screen.getByText(/72-hour City Pass is planned at €4\.99/)).toBeDefined();
    expect(screen.getByText(/€7\.99 per month or €39\.99 per year/)).toBeDefined();
    expect(screen.getByText(/Store prices may be localized by country/)).toBeDefined();
    expect(screen.getByText(/A fully offline experience is not promised for launch/)).toBeDefined();
    expect(screen.queryByText(/free forever|works entirely offline|unlimited access/i)).toBeNull();
  });

  it("separates guest planning from authenticated account saves", () => {
    render(<LandingFaq />);
    expect(screen.getByText(/explore and plan a walk without signing in/)).toBeDefined();
    expect(screen.getByText(/Saving a walk to your CITYWALK account requires sign-in/)).toBeDefined();
    expect(screen.getByText(/City rollout and app-store release are announced separately/)).toBeDefined();
  });

  it("shows social channels without inventing account links before they are live", () => {
    const { container } = render(<LandingFooter />);
    expect(screen.getByText("Follow CITYWALK")).toBeDefined();
    expect(screen.getByText("Instagram")).toBeDefined();
    expect(screen.getByText("YouTube")).toBeDefined();
    expect(screen.getAllByText("@getcitywalk")).toHaveLength(2);
    expect(screen.getAllByText("Soon")).toHaveLength(2);
    expect(container.querySelector('a[href*="instagram.com"], a[href*="youtube.com"]')).toBeNull();
  });

  it("keeps unfinished legal pages pending while linking the live deletion resource", () => {
    render(<LandingFooter />);
    expect(screen.getByText("Legal pages · in preparation")).toBeDefined();
    for (const label of ["Privacy", "Terms", "Imprint"]) {
      expect(screen.getByText(label)).toBeDefined();
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
    expect(screen.getByRole("link", { name: "Account deletion" }).getAttribute("href")).toBe("/account-deletion");
    expect(screen.getByText(/Account deletion is available separately/)).toBeDefined();
  });

  it("integrates one footer outside main and gives every link a real destination", () => {
    const { container } = render(<LandingPreviewPage />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.closest("main")).toBeNull();
    expect(screen.getAllByRole("heading", { name: "Your next walk is waiting." })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Quick answers." })).toHaveLength(1);
    const ids = [...container.querySelectorAll("[id]")].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const anchor of container.querySelectorAll("a")) {
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#")) expect(ids).toContain(href.slice(1));
      else expect(["mailto:support@getcitywalk.com", "/account-deletion"]).toContain(href);
    }
  });
});
