// Opt-in, in-memory development evidence only. Never stores URLs or error text.
type PlayerSample = {
  playing?: boolean;
  isLoaded?: boolean;
  isBuffering?: boolean;
  currentTime?: number;
  duration?: number;
  muted?: boolean;
  volume?: number;
  error?: unknown;
  sessionSetup?: string;
};
type Registration = {
  source: string;
  requestedLocale: string;
  assetLocale?: string;
  sample: () => PlayerSample;
};
const players = new Map<object, Registration>();
let timer: ReturnType<typeof setInterval> | undefined;
let deadline = 0;
let events: object[] = [];
const development = () => typeof __DEV__ !== "undefined" && __DEV__;
const localeLabel = (value?: string) => value && /^[a-z]{2}$/.test(value) ? value : "unknown";

export function registerAudioDiagnosticPlayer(player: object, registration: Registration): () => void {
  if (!development()) return () => {};
  players.set(player, registration);
  return () => { players.delete(player); };
}

function capture() {
  if (!development() || Date.now() >= deadline) {
    stopAudioDiagnostics();
    return;
  }
  const samples = [...players.values()].map(({ source, requestedLocale, assetLocale, sample }) => {
    let assetId: string | undefined;
    try {
      assetId = new URL(source).pathname.match(/^\/api\/media\/([0-9a-f-]{36})$/i)?.[1];
    } catch { /* No raw source is retained in evidence. */ }
    const identity = { assetId: assetId ?? "unrecognized", requestedLocale: localeLabel(requestedLocale), assetLocale: localeLabel(assetLocale) };
    try {
      const value = sample();
      const numeric = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
      return { ...identity, playing: value.playing === true, loaded: value.isLoaded === true,
        buffering: value.isBuffering === true, error: Boolean(value.error),
        currentTime: numeric(value.currentTime), duration: numeric(value.duration),
        muted: typeof value.muted === "boolean" ? value.muted : null, volume: numeric(value.volume),
        sessionSetup: ["not_requested", "initializing", "ready", "failed"].includes(value.sessionSetup ?? "") ? value.sessionSetup : "unknown",
        // Native play() activates the session; Expo exposes no session-active getter.
        nativeSessionActive: "not_observable" };
    } catch { return { ...identity, sampleUnavailable: true }; }
  });
  events.push({ at: new Date().toISOString(), playerCount: players.size, players: samples });
  if (events.length > 120) events = events.slice(-120);
}

/** Explicitly invoke from the connected development debugger; never auto-start. */
export function startAudioDiagnostics(milliseconds = 60_000): boolean {
  if (!development()) return false;
  stopAudioDiagnostics();
  events = [];
  deadline = Date.now() + Math.max(1_000, Math.min(Number.isFinite(milliseconds) ? milliseconds : 60_000, 60_000));
  capture();
  timer = setInterval(capture, 1_000);
  return true;
}

export function stopAudioDiagnostics(): void {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  deadline = 0;
}

export function readAudioDiagnostics(): readonly object[] {
  return development() ? [...events] : [];
}
