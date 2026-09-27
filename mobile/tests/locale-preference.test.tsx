// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ data: new Map<string, string>(), get: vi.fn(), set: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: storage.get, setItem: storage.set } }));
import { LOCALE_PREFERENCE_KEY, localePreference, resolveDeviceLocale } from "../src/localization/localePreference";
import { NativeLocaleProvider, useNativeLocale } from "../src/localization/LocaleProvider";
function Traveler() {
  const { locale, setLocale } = useNativeLocale();
  const [position, setPosition] = useState("home");
  return <><span>{locale}/{position}</span><button onClick={() => setPosition("active-walk")}>Continue walk</button><button onClick={() => setLocale("sv")}>Svenska</button><button onClick={() => setLocale("nl")}>Nederlands</button></>;
}
beforeEach(() => {
  storage.data.clear();
  storage.get.mockImplementation(async (key: string) => storage.data.get(key) ?? null);
  storage.set.mockImplementation(async (key: string, value: string) => { storage.data.set(key, value); });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("native locale preference", () => {
  it.each([["de-DE", "de"], ["en-GB", "en"], ["da_DK", "da"], ["sv-SE", "sv"], ["nl-BE", "nl"], ["es-MX", "es"], ["AR-eg", "ar"], ["fr-FR", "en"], ["", "en"]])("resolves device variant %s to %s", (input, expected) => {
    expect(resolveDeviceLocale(input)).toBe(expected);
  });
  it("persists language after restart without remounting traveler state or touching saved/walk data", async () => {
    storage.data.set("citywalk:walk", "existing-active-walk"); storage.data.set("citywalk:saved", "existing-saved");
    const view = render(<NativeLocaleProvider><Traveler /></NativeLocaleProvider>);
    fireEvent.click(screen.getByText("Continue walk")); fireEvent.click(screen.getByText("Svenska"));
    expect(screen.getByText("sv/active-walk")).toBeTruthy();
    await waitFor(() => expect(storage.data.get(LOCALE_PREFERENCE_KEY)).toBe("sv"));
    view.unmount();
    render(<NativeLocaleProvider><Traveler /></NativeLocaleProvider>);
    await screen.findByText("sv/home");
    expect(storage.data.get("citywalk:walk")).toBe("existing-active-walk");
    expect(storage.data.get("citywalk:saved")).toBe("existing-saved");
    expect(storage.set.mock.calls.every(([key]) => key === LOCALE_PREFERENCE_KEY)).toBe(true);
  });
  it("does not let delayed hydration overwrite a new user selection", async () => {
    let resolve!: (value: string) => void;
    storage.get.mockImplementationOnce(() => new Promise<string>(done => { resolve = done; }));
    render(<NativeLocaleProvider><Traveler /></NativeLocaleProvider>);
    await waitFor(() => expect(resolve).toBeDefined());
    fireEvent.click(screen.getByText("Nederlands"));
    await act(async () => { resolve("de"); });
    expect(screen.getByText("nl/home")).toBeTruthy();
    await waitFor(() => expect(storage.data.get(LOCALE_PREFERENCE_KEY)).toBe("nl"));
  });
  it("serializes rapid selections and tolerates unavailable storage", async () => {
    await Promise.all([localePreference.write("sv"), localePreference.write("nl")]);
    expect(await localePreference.read()).toBe("nl");
    storage.get.mockRejectedValueOnce(new Error("unavailable"));
    expect(await localePreference.read()).toBeNull();
    storage.set.mockRejectedValueOnce(new Error("full"));
    await expect(localePreference.write("de")).resolves.toBeUndefined();
  });
});
