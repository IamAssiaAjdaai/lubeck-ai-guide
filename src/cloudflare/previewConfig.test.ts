import { describe, expect, it } from "vitest";
import {
  CITYWALK_PRODUCTION_HYPERDRIVE_ID,
  requireIsolatedPreviewHyperdriveId,
} from "./previewConfig";

describe("Cloudflare isolated preview bindings", () => {
  it("requires an explicit preview Hyperdrive ID", () => {
    expect(() => requireIsolatedPreviewHyperdriveId(undefined)).toThrow(/required/);
    expect(() => requireIsolatedPreviewHyperdriveId("")).toThrow(/required/);
    expect(() => requireIsolatedPreviewHyperdriveId("not-an-id")).toThrow(/required/);
  });

  it("always refuses the known production Hyperdrive", () => {
    expect(() =>
      requireIsolatedPreviewHyperdriveId(CITYWALK_PRODUCTION_HYPERDRIVE_ID),
    ).toThrow(/Refusing production/);
    expect(() =>
      requireIsolatedPreviewHyperdriveId(CITYWALK_PRODUCTION_HYPERDRIVE_ID.toUpperCase()),
    ).toThrow(/Refusing production/);
  });

  it("allows a distinct explicitly supplied ID for a separately provisioned preview database", () => {
    const previewId = "11111111111111111111111111111111";
    expect(requireIsolatedPreviewHyperdriveId(previewId)).toBe(previewId);
  });
});
