import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavedWalks from "./SavedWalks";
import { readSavedWalks, saveWalk } from "@/lib/walk/storage";

const walk = { id: "same-id", citySlug: "lubeck", cityName: "Lübeck", placeSlugs: ["holstentor"], minutes: 30, distance: 100, savedAt: 1 };
describe("local saved walks", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it("updates duplicates, preserves other cities and removes only the chosen walk across remounts", () => {
    saveWalk(walk);
    saveWalk({ ...walk, minutes: 45 });
    saveWalk({ ...walk, citySlug: "other-city", cityName: "Other city" });
    expect(readSavedWalks()).toHaveLength(2);
    const { unmount } = render(<SavedWalks locale="en" trips={false} />);
    expect(screen.getByText(/45 min/)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove walk: Lübeck" }));
    expect(readSavedWalks().map(({ citySlug }) => citySlug)).toEqual(["other-city"]);
    unmount();
    render(<SavedWalks locale="en" trips={false} />);
    expect(screen.queryByText("Lübeck")).toBeNull();
    expect(screen.getByText("Other city")).not.toBeNull();
  });
  it("reports unavailable storage without claiming removal succeeded", () => {
    saveWalk(walk);
    render(<SavedWalks locale="en" trips={false} />);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: "Remove walk: Lübeck" }));
    expect(screen.getByRole("alert").textContent).toMatch(/couldn’t remove/);
    expect(screen.getByText("Lübeck")).not.toBeNull();
  });
  it("refreshes when another tab removes stored walks", () => {
    saveWalk(walk);
    render(<SavedWalks locale="en" trips={false} />);
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(screen.queryByText("Lübeck")).toBeNull();
  });
});
