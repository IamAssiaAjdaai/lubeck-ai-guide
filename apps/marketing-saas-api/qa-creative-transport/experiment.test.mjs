// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  experimentPreflight,
  runExperiment,
} from "../../../scripts/marketing-image-live-experiment.mjs";
const manifest = () => ({
  schemaVersion: 1,
  status: "AUTHORIZED",
  model: "gpt-image-2.5-flare-2026-09-08",
  maximumRequests: 1,
  maximumConcurrent: 1,
  maximumSpendMicroEur: 100000,
  quality: "low",
  size: "1024x1024",
  outputFormat: "png",
  ownerApproval: "SYNTHETIC_AUTHORED_TEST_NOT_AN_OWNER_APPROVAL",
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  providerBoundEvidence: {
    reviewed: true,
    sha256: "a".repeat(64),
    enforcedMaximumMicroEur: 100000,
    includesCurrencyFeesAndTaxes: true,
  },
  modelAccessEvidence: "AUTHORED_FIXTURE_NOT_ACCESS_EVIDENCE",
  projectId: "046c0404-0000-4000-8000-000000000002",
  generationId: "046c0404-0000-4000-8000-000000000003",
  expectedVersion: 1,
  reviewedBriefHash: "b".repeat(64),
  idempotencyKey: "046c0404-0000-4000-8000-000000000001",
});
const auth = {
  cookies: [
    {
      domain: "127.0.0.1",
      name: "synthetic-local-session",
      value: "synthetic-not-a-session",
      expires: -1,
    },
  ],
};
describe("one-request experiment execution plan (intercepted loopback API only)", () => {
  it.each([
    "owner",
    "price",
    "access",
    "expiry",
    "count",
    "budget",
    "snapshot",
  ])("blocks missing or invalid %s before any network", async (mode) => {
    const m = manifest();
    if (mode === "owner") m.ownerApproval = null;
    if (mode === "price") m.providerBoundEvidence = null;
    if (mode === "access") m.modelAccessEvidence = null;
    if (mode === "expiry")
      m.expiresAt = new Date(Date.now() - 1000).toISOString();
    if (mode === "count") m.maximumRequests = 2;
    if (mode === "budget") m.maximumSpendMicroEur = 100001;
    if (mode === "snapshot") m.reviewedBriefHash = null;
    expect(experimentPreflight(m).status).toBe("BLOCKED");
    const fetcher = vi.fn(() => {
      throw Error("NO_NETWORK");
    });
    await expect(runExperiment(m, auth, fetcher)).rejects.toThrow(
      "LIVE_EXPERIMENT_PREFLIGHT_BLOCKED",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("executes the frozen reviewed brief once, with no review/attach/export or retries", async () => {
    const m = manifest(),
      fetcher = vi.fn(async (url, init) => {
        expect(url.startsWith("http://127.0.0.1:3168/api/")).toBe(true);
        if (url.endsWith("creative-capabilities"))
          return Response.json({ enabled: true, provider: "openai" });
        if (url.endsWith("/brief"))
          return Response.json({ briefHash: m.reviewedBriefHash });
        if (url.endsWith("/jobs")) {
          const body = JSON.parse(init.body);
          expect(body).toMatchObject({
            postIndex: 0,
            ratio: "1:1",
            creative: {
              operation: "generate",
              referenceIds: [],
              outputFormat: "png",
            },
          });
          return Response.json({ id: "046c0404-0000-4000-8000-000000000004" });
        }
        if (url.endsWith("/process"))
          return Response.json({ state: "completed" });
        throw Error("UNEXPECTED_ENDPOINT");
      });
    expect(await runExperiment(m, auth, fetcher)).toMatchObject({
      state: "completed",
      billing: "UNRESOLVED_RESERVATION_RETAINED",
      automaticRetry: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("stale brief, disabled provider and API failure stop before generation", async () => {
    for (const mode of ["stale", "disabled", "failure"]) {
      const fetcher = vi.fn(async (url) =>
        mode === "failure"
          ? new Response("redacted", { status: 500 })
          : url.endsWith("creative-capabilities")
            ? Response.json({
                enabled: true,
                provider: mode === "disabled" ? "mock" : "openai",
              })
            : Response.json({ briefHash: "c".repeat(64) }),
      );
      await expect(runExperiment(manifest(), auth, fetcher)).rejects.toThrow();
      expect(fetcher.mock.calls.some(([u]) => u.endsWith("/process"))).toBe(
        false,
      );
    }
  });
});
