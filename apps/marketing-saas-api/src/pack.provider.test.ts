// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
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
import { createPackProvider } from "./pack.provider";
import { assemblePack } from "./pack.contract";
const input = {
  businessName: "Glanz",
  goal: "mehr_anfragen" as const,
  audience: "Büroleitungen",
  channels: ["linkedin" as const],
  facts: [{ id: "office", statement: "Wir reinigen Büros.", sourceUrls: [] }],
};
describe("pack provider and constrained factual output", () => {
  it("never enables a paid adapter from an API key alone", () => {
    expect(() =>
      createPackProvider(false, { OPENAI_API_KEY: "synthetic-key" }),
    ).toThrow("PROVIDER_NOT_CONFIGURED");
    expect(options).not.toHaveBeenCalled();
  });
  it("uses strict Responses output, no storage/tools/retries and bounded tokens", async () => {
    const demo = await createPackProvider(true).generate(input);
    parse.mockResolvedValue({
      output_parsed: demo.selection,
      model:"resolved-test-model",
      usage: { input_tokens: 123, output_tokens: 456 },
    });
    const provider = createPackProvider(false, {
      MARKETING_AI_ENABLED: "true",
      OPENAI_API_KEY: "synthetic-key",
      MARKETING_OPENAI_MODEL: "operator-selected-test-model",
      MARKETING_INPUT_EUR_PER_MILLION: "1",
      MARKETING_OUTPUT_EUR_PER_MILLION: "2",
    });
    const result = await provider.generate(input);
    expect(options).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 20000,
        maxRetries: 0,
        baseURL: "https://api.openai.com/v1",
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
    expect(result.model).toBe("resolved-test-model");
    expect(result.inputTokens).toBe(123);
    expect(result.outputTokens).toBe(456);
  });
  it("rejects invented facts, extra free prose, mismatched channels and duplicate days", async () => {
    const { selection } = await createPackProvider(true).generate(input);
    const base = selection as {
      posts: { factIds: string[]; channel: string }[];
      days: { day: number }[];
    };
    expect(() =>
      assemblePack({ ...base, extraClaim: "Guaranteed profit" }, input),
    ).toThrow();
    expect(() =>
      assemblePack(
        {
          ...base,
          posts: base.posts.map((p) => ({ ...p, factIds: ["unapproved"] })),
        },
        input,
      ),
    ).toThrow();
    expect(() =>
      assemblePack(
        {
          ...base,
          posts: base.posts.map((p) => ({ ...p, channel: "facebook" })),
        },
        input,
      ),
    ).toThrow();
    expect(() =>
      assemblePack(
        { ...base, days: base.days.map((d) => ({ ...d, day: 1 })) },
        input,
      ),
    ).toThrow();
  });
});
