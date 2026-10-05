import { cleanup, render, screen } from "@testing-library/react";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import LandingPreviewPage, { metadata } from "@/app/landing-preview/page";

// This preview must not turn placeholders into a fake launch or collect data.
describe("landing Header / Hero checkpoint", () => {
  afterEach(cleanup);

  it("introduces the app on both platforms with a single main heading", () => {
    render(<LandingPreviewPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("A better way");
    expect(screen.getByText("iPhone and Android.")).toBeDefined();
    expect(screen.getByText("Launching first in Lübeck. More cities to follow.")).toBeDefined();
    expect(screen.getByRole("main").closest('[lang="en"][dir="ltr"]')).not.toBeNull();
  });

  it("keeps the design-review route out of search indexing", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("gives every navigation and hero anchor a real destination", () => {
    const { container } = render(<LandingPreviewPage />);
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href.length).toBeGreaterThan(1);
      if (href.startsWith("#")) {
        expect(container.querySelector(`[id="${href.slice(1)}"]`)).not.toBeNull();
      } else {
        expect(href).toBe("mailto:support@getcitywalk.com");
      }
    }
    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#landing-content");
    expect(screen.getByRole("main").getAttribute("tabindex")).toBe("-1");
  });

  it("does not claim downloads, signups, prices or invented reviews", () => {
    const { container } = render(<LandingPreviewPage />);
    expect(container.querySelector("form, input, video, iframe")).toBeNull();
    expect(container.querySelector('a[href*="apps.apple.com"], a[href*="play.google.com"]')).toBeNull();
    expect(screen.queryByText(/download on|available now|unlimited|five stars/i)).toBeNull();
    expect(screen.getByText(/Store links and launch notifications will be added/)).toBeDefined();
  });

  it("labels the phone illustration instead of claiming a real app capture", () => {
    render(<LandingPreviewPage />);
    const figure = screen.getByRole("figure");
    expect(figure.textContent).toContain("Illustrative preview · final app captures to follow.");
    expect(figure.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(figure.querySelector("button, a, input")).toBeNull();
  });

  it("explains the preview step without offering a second web traveler app", () => {
    render(<LandingPreviewPage />);
    expect(screen.getByRole("heading", { name: "Preview your walk. Then go." })).toBeDefined();
    expect(screen.queryByRole("link", { name: /explore lübeck|start walking|build my walk/i })).toBeNull();
  });

  it("reuses an existing local decorative asset without new external media requests", () => {
    expect(existsSync("public/images/citywalk-waterfront.webp")).toBe(true);
  });
});
