import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MapLocationControl from "@/components/map/MapLocationControl";

afterEach(cleanup);

describe("MapLocationControl", () => {
  it("is keyboard accessible with a localized label", async () => {
    const onActivate = vi.fn();
    const user = userEvent.setup();
    render(
      <MapLocationControl
        status="idle"
        label="Use my location"
        onActivate={onActivate}
      />,
    );

    const control = screen.getByRole("button", { name: "Use my location" });
    await user.tab();
    expect(document.activeElement).toBe(control);
    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("exposes requesting and active states accessibly", () => {
    const { rerender } = render(
      <MapLocationControl
        status="requesting"
        label="Finding your location…"
        onActivate={vi.fn()}
      />,
    );

    const requesting = screen.getByRole("button", {
      name: "Finding your location…",
    }) as HTMLButtonElement;
    expect(requesting.disabled).toBe(true);
    expect(requesting.getAttribute("aria-busy")).toBe("true");

    rerender(
      <MapLocationControl
        status="available"
        label="Your location"
        onActivate={vi.fn()}
      />,
    );

    const active = screen.getByRole("button", { name: "Your location" });
    expect(active.getAttribute("data-location-status")).toBe("available");
    expect((active as HTMLButtonElement).disabled).toBe(false);
  });

  it("allows retry after a recoverable error", async () => {
    const onActivate = vi.fn();
    const user = userEvent.setup();
    render(
      <MapLocationControl
        status="timeout"
        label="Try again"
        onActivate={onActivate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onActivate).toHaveBeenCalledOnce();
  });
});
