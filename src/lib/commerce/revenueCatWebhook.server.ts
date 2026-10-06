import { createHmac, timingSafeEqual } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { user } from "@/db/authSchema";
import { getDb } from "@/db/client";
import {
  commerceEntitlements,
  commerceProductGrants,
  commerceProducts,
  commerceProviderEvents,
  commerceSubscriptions,
} from "@/db/commerceSchema";

const PROVIDER = "revenuecat";
const SIGNATURE_TOLERANCE_SECONDS = 300;
const ANONYMOUS_PREFIX = "$RCAnonymousID:";

const PRODUCT_SLUG_BY_REVENUECAT_PRODUCT = Object.freeze({
  "com.citywalk.premium.monthly": "citywalk-premium",
  "com.citywalk.premium.annual": "citywalk-premium",
  "com.citywalk.lubeck.pass72h": "lubeck-digital-guide-pass-72h",
});

type RevenueCatProductId = keyof typeof PRODUCT_SLUG_BY_REVENUECAT_PRODUCT;

type RevenueCatEvent = Readonly<{
  id: string;
  type: string;
  event_timestamp_ms: number;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  aliases?: readonly string[] | null;
  product_id?: string | null;
  new_product_id?: string | null;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  transaction_id?: string | null;
  original_transaction_id?: string | null;
  store?: string | null;
  environment?: string | null;
  cancel_reason?: string | null;
  expiration_reason?: string | null;
}>;

export type RevenueCatWebhookEnvelope = Readonly<{
  api_version: string;
  event: RevenueCatEvent;
}>;

export type RevenueCatWebhookResult = "processed" | "ignored" | "duplicate";

export class RevenueCatWebhookError extends Error {
  constructor(
    readonly code:
      | "NOT_CONFIGURED"
      | "UNAUTHORIZED"
      | "INVALID_SIGNATURE"
      | "STALE_SIGNATURE"
      | "INVALID_PAYLOAD",
  ) {
    super(code);
    this.name = "RevenueCatWebhookError";
  }
}

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function parseSignatureHeader(value: string): { timestamp: string; signature: string } {
  const parts = Object.fromEntries(
    value.split(",").map((part) => {
      const index = part.indexOf("=");
      return index > 0
        ? [part.slice(0, index).trim(), part.slice(index + 1).trim()]
        : [part.trim(), ""];
    }),
  );
  if (!parts.t || !parts.v1 || !/^\d+$/.test(parts.t) || !/^[a-f0-9]{64}$/i.test(parts.v1)) {
    throw new RevenueCatWebhookError("INVALID_SIGNATURE");
  }
  return { timestamp: parts.t, signature: parts.v1.toLowerCase() };
}

export function verifyRevenueCatWebhook(input: Readonly<{
  headers: Headers;
  rawBody: string;
  nowMs?: number;
  authorizationSecret?: string;
  signingSecret?: string;
}>): RevenueCatWebhookEnvelope {
  const authorizationSecret = input.authorizationSecret
    ?? process.env.COMMERCE_REVENUECAT_WEBHOOK_AUTHORIZATION;
  const signingSecret = input.signingSecret
    ?? process.env.COMMERCE_REVENUECAT_WEBHOOK_SIGNING_SECRET;
  if (!authorizationSecret || !signingSecret) {
    throw new RevenueCatWebhookError("NOT_CONFIGURED");
  }

  const authorization = input.headers.get("authorization");
  if (!authorization || !secureEqual(authorization, authorizationSecret)) {
    throw new RevenueCatWebhookError("UNAUTHORIZED");
  }

  const signatureHeader = input.headers.get("x-revenuecat-webhook-signature");
  if (!signatureHeader) throw new RevenueCatWebhookError("INVALID_SIGNATURE");
  const parsedSignature = parseSignatureHeader(signatureHeader);
  const signedPayload = `${parsedSignature.timestamp}.${input.rawBody}`;
  const computed = createHmac("sha256", signingSecret)
    .update(signedPayload)
    .digest("hex");
  if (!secureEqual(computed, parsedSignature.signature)) {
    throw new RevenueCatWebhookError("INVALID_SIGNATURE");
  }

  const signedAtSeconds = Number(parsedSignature.timestamp);
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - signedAtSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new RevenueCatWebhookError("STALE_SIGNATURE");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    throw new RevenueCatWebhookError("INVALID_PAYLOAD");
  }
  if (!isRevenueCatEnvelope(payload)) {
    throw new RevenueCatWebhookError("INVALID_PAYLOAD");
  }
  return payload;
}

function isRevenueCatEnvelope(value: unknown): value is RevenueCatWebhookEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as { api_version?: unknown; event?: unknown };
  if (typeof envelope.api_version !== "string" || !envelope.event || typeof envelope.event !== "object") {
    return false;
  }
  const event = envelope.event as Record<string, unknown>;
  return typeof event.id === "string"
    && typeof event.type === "string"
    && typeof event.event_timestamp_ms === "number"
    && Number.isFinite(event.event_timestamp_ms);
}

function knownProduct(value: string | null | undefined): value is RevenueCatProductId {
  return Boolean(value && value in PRODUCT_SLUG_BY_REVENUECAT_PRODUCT);
}

function citywalkUserId(event: RevenueCatEvent): string | undefined {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return candidates.find((candidate): candidate is string =>
    Boolean(candidate && !candidate.startsWith(ANONYMOUS_PREFIX)),
  );
}

function toDate(value: number | null | undefined): Date | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizedStore(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || "unknown";
}

function normalizedEnvironment(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || "unknown";
}

type ReconciledStatus =
  | "active"
  | "billing_issue"
  | "paused"
  | "canceled"
  | "expired"
  | "revoked";

type EventPolicy = Readonly<{
  status: ReconciledStatus;
  willRenew: boolean;
  revokeImmediately: boolean;
}>;

export function revenueCatEventPolicy(event: RevenueCatEvent): EventPolicy | undefined {
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
    case "REFUND_REVERSED":
      return { status: "active", willRenew: true, revokeImmediately: false };
    case "NON_RENEWING_PURCHASE":
      return { status: "active", willRenew: false, revokeImmediately: false };
    case "BILLING_ISSUE":
      return { status: "billing_issue", willRenew: false, revokeImmediately: false };
    case "SUBSCRIPTION_PAUSED":
      return { status: "paused", willRenew: false, revokeImmediately: false };
    case "CANCELLATION":
      if (event.cancel_reason === "CUSTOMER_SUPPORT") {
        return { status: "revoked", willRenew: false, revokeImmediately: true };
      }
      return { status: "canceled", willRenew: false, revokeImmediately: false };
    case "EXPIRATION":
      return { status: "expired", willRenew: false, revokeImmediately: true };
    default:
      return undefined;
  }
}

function subscriptionExpiry(
  event: RevenueCatEvent,
  durationDays: number | null,
): Date | undefined {
  const providerExpiry = toDate(event.expiration_at_ms);
  if (providerExpiry) return providerExpiry;
  if (event.type !== "NON_RENEWING_PURCHASE" || durationDays == null) return undefined;
  const purchasedAt = toDate(event.purchased_at_ms);
  if (!purchasedAt) return undefined;
  return new Date(purchasedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

export async function processRevenueCatWebhookEvent(
  envelope: RevenueCatWebhookEnvelope,
): Promise<RevenueCatWebhookResult> {
  const event = envelope.event;
  const eventAt = toDate(event.event_timestamp_ms);
  if (!eventAt) throw new RevenueCatWebhookError("INVALID_PAYLOAD");

  const db = getDb();
  return db.transaction(async (tx) => {
    const [insertedEvent] = await tx
      .insert(commerceProviderEvents)
      .values({
        provider: PROVIDER,
        providerEventId: event.id,
        eventType: event.type,
        outcome: "ignored",
      })
      .onConflictDoNothing()
      .returning({ id: commerceProviderEvents.id });
    if (!insertedEvent) return "duplicate" as const;

    const policy = revenueCatEventPolicy(event);
    const providerProductId = event.type === "PRODUCT_CHANGE"
      ? event.new_product_id ?? event.product_id
      : event.product_id;
    if (!policy || !knownProduct(providerProductId)) return "ignored" as const;

    const userId = citywalkUserId(event);
    const providerSubscriptionId = event.original_transaction_id?.trim();
    if (!userId || !providerSubscriptionId) return "ignored" as const;

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${PROVIDER}:${providerSubscriptionId}`}, 0))`,
    );

    const [knownUser] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!knownUser) return "ignored" as const;

    const productSlug = PRODUCT_SLUG_BY_REVENUECAT_PRODUCT[providerProductId];
    const [product] = await tx
      .select({ id: commerceProducts.id })
      .from(commerceProducts)
      .where(eq(commerceProducts.slug, productSlug))
      .limit(1);
    if (!product) return "ignored" as const;

    const store = normalizedStore(event.store);
    const [existing] = await tx
      .select({
        id: commerceSubscriptions.id,
        userId: commerceSubscriptions.userId,
        providerEventAt: commerceSubscriptions.providerEventAt,
      })
      .from(commerceSubscriptions)
      .where(
        and(
          eq(commerceSubscriptions.provider, PROVIDER),
          eq(commerceSubscriptions.providerSubscriptionId, providerSubscriptionId),
        ),
      )
      .limit(1);

    if (existing?.providerEventAt && existing.providerEventAt.getTime() >= eventAt.getTime()) {
      return "ignored" as const;
    }
    if (existing && existing.userId !== userId) {
      return "ignored" as const;
    }

    const grants = await tx
      .select({
        scopeType: commerceProductGrants.scopeType,
        scopeKey: commerceProductGrants.scopeKey,
        durationDays: commerceProductGrants.durationDays,
      })
      .from(commerceProductGrants)
      .where(eq(commerceProductGrants.productId, product.id));
    if (grants.length === 0) return "ignored" as const;

    const expiryCandidates = grants
      .map((grant) => subscriptionExpiry(event, grant.durationDays))
      .filter((value): value is Date => Boolean(value));
    const currentPeriodEndsAt = toDate(event.expiration_at_ms)
      ?? expiryCandidates.reduce<Date | undefined>(
        (latest, value) => !latest || value > latest ? value : latest,
        undefined,
      );

    const isPremiumProduct = providerProductId === "com.citywalk.premium.monthly"
      || providerProductId === "com.citywalk.premium.annual";
    if (!policy.revokeImmediately && isPremiumProduct && !currentPeriodEndsAt) {
      return "ignored" as const;
    }

    const subscriptionId = existing?.id
      ?? `rc:${store}:${providerSubscriptionId}`;
    const values = {
      userId,
      productId: product.id,
      provider: PROVIDER,
      providerSubscriptionId,
      providerProductId,
      store,
      environment: normalizedEnvironment(event.environment),
      originalTransactionId: event.original_transaction_id ?? null,
      status: policy.status,
      currentPeriodEndsAt: currentPeriodEndsAt ?? null,
      willRenew: policy.willRenew,
      providerEventAt: eventAt,
      updatedAt: new Date(),
    } as const;

    if (existing) {
      await tx
        .update(commerceSubscriptions)
        .set(values)
        .where(eq(commerceSubscriptions.id, existing.id));
    } else {
      await tx.insert(commerceSubscriptions).values({ id: subscriptionId, ...values });
    }

    if (policy.revokeImmediately) {
      await tx
        .update(commerceEntitlements)
        .set({
          status: policy.status === "expired" ? "expired" : "revoked",
          expiresAt: currentPeriodEndsAt ?? eventAt,
          revokedAt: policy.status === "revoked" ? eventAt : null,
          revocationReason: policy.status === "revoked"
            ? `revenuecat:${event.cancel_reason ?? "refund"}`
            : null,
          updatedAt: new Date(),
        })
        .where(eq(commerceEntitlements.sourceSubscriptionId, subscriptionId));
    } else {
      for (const grant of grants) {
        const expiresAt = subscriptionExpiry(event, grant.durationDays) ?? currentPeriodEndsAt;
        if (!expiresAt) continue;
        const [existingEntitlement] = await tx
          .select({ id: commerceEntitlements.id })
          .from(commerceEntitlements)
          .where(
            and(
              eq(commerceEntitlements.userId, userId),
              eq(commerceEntitlements.sourceSubscriptionId, subscriptionId),
              eq(commerceEntitlements.scopeType, grant.scopeType),
              eq(commerceEntitlements.scopeKey, grant.scopeKey),
            ),
          )
          .limit(1);
        if (existingEntitlement) {
          await tx
            .update(commerceEntitlements)
            .set({
              productId: product.id,
              status: "active",
              expiresAt,
              revokedAt: null,
              revocationReason: null,
              updatedAt: new Date(),
            })
            .where(eq(commerceEntitlements.id, existingEntitlement.id));
        } else {
          await tx.insert(commerceEntitlements).values({
            userId,
            productId: product.id,
            sourceSubscriptionId: subscriptionId,
            scopeType: grant.scopeType,
            scopeKey: grant.scopeKey,
            status: "active",
            grantedAt: eventAt,
            expiresAt,
          });
        }
      }
    }

    await tx
      .update(commerceProviderEvents)
      .set({ outcome: "processed" })
      .where(eq(commerceProviderEvents.id, insertedEvent.id));
    return "processed" as const;
  });
}

export async function handleRevenueCatWebhookRequest(input: Readonly<{
  headers: Headers;
  rawBody: string;
}>): Promise<RevenueCatWebhookResult> {
  const event = verifyRevenueCatWebhook(input);
  return processRevenueCatWebhookEvent(event);
}

export { PRODUCT_SLUG_BY_REVENUECAT_PRODUCT };
