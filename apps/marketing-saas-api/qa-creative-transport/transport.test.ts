// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { initialState, type Brief } from "../src/creative/contract";
import { configuration, liveDeadlineValid } from "../src/config";
import {
  createOpenAIHttpProvider,
  imageTransportContract,
  type TransportGates,
} from "../src/creative/openai-http";
import {
  executeImageProvider,
  type ImageInput,
} from "../src/creative/image-adapter";
const input = (): ImageInput => ({
  brief: {
    schemaVersion: 1,
    synthetic: true,
    ratio: "1:1",
    objective: "leistung_erklaeren",
    facts: [{ id: "office", statement: "Wir reinigen Büros." }],
    editorialText: "PRIVATE_EDITORIAL_DO_NOT_FORWARD",
    constraints: [],
    kit: initialState().kit,
    binding: {
      generationId: randomUUID(),
      version: 1,
      postIndex: 0,
      postHash: "hash",
      contextRevision: 2,
      contextHash: "hash",
      kitRevision: 0,
      assets: [],
    },
  } satisfies Brief,
  references: [],
  signal: new AbortController().signal,
  idempotencyKey: randomUUID(),
  maximumChargeMicroEur: 100000,
});
const gates = (): TransportGates => ({
  enabled: () => true,
  killSwitch: () => false,
  spendApproved: () => true,
  priceBoundVerified: () => true,
  secret: vi.fn(() => "synthetic-intercept-only-never-a-key"),
});
async function image(
  width = 1024,
  height = 1024,
  format: "png" | "jpeg" = "png",
) {
  return sharp({
    create: { width, height, channels: 3, background: "#D0EB8D" },
  })
    [format]()
    .toBuffer();
}
const response = (raw: unknown) => Response.json(raw);
const wire = async () => ({
  data: [{ b64_json: (await image()).toString("base64") }],
  size: "1024x1024",
  output_format: "png",
  usage: { total_tokens: 1 },
});
const intercepted = (
  fn: (...args: Parameters<typeof fetch>) => Promise<Response>,
) => vi.fn(fn) as ReturnType<typeof vi.fn<typeof fetch>>;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Creative-04 intercepted real HTTP transport; authored pixels, no external requests", () => {
  it("expires server spend authorization and rejects absent, stale or overlong windows", () => {
    const start = Date.parse("2026-10-22T10:00:00Z");
    expect(liveDeadlineValid("", start, start)).toBe(false);
    expect(liveDeadlineValid("2026-10-22T09:59:00Z", start, start)).toBe(false);
    expect(liveDeadlineValid("2026-10-22T11:01:00Z", start, start)).toBe(false);
    expect(liveDeadlineValid("2026-10-22T10:30:00Z", start, start)).toBe(true);
    expect(
      liveDeadlineValid("2026-10-22T10:30:00Z", start, start + 1800000),
    ).toBe(false);
  });
  it("server configuration defaults all three live gates off without reading secrets", () => {
    const c = configuration({
      MARKETING_DATABASE_URL:
        "postgresql://synthetic@127.0.0.1:55499/marketing_qa",
      MARKETING_AUTH_SECRET: "synthetic-test-secret-at-least-32-characters",
    });
    expect(c.realImage).toEqual({
      enabled: false,
      authorizedUntil: "",
      spendApproved: false,
      priceBoundVerified: false,
    });
  });
  it.each([
    "enabled",
    "killSwitch",
    "spendApproved",
    "priceBoundVerified",
  ] as const)("%s blocks before credential or network access", async (gate) => {
    const g = gates();
    g[gate] = () => gate === "killSwitch";
    const fetcher = intercepted(async () => {
      throw Error("NETWORK_FORBIDDEN");
    });
    await expect(
      createOpenAIHttpProvider(g, fetcher).generate(input()),
    ).rejects.toMatchObject({ charge: "known_zero", automaticRetry: false });
    expect(g.secret).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("emits only a pinned, single, low-quality text-to-image request and keeps costs unknown on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw Error("EXTERNAL_NETWORK_FORBIDDEN");
      }),
    );
    const fixture = await wire(),
      fetcher = intercepted(async () => response(fixture)),
      p = createOpenAIHttpProvider(gates(), fetcher),
      i = input();
    const out = await executeImageProvider(p, i);
    expect(out).toMatchObject({
      mime: "image/png",
      mock: false,
      charge: "unknown",
    });
    expect((await sharp(out.bytes).metadata()).width).toBe(800);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(imageTransportContract.endpoint);
    expect(init?.redirect).toBe("error");
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      model: imageTransportContract.model,
      n: 1,
      quality: "low",
      size: "1024x1024",
      output_format: "png",
      background: "opaque",
      moderation: "auto",
      stream: false,
    });
    expect(JSON.stringify(body)).not.toContain(i.brief.editorialText);
    expect(JSON.stringify(out)).not.toContain("synthetic-intercept-only");
    expect(JSON.stringify(p)).not.toContain("synthetic-intercept-only");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 429, 500, 302])(
    "HTTP %s never retries or assumes zero billing",
    async (status) => {
      const fetcher = intercepted(
        async () => new Response("DO_NOT_LOG_VENDOR_BODY", { status }),
      );
      await expect(
        createOpenAIHttpProvider(gates(), fetcher).generate(input()),
      ).rejects.toMatchObject({ charge: "unknown", automaticRetry: false });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    {},
    { data: [] },
    { data: [{ url: "https://untrusted.invalid/a.png", b64_json: "AAAA" }] },
    { data: [{ b64_json: "bad base64" }] },
    { data: [{ b64_json: "AAAA" }], output_format: "webp" },
  ])(
    "rejects malformed or URL results without follow-up fetch",
    async (raw) => {
      const fetcher = intercepted(async () => response(raw));
      await expect(
        createOpenAIHttpProvider(gates(), fetcher).generate(input()),
      ).rejects.toMatchObject({ charge: "unknown" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    [64, 64, "png"],
    [1024, 1024, "jpeg"],
    [1024, 1000, "png"],
  ] as const)(
    "rejects actual %s×%s %s pixels before resizing",
    async (w, h, type) => {
      const fetcher = intercepted(async () =>
        response({
          data: [{ b64_json: (await image(w, h, type)).toString("base64") }],
        }),
      );
      await expect(
        createOpenAIHttpProvider(gates(), fetcher).generate(input()),
      ).rejects.toMatchObject({
        code: "IMAGE_RESULT_DIMENSIONS_OR_TYPE_INVALID",
        charge: "unknown",
      });
    },
  );
  it("rejects false size metadata", async () => {
    const raw = await wire();
    raw.size = "2048x2048";
    await expect(
      createOpenAIHttpProvider(
        gates(),
        intercepted(async () => response(raw)),
      ).generate(input()),
    ).rejects.toMatchObject({ charge: "unknown" });
  });
  it("bounds declared and chunked response sizes and rejects incorrect HTTP MIME", async () => {
    for (const r of [
      new Response("{}", { headers: { "content-type": "image/png" } }),
      new Response("{}", {
        headers: {
          "content-type": "application/json",
          "content-length": "99999999",
        },
      }),
      new Response(
        new Uint8Array(imageTransportContract.maximumResponseBytes + 1),
        { headers: { "content-type": "application/json" } },
      ),
    ]) {
      await expect(
        createOpenAIHttpProvider(
          gates(),
          intercepted(async () => r),
        ).generate(input()),
      ).rejects.toMatchObject({ charge: "unknown" });
    }
  });
  it("does not leak transport messages containing credentials", async () => {
    const g = gates();
    await expect(
      createOpenAIHttpProvider(
        g,
        intercepted(async () => {
          throw Error(g.secret());
        }),
      ).generate(input()),
    ).rejects.toMatchObject({
      message: "IMAGE_PROVIDER_RESPONSE_FAILED",
      charge: "unknown",
    });
  });
  it("timeout aborts a single dispatch; cancellation cannot recall vendor work or prove zero cost", async () => {
    const fetcher = intercepted(
      async (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener(
            "abort",
            () => reject(Error("abort")),
            { once: true },
          ),
        ),
    );
    await expect(
      executeImageProvider(
        createOpenAIHttpProvider(gates(), fetcher),
        input(),
        15,
      ),
    ).rejects.toMatchObject({ code: "IMAGE_TIMEOUT", charge: "unknown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("deadline also bounds a stalled response body", async () => {
    const fetcher = intercepted(
      async () =>
        new Response(new ReadableStream({ start() {} }), {
          headers: { "content-type": "application/json" },
        }),
    );
    await expect(
      executeImageProvider(
        createOpenAIHttpProvider(gates(), fetcher),
        input(),
        15,
      ),
    ).rejects.toMatchObject({ charge: "unknown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["edit", "webp", "reference", "prompt", "idempotency"])(
    "rejects unsupported or unbounded %s before dispatch",
    async (mode) => {
      const i = input();
      i.brief.creative = {
        operation: mode === "edit" ? "edit" : "generate",
        referenceIds: [],
        style: "abstrakt",
        outputFormat: mode === "webp" ? "webp" : "png",
      };
      if (mode === "reference") i.brief.creative.referenceIds = [randomUUID()];
      if (mode === "prompt")
        i.brief.facts = [{ id: "long", statement: "x".repeat(9000) }];
      if (mode === "idempotency") i.idempotencyKey = "header\r\ninjection";
      const fetcher = intercepted(async () => response(await wire()));
      await expect(
        createOpenAIHttpProvider(gates(), fetcher).generate(i),
      ).rejects.toMatchObject({ charge: "known_zero" });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("pre-dispatch abort and missing credentials are known zero, without calling HTTP", async () => {
    const i = input(),
      controller = new AbortController();
    controller.abort();
    i.signal = controller.signal;
    const fetcher = intercepted(async () => response(await wire()));
    await expect(
      createOpenAIHttpProvider(gates(), fetcher).generate(i),
    ).rejects.toMatchObject({ charge: "known_zero" });
    const g = gates();
    g.secret = () => undefined;
    await expect(
      createOpenAIHttpProvider(g, fetcher).generate(input()),
    ).rejects.toMatchObject({
      code: "IMAGE_SERVER_CREDENTIAL_REQUIRED",
      charge: "known_zero",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
