// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const cache = vi.hoisted(() => ({ peek: vi.fn(), load: vi.fn(), cancelIfUnused: vi.fn(), subscribe: vi.fn(() => vi.fn()) }));
vi.mock("../src/lib/publicContentCache", () => ({ publicContentCache: cache, publicContentCacheKey: (...parts: string[]) => parts.join(":") }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: {} }));
import { usePublicCity, usePublicPlace } from "../src/hooks/usePublicContent";
function Content() {
  const state = usePublicCity("lubeck", "en");
  return <><span>{state.status}</span>{state.status === "error" ? <button onClick={state.retry}>Retry</button> : null}</>;
}
beforeEach(() => { vi.clearAllMocks(); cache.peek.mockReturnValue(undefined); });
afterEach(cleanup);
describe("content loading and explicit recovery", () => {
  it("leaves the error state through a real retry instead of a permanent skeleton", async () => {
    cache.load.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ city: {} });
    render(<Content />);
    expect(screen.getByText("loading")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(screen.getByText("loading")).toBeTruthy();
    await screen.findByText("available");
    expect(cache.load).toHaveBeenCalledTimes(2);
  });
  it("renders warm content immediately while background refresh fails", async () => {
    cache.peek.mockReturnValue({ city: {} }); cache.load.mockRejectedValueOnce(new Error("offline"));
    render(<Content />);
    expect(screen.getByText("available")).toBeTruthy();
    expect(screen.queryByText("loading")).toBeNull();
    await screen.findByText("available");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});

function PlaceContent({ locale }: { locale: "en" | "de" }) {
  const state = usePublicPlace("lubeck", "holstentor", locale);
  return <span>{state.status === "available" ? JSON.stringify(state.data.place.media) : state.status}</span>;
}
it("isolates place cache by locale and ignores a late English response after switching to German", async () => {
  let english!: (value: unknown) => void;
  let german!: (value: unknown) => void;
  cache.load.mockImplementation((key: string) => new Promise(resolve => {
    if (key.includes(":en:")) english = resolve; else german = resolve;
  }));
  const view = render(<PlaceContent locale="en" />);
  view.rerender(<PlaceContent locale="de" />);
  expect(cache.load.mock.calls.map(call => call[0])).toEqual(["place:en:lubeck:holstentor", "place:de:lubeck:holstentor"]);
  expect(cache.cancelIfUnused).toHaveBeenCalledWith("place:en:lubeck:holstentor");
  await act(async () => german({ place: { media: [] } }));
  expect(screen.getByText("[]")).toBeTruthy();
  await act(async () => english({ place: { media: [{ locale: "en", url: "/api/media/english" }] } }));
  expect(screen.getByText("[]")).toBeTruthy();
  expect(screen.queryByText(/english/)).toBeNull();
});
