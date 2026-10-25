// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCuratedProgress } from "@citywalk/traveler-core";
import { CuratedTourControls } from "../src/components/CuratedTourControls";
const mocks = vi.hoisted(() => ({ load: vi.fn(), open: vi.fn(), update: vi.fn(), replace: vi.fn(), push: vi.fn() }));
vi.mock("expo-router", async () => {
  const React = await import("react");
  return { useRouter: () => ({ replace: mocks.replace, push: mocks.push }), useFocusEffect: (fn: () => void) => React.useEffect(fn, [fn]), Link: ({ children }: React.PropsWithChildren) => <>{children}</> };
});
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("react-native", () => ({ View: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("../src/components/ui", () => ({ AppText: ({ children }: React.PropsWithChildren) => <p>{children}</p>, PrimaryButton: ({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress?: () => void }) => <button disabled={disabled} onClick={onPress}>{label}</button> }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: "en", messages: { startTour: "Start tour", tripComplete: "Completed", tripSaveFailed: "Save failed", retry: "Retry" } }) }));
vi.mock("../src/lib/curatedProgressStorage", () => ({ loadCuratedProgress: mocks.load, openCuratedProgress: mocks.open, updateCuratedProgress: mocks.update }));
const stops = ["holstentor", "marienkirche", "rathaus", "heiligen-geist-hospital", "buddenbrookhaus"];
const progress = createCuratedProgress("lubeck", "historic", stops, 100);
const trip = { version: 1 as const, id: "published-historic", citySlug: "lubeck", stopSlugs: stops, currentStopIndex: 0, source: "published" as const };
beforeEach(() => { vi.clearAllMocks(); mocks.load.mockResolvedValue(undefined); mocks.open.mockResolvedValue(progress); });
afterEach(cleanup);
describe("rendered curated controls (native bridges mocked)", () => {
  it("persists Start before navigating and resumes the first pending fixed stop after remount", async () => {
    mocks.load.mockResolvedValue({ ...progress, statuses: ["visited", "skipped", "pending", "pending", "pending"] });
    mocks.open.mockResolvedValue({ ...progress, statuses: ["visited", "skipped", "pending", "pending", "pending"] });
    render(<CuratedTourControls citySlug="lubeck" tourSlug="historic" stopSlugs={stops} />);
    await waitFor(() => expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledOnce());
    expect(mocks.open).toHaveBeenCalledWith("lubeck", "historic", stops);
    expect(mocks.push.mock.calls[0][0].params).toMatchObject({ placeSlug: "rathaus", tripStops: stops.join(",") });
  });
  it("persists skipped status and advances without deleting or reordering any fixed stop", async () => {
    mocks.load.mockResolvedValue(progress);
    mocks.update.mockResolvedValue({ ...progress, statuses: ["skipped", "pending", "pending", "pending", "pending"] });
    render(<CuratedTourControls citySlug="lubeck" tourSlug="historic" stopSlugs={stops} trip={trip} />);
    await waitFor(() => expect(screen.getAllByRole("button").length).toBe(2));
    fireEvent.click(screen.getAllByRole("button")[1]);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith(progress, 0, "skipped");
    expect(mocks.replace.mock.calls[0][0].params.tripStops).toBe(stops.join(","));
  });
  it("never navigates or claims completion after a failed write", async () => {
    mocks.load.mockResolvedValue(progress); mocks.update.mockRejectedValue(Error("disk"));
    render(<CuratedTourControls citySlug="lubeck" tourSlug="historic" stopSlugs={stops} trip={trip} />);
    await waitFor(() => expect(screen.getAllByRole("button").length).toBe(2));
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(await screen.findByText("Save failed")).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Completed")).toBeNull();
  });
  it("retries a transient storage load failure without inventing progress", async () => {
    mocks.load.mockRejectedValueOnce(Error("disk")).mockResolvedValue(progress);
    render(<CuratedTourControls citySlug="lubeck" tourSlug="historic" stopSlugs={stops} trip={trip} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByText("Save failed")).toBeNull());
    expect(mocks.load).toHaveBeenCalledTimes(2);
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("browses other stops without marking them or moving the execution cursor", async () => {
    mocks.load.mockResolvedValue(progress);
    render(<CuratedTourControls citySlug="lubeck" tourSlug="historic" stopSlugs={stops} trip={{ ...trip, currentStopIndex: 3 }} />);
    await waitFor(() => expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button"));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.replace.mock.calls[0][0].params.placeSlug).toBe("holstentor");
  });
  it("recovers completed progress without resetting or starting a new execution", async () => {
    mocks.load.mockResolvedValue({ ...progress, statuses: stops.map(() => "visited") });
    render(<CuratedTourControls citySlug="lubeck" tourSlug="historic" stopSlugs={stops} trip={trip} />);
    expect(await screen.findByText("Completed")).toBeTruthy();
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
