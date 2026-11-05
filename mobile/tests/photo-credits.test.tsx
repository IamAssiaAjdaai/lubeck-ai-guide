// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "en" as "en" | "de", image: undefined as string | undefined }));
vi.mock("expo-router", () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({ image: state.image }) }));
vi.mock("react-native", () => ({ Linking: { openURL: vi.fn(async () => {}) }, StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 }, View: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: "ltr" }) }));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  AppText: ({ children, accessibilityRole }: React.PropsWithChildren<{ accessibilityRole?: string }>) => accessibilityRole === "header" ? <h2>{children}</h2> : <p>{children}</p>,
  PressableSurface: ({ children, accessibilityLabel, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; onPress(): void }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="alert">{children}</div>,
}));
import { Linking } from "react-native";
import PhotoCreditsScreen from "../src/app/photo-credits";
import { photoCreditEntries, photoCreditsCopy } from "../src/lib/photoCredits";
import { welcomePhotos } from "../src/lib/welcomeCopy";
afterEach(() => { cleanup(); state.locale = "en"; state.image = undefined; vi.clearAllMocks(); });
describe("guest photo credits", () => {
  it("retains every verified bundled source, exact license, creator, title, asset and bilingual modification record", () => {
    expect(photoCreditEntries).toHaveLength(welcomePhotos.length);
    for (const photo of welcomePhotos) {
      const entry = photoCreditEntries.find(entry => entry.id === photo.id)!;
      expect(entry).toMatchObject({ source: photo.source, license: photo.license, licenseName: photo.licenseName });
      for (const field of [entry.creator, entry.title, entry.assets, entry.en, entry.de]) expect(field.length).toBeGreaterThan(0);
      expect(new URL(entry.source).protocol).toBe("https:"); expect(new URL(entry.license).protocol).toBe("https:");
    }
    expect(photoCreditEntries.find(entry => entry.id === "lubeck")?.licenseName).toBe("CC BY-SA 3.0 DE");
  });
  it.each(["en", "de"] as const)("renders credits without authentication in %s and puts the requested image first", locale => {
    state.locale = locale; state.image = "lubeck";
    render(<PhotoCreditsScreen />);
    expect(screen.getAllByRole("heading")[0].textContent).toBe(photoCreditsCopy(locale).title);
    expect(screen.getAllByRole("heading")[1].textContent).toContain("Holstentor");
    expect(screen.getByText(/Christian Wolf \(www.c-w-design.de\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `Lübeck: ${photoCreditsCopy(locale).license} · CC BY-SA 3.0 DE` }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://creativecommons.org/licenses/by-sa/3.0/de/");
  });
  it("shows a recoverable failure when the source link cannot open", async () => {
    vi.mocked(Linking.openURL).mockRejectedValueOnce(new Error("offline")); render(<PhotoCreditsScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Lübeck: Original source" }));
    expect((await screen.findByRole("alert")).textContent).toBe(photoCreditsCopy("en").failed);
  });
});
