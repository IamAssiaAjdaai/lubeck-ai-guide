import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));

import { getAdminPasskeyRelyingParty } from "@/lib/auth/adminSecurity.server";

describe("admin passkey relying party", () => {
  it("uses localhost for local development", () => {
    expect(getAdminPasskeyRelyingParty("http://localhost:3000")).toEqual({
      rpID: "localhost",
      rpName: "CITYWALK Control Center",
      origin: "http://localhost:3000",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });
  });

  it("uses the exact deployment fallback for dynamic preview auth", () => {
    expect(getAdminPasskeyRelyingParty({
      allowedHosts: ["citywalk-preview.vercel.app"],
      protocol: "https",
      fallback: "https://citywalk-preview.vercel.app",
    })).toMatchObject({
      rpID: "citywalk-preview.vercel.app",
      origin: "https://citywalk-preview.vercel.app",
    });
  });
});