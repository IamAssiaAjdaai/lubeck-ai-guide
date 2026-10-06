// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AppleTokenRevocationError,
  createAppleTokenRevocationEraser,
  openAppleRevocationToken,
  sealAppleRevocationToken,
} from "./appleTokenRevocation.server";

const secret = "synthetic-auth-secret-at-least-32-characters";

describe("Apple account deletion token revocation", () => {
  it("round-trips an encrypted token without embedding the raw token", () => {
    const raw = "apple-refresh-token-sensitive";
    const sealed = sealAppleRevocationToken({ token: raw, tokenTypeHint: "refresh_token" }, secret);
    expect(sealed).not.toContain(raw);
    expect(openAppleRevocationToken(sealed, secret)).toEqual({
      token: raw,
      tokenTypeHint: "refresh_token",
    });
  });

  it("rejects tampered encrypted payloads", () => {
    const sealed = sealAppleRevocationToken({ token: "token", tokenTypeHint: "access_token" }, secret);
    const tampered = `${sealed.slice(0, -1)}${sealed.endsWith("A") ? "B" : "A"}`;
    expect(() => openAppleRevocationToken(tampered, secret)).toThrowError(
      expect.objectContaining({ code: "INVALID_PAYLOAD" }),
    );
  });

  it("posts the decrypted refresh token to Apple's revoke endpoint and treats 200 as terminal success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const eraser = createAppleTokenRevocationEraser({
      fetchImpl,
      secret,
      getProvider: async () => ({ clientId: "com.citywalk.service", clientSecret: "signed-client-secret" }),
    });
    const sealed = sealAppleRevocationToken({ token: "refresh-value", tokenTypeHint: "refresh_token" }, secret);

    await expect(eraser.erase({ userId: sealed })).resolves.toBe("erased");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://appleid.apple.com/auth/revoke");
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("client_id")).toBe("com.citywalk.service");
    expect(body.get("client_secret")).toBe("signed-client-secret");
    expect(body.get("token")).toBe("refresh-value");
    expect(body.get("token_type_hint")).toBe("refresh_token");
  });

  it("fails safely on Apple errors without exposing the provider response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("sensitive provider error", { status: 400 }));
    const eraser = createAppleTokenRevocationEraser({
      fetchImpl,
      secret,
      getProvider: async () => ({ clientId: "com.citywalk.service", clientSecret: "signed-client-secret" }),
    });
    const sealed = sealAppleRevocationToken({ token: "secret-token", tokenTypeHint: "access_token" }, secret);

    await expect(eraser.erase({ userId: sealed })).rejects.toEqual(
      expect.objectContaining<Partial<AppleTokenRevocationError>>({ code: "REQUEST_FAILED" }),
    );
  });
});
