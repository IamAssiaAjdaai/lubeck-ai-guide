// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { parse, options } = vi.hoisted(() => ({
  parse: vi.fn(),
  options: vi.fn(),
}));
vi.mock("openai", () => ({
  default: class {
    responses = { parse };
    constructor(config: unknown) {
      options(config);
    }
  },
}));
import { createPackProvider } from "../src/pack.provider";
import { scenarioInput, scenarios } from "./scenarios";
const env = {
  MARKETING_AI_ENABLED: "true",
  OPENAI_API_KEY: "offline-synthetic",
  MARKETING_OPENAI_MODEL: "offline-model",
  MARKETING_INPUT_EUR_PER_MILLION: "1",
  MARKETING_OUTPUT_EUR_PER_MILLION: "6",
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("real adapter with entirely replaced SDK transport", () => {
  it("fails closed with an ambient key unless explicitly enabled and rated", () => {
    expect(() =>
      createPackProvider(false, { OPENAI_API_KEY: "offline-synthetic" }),
    ).toThrow("PROVIDER_NOT_CONFIGURED");
    expect(options).not.toHaveBeenCalled();
  });
  it("keeps strict output, no tool/storage/retry behavior", async () => {
    const demo = await createPackProvider(true, {}).generate(
      scenarioInput(scenarios[0]),
    );
    parse.mockResolvedValue({
      output_parsed: demo.selection,
      model: "offline-resolved",
      usage: { input_tokens: 1600, output_tokens: 700 },
    });
    const result = await createPackProvider(false, env).generate(
      scenarioInput(scenarios[0]),
    );
    expect(options).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.openai.com/v1",
        timeout: 20000,
        maxRetries: 0,
      }),
    );
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        store: false,
        max_output_tokens: 3000,
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            strict: true,
          }),
        },
      }),
    );
    expect(parse.mock.calls[0][0].tools).toBeUndefined();
    expect(result.model).toBe("offline-resolved");
  });
  it.each([
    undefined,
    { output_tokens: 100 },
    { input_tokens: 0, output_tokens: 100 },
    { input_tokens: 100, output_tokens: -1 },
  ])("rejects absent/invalid usage without retry (%j)", async (usage) => {
    parse.mockResolvedValue({ output_parsed: null, usage });
    await expect(
      createPackProvider(false, env).generate(scenarioInput(scenarios[0])),
    ).rejects.toThrow("MISSING_PROVIDER_USAGE");
    expect(parse).toHaveBeenCalledTimes(1);
  });
  it("rejects partial output usage rather than silently estimating zero output cost", async () => {
    const demo = await createPackProvider(true, {}).generate(
      scenarioInput(scenarios[0]),
    );
    parse.mockResolvedValue({
      output_parsed: demo.selection,
      usage: { input_tokens: 100 },
    });
    await expect(
      createPackProvider(false, env).generate(scenarioInput(scenarios[0])),
    ).rejects.toThrow("MISSING_PROVIDER_USAGE");
    expect(parse).toHaveBeenCalledTimes(1);
  });
  it("propagates a timeout exactly once; no network is in this transport", async () => {
    parse.mockRejectedValue(new Error("synthetic timeout"));
    await expect(
      createPackProvider(false, env).generate(scenarioInput(scenarios[0])),
    ).rejects.toThrow("synthetic timeout");
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
