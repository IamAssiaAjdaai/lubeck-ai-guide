import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

import { getCitywalkSocialAuthConfiguration } from "@/lib/auth/socialProviders.server";
import type { ExternalAccountEraser } from "./externalAccountErasure";

const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";
const PAYLOAD_VERSION = "v1";
const PAYLOAD_AAD = Buffer.from("citywalk/account-erasure/apple/v1", "utf8");

type AppleTokenType = "refresh_token" | "access_token";
type AppleRevocationPayload = Readonly<{ token: string; tokenTypeHint: AppleTokenType }>;

type AppleProviderCredentials = Readonly<{ clientId: string; clientSecret: string }>;

export class AppleTokenRevocationError extends Error {
  constructor(readonly code: "NOT_CONFIGURED" | "INVALID_PAYLOAD" | "REQUEST_FAILED") {
    super(code);
    this.name = "AppleTokenRevocationError";
  }
}

function payloadKey(secret?: string) {
  const value = secret ?? process.env.BETTER_AUTH_SECRET;
  if (!value?.trim()) throw new AppleTokenRevocationError("NOT_CONFIGURED");
  return createHmac("sha256", value)
    .update("citywalk/account-erasure/apple/payload-key/v1")
    .digest();
}

export function sealAppleRevocationToken(
  payload: AppleRevocationPayload,
  secret?: string,
): string {
  if (!payload.token.trim()) throw new AppleTokenRevocationError("INVALID_PAYLOAD");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", payloadKey(secret), iv);
  cipher.setAAD(PAYLOAD_AAD);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PAYLOAD_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function openAppleRevocationToken(
  sealed: string,
  secret?: string,
): AppleRevocationPayload {
  try {
    const [version, ivValue, tagValue, encryptedValue, extra] = sealed.split(".");
    if (version !== PAYLOAD_VERSION || !ivValue || !tagValue || !encryptedValue || extra) {
      throw new Error("invalid");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      payloadKey(secret),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAAD(PAYLOAD_AAD);
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decoded = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8")) as Partial<AppleRevocationPayload>;
    if (
      typeof decoded.token !== "string" ||
      !decoded.token ||
      (decoded.tokenTypeHint !== "refresh_token" && decoded.tokenTypeHint !== "access_token")
    ) throw new Error("invalid");
    return { token: decoded.token, tokenTypeHint: decoded.tokenTypeHint };
  } catch (error) {
    if (error instanceof AppleTokenRevocationError) throw error;
    throw new AppleTokenRevocationError("INVALID_PAYLOAD");
  }
}

async function defaultAppleProvider(): Promise<AppleProviderCredentials> {
  const provider = getCitywalkSocialAuthConfiguration().socialProviders.apple;
  if (!provider) throw new AppleTokenRevocationError("NOT_CONFIGURED");
  const configured = await provider();
  return { clientId: configured.clientId, clientSecret: configured.clientSecret };
}

export function createAppleTokenRevocationEraser(input: Readonly<{
  fetchImpl?: typeof fetch;
  getProvider?: () => Promise<AppleProviderCredentials>;
  secret?: string;
}> = {}): ExternalAccountEraser {
  const fetchImpl = input.fetchImpl ?? fetch;
  const getProvider = input.getProvider ?? defaultAppleProvider;
  return {
    provider: "apple",
    async erase({ userId }) {
      const payload = openAppleRevocationToken(userId, input.secret);
      const provider = await getProvider();
      const body = new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        token: payload.token,
        token_type_hint: payload.tokenTypeHint,
      });
      let response: Response;
      try {
        response = await fetchImpl(APPLE_REVOKE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new AppleTokenRevocationError("REQUEST_FAILED");
      }
      if (response.status === 200) return "erased" as const;
      throw new AppleTokenRevocationError("REQUEST_FAILED");
    },
  };
}
