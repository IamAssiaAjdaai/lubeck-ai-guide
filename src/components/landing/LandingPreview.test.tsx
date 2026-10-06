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
        expect(["mailto:support@getcitywalk.com", "/privacy", "/terms", "/imprint", "/account-deletion"]).toContain(href);
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
    const caption = screen.getByText("Illustrative preview · final app captures to follow.");
    const figure = caption.closest("figure");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(figure?.querySelector("button, a, input")).toBeNull();
  });

  it("explains the preview step without offering a second web traveler app", () => {
    render(<LandingPreviewPage />);
    expect(screen.getByRole("heading", { name: "Preview your walk. Then go." })).toBeDefined();
    expect(screen.queryByRole("link", { name: /explore lübeck|start walking|build my walk/i })).toBeNull();
  });


  it("explains return-by timing without promising an arrival time", () => {
    render(<LandingPreviewPage />);
    expect(screen.getByRole("heading", { name: "A walk that fits your day." })).toBeDefined();
    expect(screen.getByText("Projected finish")).toBeDefined();
    expect(screen.getByText("Schedule estimate")).toBeDefined();
    expect(screen.getByText("Walking times are estimates, not a guaranteed arrival time.")).toBeDefined();
    expect(screen.queryByText(/guaranteed to get you back|always on time/i)).toBeNull();
  });

  it("keeps the return-by timing card explicitly illustrative and non-interactive", () => {
    render(<LandingPreviewPage />);
    const caption = screen.getByText("Illustrative timing example · estimates update with the walk.");
    const figure = caption.closest("figure");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector("button, a, input")).toBeNull();
    expect(figure?.textContent).toContain("Back by");
    expect(figure?.textContent).toContain("17:30");
  });

  it("describes stories, exact-language audio and place-aware guide availability without universal claims", () => {
    render(<LandingPreviewPage />);
    expect(screen.getByRole("heading", { name: "Discover more as you walk." })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Stories" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Audio" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Ask CITYWALK" })).toBeDefined();
    expect(screen.getByText(/audio is available in your selected language/i)).toBeDefined();
    expect(screen.getByText(/show the sources behind the answer/i)).toBeDefined();
    expect(screen.getByText(/availability varies by place, published content and selected language/i)).toBeDefined();
    expect(screen.queryByText(/audio at every place|ask anything everywhere|all languages/i)).toBeNull();
  });

  it("keeps the Stories / Audio / Ask CITYWALK cards illustrative and non-interactive", () => {
    const { container } = render(<LandingPreviewPage />);
    const section = container.querySelector("#stories-audio-guide");
    expect(section).not.toBeNull();
    expect(section?.querySelector("button, a, input, audio, video, iframe")).toBeNull();
    expect(screen.getByLabelText("Illustrative Ask CITYWALK example")).toBeDefined();
    expect(screen.getByText("Illustrative guide example")).toBeDefined();
  });

  it("renders the configured city rollout without implying store availability", () => {
    render(<LandingPreviewPage />);
    expect(screen.getByRole("heading", { name: "Starting in Lübeck. Built for more cities." })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Lübeck" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Hamburg" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Düsseldorf" })).toBeDefined();
    expect(screen.getByText("First CITYWALK city")).toBeDefined();
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
    expect(screen.getByText(/store availability is announced separately/i)).toBeDefined();
    expect(screen.queryByText(/available now/i)).toBeNull();
  });

  it("reuses existing local decorative assets without new external media requests", () => {
    expect(existsSync("public/images/citywalk-waterfront.webp")).toBe(true);
    expect(existsSync("public/landmarks/holstentor.jpg")).toBe(true);
    expect(existsSync("public/landmarks/marienkirche.jpg")).toBe(true);
    expect(existsSync("public/images/city-hamburg.webp")).toBe(true);
    expect(existsSync("public/images/city-duesseldorf.webp")).toBe(true);
  });
});
