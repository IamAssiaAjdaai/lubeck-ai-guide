// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { closeDb, getDb } from "@/db/client";
import { account, session, user } from "@/db/authSchema";
import { accountSavedWalks, travelerGuestLinks, travelerProfiles } from "@/db/travelerSchema";
import {
  commerceCustomers,
  commerceEntitlements,
  commerceOrders,
  commercePrices,
  commerceProducts,
  commerceSubscriptions,
} from "@/db/commerceSchema";
import { buildAccountDataExport, AccountDataExportError } from "./dataExport.server";

describe.runIf(process.env.LIFECYCLE_DB_INTEGRATION === "1")("account data export", () => {
  beforeAll(() => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== "127.0.0.1" || !/^\/cw_lifecycle_\d+$/.test(target.pathname)) {
      throw new Error("Disposable loopback database required");
    }
  });

  afterAll(async () => { await closeDb(); });

  it("exports only the requested account while excluding authentication secrets", async () => {
    const ownerId = randomUUID();
    const otherId = randomUUID();
    const ownerEmail = `owner-${randomUUID()}@example.test`;
    const otherEmail = `other-${randomUUID()}@example.test`;
    await getDb().insert(user).values([
      { id: ownerId, name: "Export owner", email: ownerEmail, emailVerified: true },
      { id: otherId, name: "Other traveler", email: otherEmail, emailVerified: true },
    ]);

    const secrets = {
      password: "secret-password-hash",
      access: "secret-access-token",
      refresh: "secret-refresh-token",
      id: "secret-id-token",
      session: "secret-session-token",
    };
    await getDb().insert(account).values([
      {
        id: randomUUID(),
        accountId: "provider-account-owner",
        providerId: "google",
        userId: ownerId,
        accessToken: secrets.access,
        refreshToken: secrets.refresh,
        idToken: secrets.id,
        scope: "openid email profile",
      },
      {
        id: randomUUID(),
        accountId: ownerId,
        providerId: "credential",
        userId: ownerId,
        password: secrets.password,
      },
      {
        id: randomUUID(),
        accountId: "provider-account-other",
        providerId: "google",
        userId: otherId,
        accessToken: "other-secret",
      },
    ]);
    await getDb().insert(session).values([
      {
        id: randomUUID(),
        token: secrets.session,
        userId: ownerId,
        expiresAt: new Date(Date.now() + 86_400_000),
        ipAddress: "192.0.2.10",
        userAgent: "CITYWALK integration test",
      },
      {
        id: randomUUID(),
        token: "other-session-secret",
        userId: otherId,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    ]);
    await getDb().insert(travelerProfiles).values({ userId: ownerId, preferredLocale: "de" });
    await getDb().insert(travelerGuestLinks).values({
      userId: ownerId,
      visitorId: "visitor-export-owner",
      sessionId: "guest-session-export-owner",
    });
    await getDb().insert(accountSavedWalks).values({
      userId: ownerId,
      citySlug: "lubeck",
      fingerprint: randomUUID(),
      route: {
        citySlug: "lubeck",
        stopSlugs: ["holstentor"],
        settings: {
          minutes: 120,
          interests: ["history"],
          walking: "balanced",
          start: { lat: 53.8, lng: 10.6 },
        },
      },
    });

    const [product] = await getDb().insert(commerceProducts).values({
      slug: `export-product-${randomUUID()}`,
      name: "Export test product",
      kind: "feature_bundle",
      active: true,
    }).returning({ id: commerceProducts.id });
    const [price] = await getDb().insert(commercePrices).values({
      productId: product.id,
      provider: "stripe",
      providerPriceId: `price-${randomUUID()}`,
      currency: "eur",
      unitAmount: 499,
      active: true,
    }).returning({ id: commercePrices.id });
    await getDb().insert(commerceCustomers).values({
      userId: ownerId,
      provider: "stripe",
      providerCustomerId: "cus_export_owner",
    });
    const orderId = `order-${randomUUID()}`;
    await getDb().insert(commerceOrders).values({
      id: orderId,
      userId: ownerId,
      productId: product.id,
      priceId: price.id,
      provider: "stripe",
      providerCheckoutSessionId: "cs_export_owner",
      providerPaymentIntentId: "pi_export_owner",
      status: "paid",
      currency: "eur",
      amountTotal: 499,
      paidAt: new Date(),
    });
    const subscriptionId = `subscription-${randomUUID()}`;
    await getDb().insert(commerceSubscriptions).values({
      id: subscriptionId,
      userId: ownerId,
      productId: product.id,
      provider: "revenuecat",
      providerSubscriptionId: "sub_export_owner",
      providerProductId: "com.citywalk.premium.monthly",
      store: "app_store",
      environment: "sandbox",
      originalTransactionId: "original_export_owner",
      status: "active",
      willRenew: true,
      providerEventAt: new Date(),
    });
    await getDb().insert(commerceEntitlements).values({
      userId: ownerId,
      productId: product.id,
      sourceOrderId: orderId,
      scopeType: "feature",
      scopeKey: "premium",
      status: "active",
    });

    const exported = await buildAccountDataExport(ownerId);
    expect(exported.account).toMatchObject({ id: ownerId, email: ownerEmail });
    expect(exported.connectedAuthProviders).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: "google", providerAccountId: "provider-account-owner" }),
      expect.objectContaining({ provider: "credential" }),
    ]));
    expect(exported.sessions).toEqual([
      expect.objectContaining({ ipAddress: "192.0.2.10", userAgent: "CITYWALK integration test" }),
    ]);
    expect(exported.travelerProfile).toMatchObject({ preferredLocale: "de" });
    expect(exported.guestLinks).toEqual([expect.objectContaining({ visitorId: "visitor-export-owner" })]);
    expect(exported.savedWalks).toHaveLength(1);
    expect(exported.commerce.customers).toEqual([
      expect.objectContaining({ provider: "stripe", providerCustomerId: "cus_export_owner" }),
    ]);
    expect(exported.commerce.orders).toEqual([
      expect.objectContaining({ id: orderId, providerCheckoutSessionId: "cs_export_owner", amountTotal: 499 }),
    ]);
    expect(exported.commerce.subscriptions).toEqual([
      expect.objectContaining({ id: subscriptionId, providerSubscriptionId: "sub_export_owner", originalTransactionId: "original_export_owner" }),
    ]);
    expect(exported.commerce.entitlements).toEqual([
      expect.objectContaining({ sourceOrderId: orderId, scopeKey: "premium" }),
    ]);

    const serialized = JSON.stringify(exported);
    for (const secret of Object.values(secrets)) expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(otherId);
    expect(serialized).not.toContain(otherEmail);
    expect(serialized).not.toContain("other-secret");
    expect(serialized).not.toContain("other-session-secret");
  });

  it("rejects an unknown account id", async () => {
    await expect(buildAccountDataExport(randomUUID())).rejects.toMatchObject<AccountDataExportError>({ status: 404 });
  });
});
