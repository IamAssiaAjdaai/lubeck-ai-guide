import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  packSelectionSchema,
  hooks,
  callsToAction,
  actions,
  type PackInput,
  type PackSelection,
} from "./pack.contract";
import { packMessages } from "./pack.prompt";
import { ApiError } from "./errors";
export const maxOutputTokens = 3000;
export type ProviderResult = {
  selection: unknown;
  inputTokens: number;
  outputTokens: number;
  model?: string;
};
export interface PackProvider {
  name: string;
  model: string;
  inputRate: number;
  outputRate: number;
  generate(input: PackInput): Promise<ProviderResult>;
}
export function createPackProvider(
  demo: boolean,
  env: Record<string, string | undefined> = process.env,
): PackProvider {
  if (demo)
    return {
      name: "demo",
      model: "deterministic-local-v1",
      inputRate: 0,
      outputRate: 0,
      async generate(input) {
        const selection: PackSelection = {
          schemaVersion: 1,
          days: actions.map((action, i) => ({
            day: i + 1,
            action,
            channel: input.channels[i % input.channels.length],
            time: "09:00",
            factIds: [input.facts[i % input.facts.length].id],
          })),
          posts: [0, 1, 2].map((i) => ({
            channel: input.channels[i % input.channels.length],
            hook: hooks[i],
            factIds: [input.facts[i % input.facts.length].id],
          })),
          hooks: [hooks[0], hooks[1], hooks[2]],
          cta: callsToAction[0],
        };
        return { selection, inputTokens: 0, outputTokens: 0 };
      },
    };
  const inputRate = Number(env.MARKETING_INPUT_EUR_PER_MILLION),
    outputRate = Number(env.MARKETING_OUTPUT_EUR_PER_MILLION);
  if (
    env.MARKETING_AI_ENABLED !== "true" ||
    !env.OPENAI_API_KEY ||
    !env.MARKETING_OPENAI_MODEL ||
    !Number.isFinite(inputRate) ||
    !Number.isFinite(outputRate) ||
    inputRate <= 0 ||
    outputRate <= 0
  )
    throw new ApiError(503, "PROVIDER_NOT_CONFIGURED");
  // No ambient base URL, tools, storage, SDK retries or auto-regeneration.
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: "https://api.openai.com/v1",
    timeout: 20000,
    maxRetries: 0,
  });
  return {
    name: "openai",
    model: env.MARKETING_OPENAI_MODEL,
    inputRate,
    outputRate,
    async generate(input) {
      const response = await client.responses.parse({
        model: env.MARKETING_OPENAI_MODEL!,
        input: packMessages(input),
        text: {
          format: zodTextFormat(packSelectionSchema, "marketing_pack_v1"),
        },
        max_output_tokens: maxOutputTokens,
        store: false,
      });
      return {
        selection: response.output_parsed,
        model: response.model,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      };
    },
  };
}
