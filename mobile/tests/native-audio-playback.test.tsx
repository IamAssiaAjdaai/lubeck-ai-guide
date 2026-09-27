// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  mode: vi.fn<() => Promise<void>>(), play: vi.fn(), pause: vi.fn(), seek: vi.fn(),
  active: new Set<object>(),
  status: { playing: false, isLoaded: true, isBuffering: false, currentTime: 0, duration: 100, error: false },
}));
vi.mock("expo-audio", () => ({
  setAudioModeAsync: native.mode,
  useAudioPlayer: ({ uri }: { uri: string }) => {
    const player = React.useMemo(() => ({ play: native.play, pause: native.pause, seekTo: native.seek, currentStatus: native.status, muted: false, volume: 1 }), [uri]);
    React.useEffect(() => { native.active.add(player); return () => { native.active.delete(player); }; }, [player]);
    return player;
  },
  useAudioPlayerStatus: () => native.status,
}));
vi.mock("react-native", () => ({ View: ({ children }: React.PropsWithChildren) => <div>{children}</div>, StyleSheet: { create: (s: unknown) => s } }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="alert">{children}</div>,
  PrimaryButton: ({ label, busy, onPress }: { label: string; busy?: boolean; onPress: () => void }) => <button disabled={busy} onClick={onPress}>{label}</button>,
}));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: "en", messages: { audioUnavailable: "Unavailable", retry: "Retry", playAudio: "Play", pauseAudio: "Pause", replayAudio: "Replay", loadingAudio: "Preparing", audioGuide: "Audio guide" } }) }));
import { NativeAudioPlayer } from "../src/components/NativeAudioPlayer";
const player = (source = "https://preview.example/api/media/english") => <NativeAudioPlayer source={source} title="Holstentor" assetLocale="en" />;
beforeEach(() => {
  vi.clearAllMocks(); native.mode.mockResolvedValue(undefined);
  native.status = { playing: false, isLoaded: true, isBuffering: false, currentTime: 0, duration: 100, error: false };
});
afterEach(cleanup);
it("prepares foreground Silent-mode playback before play; actual status drives controls and time", async () => {
  let ready!: () => void;
  native.mode.mockImplementationOnce(() => new Promise<void>(resolve => { ready = resolve; }));
  const view = render(player()); fireEvent.click(screen.getByText("Play"));
  expect(native.play).not.toHaveBeenCalled();
  expect(native.mode).toHaveBeenCalledWith({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false });
  expect((screen.getByText("Preparing") as HTMLButtonElement).disabled).toBe(true);
  await act(async () => ready());
  expect(native.play).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Play")).toBeTruthy();
  native.status = { ...native.status, playing: true, currentTime: 12 }; view.rerender(player());
  expect(screen.getByText("0:12 / 1:40")).toBeTruthy();
  fireEvent.click(screen.getByText("Pause")); expect(native.pause).toHaveBeenCalledTimes(1);
  native.status = { ...native.status, playing: false }; view.rerender(player());
  await act(async () => fireEvent.click(screen.getByText("Play")));
  expect(native.play).toHaveBeenCalledTimes(2);
});
it("recovers from session failure through Retry without two live players", async () => {
  native.mode.mockRejectedValueOnce(new Error("session failure")); render(player());
  await act(async () => fireEvent.click(screen.getByText("Play")));
  expect(screen.getByRole("alert").textContent).toBe("Unavailable");
  expect(native.play).not.toHaveBeenCalled();
  const first = [...native.active][0]; fireEvent.click(screen.getByText("Retry"));
  expect(native.active.size).toBe(1); expect(native.active.has(first)).toBe(false);
  await act(async () => fireEvent.click(screen.getByText("Play")));
  expect(native.play).toHaveBeenCalledTimes(1);
});
it.each(["unmount", "source change"])("does not play a released source after pending session setup and %s", async (action) => {
  let ready!: () => void;
  native.mode.mockImplementationOnce(() => new Promise<void>(resolve => { ready = resolve; }));
  const view = render(player()); fireEvent.click(screen.getByText("Play"));
  if (action === "unmount") view.unmount(); else view.rerender(player("https://preview.example/api/media/new-source"));
  await act(async () => ready());
  expect(native.play).not.toHaveBeenCalled(); expect(native.active.size).toBe(action === "unmount" ? 0 : 1);
});
it("recovers from a native player error through one replacement", () => {
  const view = render(player()); const first = [...native.active][0];
  native.status = { ...native.status, error: true }; view.rerender(player());
  expect(screen.getByRole("alert")).toBeTruthy();
  native.status = { ...native.status, error: false }; fireEvent.click(screen.getByText("Retry"));
  expect(native.active.size).toBe(1); expect(native.active.has(first)).toBe(false);
  expect(screen.getByText("Play")).toBeTruthy();
});
