import "server-only";

import type { Locale } from "@/lib/i18n";

export type GeneratedAudio = Readonly<{
  bytes: Uint8Array;
  mimeType: "audio/mpeg";
  filename: string;
  durationSeconds?: number;
}>;

export interface TtsProvider {
  readonly id: string;
  generate(input: Readonly<{
    text: string;
    locale: Locale;
    voiceId?: string;
  }>): Promise<GeneratedAudio>;
}

export function getConfiguredTtsProvider(): TtsProvider | undefined {
  return undefined;
}
