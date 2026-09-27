import { afterEach, expect, it, vi } from "vitest";
import { readAudioDiagnostics, registerAudioDiagnosticPlayer, startAudioDiagnostics, stopAudioDiagnostics } from "../src/lib/audioDiagnostics";
afterEach(() => { stopAudioDiagnostics(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("is opt-in, bounded, and excludes URLs/error text while recording actual time and cleanup", () => {
  vi.stubGlobal("__DEV__", true); vi.useFakeTimers();
  let time = 0;
  const remove = registerAudioDiagnosticPlayer({}, {
    source: "https://secret:credential@preview.example/api/media/0a553f78-c231-457c-a021-3b3211431cdc?token=private",
    requestedLocale: "en", assetLocale: "en",
    sample: () => ({ playing: true, currentTime: time, duration: 100, muted: false, volume: 1, error: "private-object-key", sessionSetup: "ready" }),
  });
  expect(readAudioDiagnostics()).toEqual([]); expect(startAudioDiagnostics(999_999)).toBe(true);
  time = 5; vi.advanceTimersByTime(1000);
  expect(JSON.stringify(readAudioDiagnostics())).toContain('"currentTime":5');
  expect(JSON.stringify(readAudioDiagnostics())).toContain('"playerCount":1');
  expect(JSON.stringify(readAudioDiagnostics())).not.toMatch(/secret|credential|token|private|https/);
  remove(); vi.advanceTimersByTime(1000);
  expect(readAudioDiagnostics().at(-1)).toMatchObject({ playerCount: 0 });
  vi.advanceTimersByTime(70_000); const count = readAudioDiagnostics().length;
  expect(count).toBeLessThanOrEqual(60); vi.advanceTimersByTime(60_000);
  expect(readAudioDiagnostics()).toHaveLength(count);
});
it("cannot collect diagnostics in a release build", () => {
  vi.stubGlobal("__DEV__", false); const sample = vi.fn();
  registerAudioDiagnosticPlayer({}, { source: "secret", requestedLocale: "en", sample });
  expect(startAudioDiagnostics()).toBe(false); expect(readAudioDiagnostics()).toEqual([]);
  expect(sample).not.toHaveBeenCalled();
});
