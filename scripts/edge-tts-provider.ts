import {
  Communicate,
  listVoices,
} from "edge-tts.js";

import { EDGE_AUDIO_MANIFEST_PROVIDER } from "../src/data/landmarkAudio";
import {
  selectDeterministicEdgeVoice,
  type TextToSpeechProvider,
} from "./landmark-audio-generation";

export type EdgeVoice = Readonly<{
  ShortName: string;
  Gender: "Female" | "Male";
  Locale: string;
  Status: "Deprecated" | "GA" | "Preview";
}>;

type EdgeSynthesisOptions = Readonly<{
  text: string;
  voice: string;
  rate: string;
  pitch: string;
}>;

export type EdgeTtsApi = Readonly<{
  getVoices: () =>
    Promise<readonly EdgeVoice[]>;
  generateSpeech: (
    options: EdgeSynthesisOptions,
  ) => Promise<Buffer>;
}>;

const defaultEdgeTtsApi: EdgeTtsApi = {
  getVoices: listVoices,
  async generateSpeech(options) {
    const communicator = new Communicate(
      options.text,
      options.voice,
      {
        rate: options.rate,
        pitch: options.pitch,
      },
    );
    const audioChunks: Buffer[] = [];

    for await (const chunk of communicator.stream()) {
      if (chunk.type === "audio") {
        audioChunks.push(
          Buffer.from(chunk.data),
        );
      }
    }

    return Buffer.concat(audioChunks);
  },
};

function formatSignedValue(
  value: number,
  suffix: "%" | "Hz",
): string {
  const rounded = Math.round(value);

  return `${rounded >= 0 ? "+" : ""}${rounded}${suffix}`;
}

export function createEdgeProvider(
  api: EdgeTtsApi = defaultEdgeTtsApi,
): TextToSpeechProvider {
  let voiceCache:
    | readonly EdgeVoice[]
    | undefined;

  return {
    manifestProvider:
      EDGE_AUDIO_MANIFEST_PROVIDER,
    selectVoice:
      selectDeterministicEdgeVoice,

    async listVoices() {
      voiceCache ??= await api.getVoices();

      return voiceCache.map((voice) => ({
        name: voice.ShortName,
        languageCodes: [voice.Locale],
        gender:
          voice.Gender.toLowerCase() as
            | "female"
            | "male",
        status: voice.Status,
      }));
    },

    async synthesizeSpeech(request) {
      return api.generateSpeech({
        text: request.text,
        voice: request.voiceName,
        rate: formatSignedValue(
          (request.speakingRate - 1) * 100,
          "%",
        ),
        pitch: formatSignedValue(
          request.pitch,
          "Hz",
        ),
      });
    },
  };
}
