// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import type { PublicPlaceCard } from "../src/lib/api/contracts";

const storage = vi.hoisted(() => ({ values: new Map<string, string>(), write: vi.fn(), locale: "en" }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => storage.values.get(key) ?? null,
  setItem: async (key: string, value: string) => { await storage.write(); storage.values.set(key, value); },
} }));
vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
  Link: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native", () => ({ View: ({ children, accessibilityLabel }: React.PropsWithChildren<{ accessibilityLabel?: string }>) => <div aria-label={accessibilityLabel}>{children}</div> }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => <span aria-hidden="true">✓</span> }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="alert">{children}</div>,
  PrimaryButton: ({ label, busy, disabled, onPress, leadingIcon, accessibilityState }: { label: string; busy?: boolean; disabled?: boolean; onPress?: () => void; leadingIcon?: React.ReactNode; accessibilityState?: { selected?: boolean } }) => <button aria-pressed={accessibilityState?.selected} disabled={busy || disabled} onClick={onPress}>{leadingIcon}{label}</button>,
}));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: storage.locale, messages: { retry: "Retry" } }) }));
vi.mock("../src/hooks/usePublicContent", () => ({ prefetchPublicCity: async () => undefined }));
vi.mock("../src/lib/publicContentCache", () => ({ publicContentCacheKey: () => "city", publicContentCache: { peek: () => ({ city: { slug: "lubeck" }, places }) } }));
import { WalkMembershipControl } from "../src/components/WalkMembershipControl";
import { addPlaceToCurrentWalk, isInWalk, removePlaceFromCurrentWalk } from "../src/lib/walkMembership";
import { loadActiveWalk, loadCurrentWalk, persistActiveWalk, persistCurrentWalk, subscribeCurrentWalk } from "../src/lib/walkStorage";
import { uxCopy } from "../src/design/uxCopy";
const places: PublicPlaceCard[] = ["holstentor", "marienkirche", "old-town"].map((slug, i) => ({
  slug, category: "see", coordinates: { lat: 53.865 + i * .001, lng: 10.68 }, durationMinutes: 15,
  tags: ["history"], media: [], requestedLocale: "en", resolvedLocale: "en", didFallback: false,
  content: { name: slug, shortDescription: "Published place" },
}));
function journey(overrides: Partial<WalkJourney> = {}): WalkJourney {
  return { id: "walk", citySlug: "lubeck", settings: { minutes: 120, walking: "balanced", interests: ["history"], start: places[0].coordinates },
    remaining: ["holstentor"], visited: [], position: places[0].coordinates, historyDistance: 0, startedAt: Date.now(), ...overrides };
}
beforeEach(() => { storage.values.clear(); storage.write.mockReset().mockResolvedValue(undefined); storage.locale = "en"; });
afterEach(cleanup);

describe("real current-walk persistence and membership", () => {
  it("retains a preview across reloads without starting it, and reads legacy active records", async () => {
    const initial = journey();
    await persistCurrentWalk(initial, "preview");
    expect(await loadCurrentWalk("lubeck")).toEqual({ journey: initial, phase: "preview" });
    expect(await loadActiveWalk("lubeck")).toBeUndefined();
    await persistActiveWalk(initial);
    expect(await loadActiveWalk("lubeck")).toEqual(initial);
    expect(await loadCurrentWalk("hamburg")).toBeUndefined();
  });
  it("serializes concurrent additions without duplicate IDs or losing other additions", async () => {
    await persistActiveWalk(journey());
    await Promise.all([
      addPlaceToCurrentWalk("lubeck", "marienkirche", places),
      addPlaceToCurrentWalk("lubeck", "marienkirche", places),
      addPlaceToCurrentWalk("lubeck", "old-town", places),
    ]);
    expect((await loadCurrentWalk("lubeck"))?.journey.remaining).toEqual(["holstentor", "marienkirche", "old-town"]);
  });
  it("normalizes legacy duplicates and recognizes visited places as already included", async () => {
    storage.values.set("citywalk:native:v2:active:lubeck", JSON.stringify(journey({ remaining: ["holstentor", "holstentor", "marienkirche"], visited: ["marienkirche", "marienkirche"] })));
    await addPlaceToCurrentWalk("lubeck", "marienkirche", places);
    const current = await loadCurrentWalk("lubeck");
    expect(current?.journey.remaining).toEqual(["holstentor"]);
    expect(current?.journey.visited).toEqual(["marienkirche"]);
    expect(isInWalk(current, "marienkirche")).toBe(true);
  });
  it("removes remaining and visited memberships, preserving route context", async () => {
    const initial = journey({ visited: ["marienkirche"], historyDistance: 250 });
    await persistActiveWalk(initial);
    await removePlaceFromCurrentWalk("lubeck", "holstentor");
    await removePlaceFromCurrentWalk("lubeck", "marienkirche");
    expect((await loadCurrentWalk("lubeck"))?.journey).toEqual({ ...initial, remaining: [], visited: [] });
  });
  it("rejects budget/ineligible additions and keeps the accepted route", async () => {
    const initial = journey(); await persistActiveWalk(initial);
    await expect(addPlaceToCurrentWalk("lubeck", "missing", places)).rejects.toThrow("walk-ineligible");
    await expect(addPlaceToCurrentWalk("lubeck", "marienkirche", places.map(p => p.slug === "marienkirche" ? { ...p, durationMinutes: 500 } : p))).rejects.toThrow("walk-budget");
    expect(await loadActiveWalk("lubeck")).toEqual(initial);
  });
  it("does not publish a failed write, and clears membership on finish", async () => {
    const initial = journey(); await persistActiveWalk(initial);
    const notify = vi.fn(), unsubscribe = subscribeCurrentWalk("lubeck", notify);
    try {
      storage.write.mockRejectedValueOnce(new Error("disk full"));
      await expect(removePlaceFromCurrentWalk("lubeck", "holstentor")).rejects.toThrow("disk full");
      expect(notify).not.toHaveBeenCalled();
      expect(await loadActiveWalk("lubeck")).toEqual(initial);
      await persistActiveWalk({ ...initial, finishedAt: Date.now() });
      expect(notify).toHaveBeenLastCalledWith(undefined);
      expect(isInWalk(await loadCurrentWalk("lubeck"), "holstentor")).toBe(false);
    } finally { unsubscribe(); }
  });
});

describe("membership across mounted native surfaces (native bridges mocked)", () => {
  it.each(["en", "de", "ar"])("never offers Add for an existing place and synchronizes removal/addition in %s", async locale => {
    storage.locale = locale; const t = uxCopy(locale);
    await persistCurrentWalk(journey(), "preview");
    render(<>
      <section aria-label="Place Detail"><WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" /></section>
      <section aria-label="Route Preview"><WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" onlyMember /></section>
      <section aria-label="Explore"><WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" readOnly /></section>
    </>);
    expect(screen.queryByRole("button", { name: t.add })).toBeNull();
    await waitFor(() => expect(screen.getAllByRole("button", { name: t.remove, pressed: true })).toHaveLength(2));
    fireEvent.click(within(screen.getByRole("region", { name: "Route Preview" })).getByRole("button", { name: t.remove }));
    await screen.findByRole("button", { name: t.add });
    expect(screen.queryByText(t.included)).toBeNull();
    expect(screen.queryByLabelText(t.included)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: t.add }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: t.remove, pressed: true })).toHaveLength(2));
    expect((await loadCurrentWalk("lubeck"))?.phase).toBe("preview");
    expect((await loadCurrentWalk("lubeck"))?.journey.remaining).toEqual(["holstentor"]);
  });
  it("shows Adding immediately, ignores repeated taps, and publishes only after persistence", async () => {
    render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" />);
    const add = await screen.findByRole("button", { name: "Add to my walk" });
    let release!: () => void;
    storage.write.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
    fireEvent.click(add); fireEvent.click(add);
    expect((screen.getByRole("button", { name: "Adding…" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("In my walk ✓")).toBeNull();
    await waitFor(() => expect(storage.write).toHaveBeenCalledOnce());
    await act(async () => release());
    await screen.findByRole("button", { name: "Remove from walk", pressed: true });
    expect((await loadCurrentWalk("lubeck"))?.journey.remaining).toEqual(["holstentor"]);
  });
  it("retains already-added state after failed removal and permits retry", async () => {
    await persistActiveWalk(journey());
    render(<WalkMembershipControl citySlug="lubeck" placeSlug="holstentor" />);
    await screen.findByRole("button", { name: "Remove from walk", pressed: true });
    storage.write.mockRejectedValueOnce(new Error("disk full"));
    fireEvent.click(screen.getByRole("button", { name: "Remove from walk" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Add to my walk" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove from walk", pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove from walk" }));
    await screen.findByRole("button", { name: "Add to my walk" });
  });
});
