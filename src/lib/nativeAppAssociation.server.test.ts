import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
} from "@/lib/nativeAppAssociation.server";

describe("native app association files", () => {
  it("builds the iOS association for only the two-segment CITYWALK handoff path", () => {
    expect(buildAppleAppSiteAssociation("TEAM123456")).toEqual({
      applinks: {
        apps: [],
        details: [
          {
            appID: "TEAM123456.com.citywalk.app",
            paths: ["/open/*/*"],
          },
        ],
      },
    });
  });

  it("builds Android Digital Asset Links from approved signing fingerprints", () => {
    expect(buildAndroidAssetLinks("AA:BB, CC:DD ")).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.citywalk.app",
          sha256_cert_fingerprints: ["AA:BB", "CC:DD"],
        },
      },
    ]);
  });

  it("fails closed when platform verification data is not configured", () => {
    expect(buildAppleAppSiteAssociation(undefined)).toBeUndefined();
    expect(buildAndroidAssetLinks(undefined)).toBeUndefined();
  });
});
