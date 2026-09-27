// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  mapReady: undefined as (() => void) | undefined,
  mapFailed: undefined as (() => void) | undefined,
  audioError: false, audioLoaded: false,
}));
vi.mock("react-native", () => ({
  View: ({ children, accessibilityRole, accessibilityLabel }: React.PropsWithChildren<{ accessibilityRole?: string; accessibilityLabel?: string }>) => <div role={accessibilityRole} aria-label={accessibilityLabel}>{children}</div>,
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Pressable: ({ children, onPress }: React.PropsWithChildren<{ onPress: () => void }>) => <button onClick={onPress}>{children}</button>,
  ActivityIndicator: () => <span>spinner</span>,
  StyleSheet: { create: (styles: unknown) => styles },
  AppState: { currentState: "active", addEventListener: () => ({ remove: vi.fn() }) },
}));
vi.mock("@maplibre/maplibre-react-native", () => ({
  Map: ({ children, onDidFinishRenderingMapFully, onDidFailLoadingMap }: React.PropsWithChildren<{ onDidFinishRenderingMapFully: () => void; onDidFailLoadingMap: () => void }>) => {
    native.mapReady = onDidFinishRenderingMapFully; native.mapFailed = onDidFailLoadingMap;
    return <div><button onClick={onDidFinishRenderingMapFully}>Map ready</button><button onClick={onDidFailLoadingMap}>Map failed</button>{children}</div>;
  }, Camera: () => null, Marker: () => null, GeoJSONSource: () => null, Layer: () => null,
}));
vi.mock("expo-audio", () => ({
  useAudioPlayer: () => ({}),
  useAudioPlayerStatus: () => ({ error: native.audioError, isLoaded: native.audioLoaded, currentTime: 0, duration: 60 }),
}));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="alert">{children}</div>,
  PrimaryButton: ({ label, busy, onPress }: { label: string; busy?: boolean; onPress: () => void }) => <button disabled={busy} onClick={onPress}>{label}</button>,
}));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: "en", messages: { useLocation: "Use location", retry: "Retry", audioUnavailable: "Audio unavailable", loadingAudio: "Preparing audio", playAudio: "Play", audioGuide: "Audio guide" } }) }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/lib/location.expo", () => ({ expoForegroundLocationAdapter: {} }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
import { NativeCityMap } from "../src/components/NativeCityMap";
import { NativeAudioPlayer } from "../src/components/NativeAudioPlayer";
beforeEach(() => { native.audioError = false; native.audioLoaded = false; });
afterEach(cleanup);
describe("native media loading boundaries (bridges mocked)", () => {
  it("keeps loading inside the map, removes it on ready and allows failed-map retry", () => {
    render(<NativeCityMap places={[]} />);
    expect(screen.getByRole("progressbar", { name: "Preparing the map…" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Map ready" }));
    expect(screen.queryByRole("progressbar")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Map failed" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });
  it("keeps audio loading inline and recreates a failed player on retry", () => {
    const view = render(<NativeAudioPlayer source="https://preview.example/audio.mp3" title="Holstentor" />);
    expect((screen.getByRole("button", { name: "Preparing audio" }) as HTMLButtonElement).disabled).toBe(true);
    native.audioError = true; view.rerender(<NativeAudioPlayer source="https://preview.example/audio.mp3" title="Holstentor" />);
    expect(screen.getByRole("alert")).toBeTruthy();
    native.audioError = false; native.audioLoaded = true;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
