import { setAudioModeAsync } from "expo-audio";

let pending: Promise<void> | undefined;
let setup: "not_requested" | "initializing" | "ready" | "failed" = "not_requested";

// Configure on explicit Play, before native play() activates the session.
// Concurrent players share initialization; failures remain retryable.
export function prepareNarrationAudio(): Promise<void> {
  if (pending) return pending;
  setup = "initializing";
  pending = setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: false,
  }).then(() => { setup = "ready"; }, () => {
    setup = "failed";
    throw new Error("Narration audio session unavailable");
  }).finally(() => { pending = undefined; });
  return pending;
}

export function narrationAudioSessionState() {
  return setup;
}
