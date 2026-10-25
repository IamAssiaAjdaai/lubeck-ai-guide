// @vitest-environment node

import Groq from "groq-sdk";
import { describe, expect, it, vi } from "vitest";

// Exercise the real SDK HTTP transport: route-level mocks alone cannot detect
// hidden transport retries that would exceed reserved provider budget slots.
describe("Groq SDK provider attempt accounting", () => {
  const completionParams = {
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user" as const, content: "Synthetic offline test" }],
    max_completion_tokens: 16,
  };

  it.each([429, 500])("sends one HTTP attempt for a synthetic %i response with SDK retries disabled", async (status) => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ error: { message: "Synthetic provider failure", type: "api_error" } }),
      { status, headers: { "content-type": "application/json" } },
    ));
    const client = new Groq({
      apiKey: "test-api-key-only",
      maxRetries: 0,
      fetch: fetchMock,
    });

    await expect(client.chat.completions.create(completionParams))
      .rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a failed network request behind the shared budget", async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => {
      throw new TypeError("Synthetic network error");
    });
    const client = new Groq({
      apiKey: "test-api-key-only",
      maxRetries: 0,
      fetch: fetchMock,
    });

    await expect(client.chat.completions.create(completionParams)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
