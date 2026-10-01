// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ google: vi.fn(), apple: vi.fn(), push: vi.fn(), session: vi.fn() }));
vi.mock("./providers.server", async original => ({ ...await original<typeof import("./providers.server")>(), verifyGoogle: mocks.google, verifyApple: mocks.apple, verifyGooglePushAuthorization: mocks.push }));
vi.mock("@/lib/auth/server", () => ({ getAuth: () => ({ api: { getSession: mocks.session } }) }));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow() { return {}; } async limit() { return { success: true }; } } }));
import { getDb, closeDb } from "@/db/client";
import { user, account, session } from "@/db/authSchema";
import { accountSavedWalks } from "@/db/travelerSchema";
import { commerceOrders, commerceEntitlements, commerceProviderEvents, commerceProducts, commerceProductGrants, commercePrices } from "@/db/commerceSchema";
import { accountBinding, type VerifiedNativePurchase } from "./config.server";
import { deliverNativePurchase } from "./ledger.server";
import { verifyAndDeliver } from "./service.server";
import { acknowledgeGoogle, normalizeApple, normalizeGoogle, transactionKey } from "./providers.server";
import { Environment, Type, InAppOwnershipType } from "@apple/app-store-server-library";
import { hasCityUnlock } from "../cityUnlock.server";
import { getCityPassAccessState } from "../cityPassAccess.server";
import { deleteTravelerAccount } from "@/lib/auth/lifecycle/deleteAccount.server";
import { POST as postPurchase } from "@/app/api/commerce/city-unlock/[citySlug]/route";
import { POST as googleNotification } from "@/app/api/commerce/native/notifications/google/route";
import { processVerifiedProviderEvent, createDatabaseWebhookDependencies } from "../webhook.server";
const owner=randomUUID(), other=randomUUID();
function googleConfiguration() {
  vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES", "1");
  vi.stubEnv("CITYWALK_GOOGLE_SERVICE_ACCOUNT", JSON.stringify({type:"service_account",client_email:"test@example.test",private_key:"synthetic-test-only"}));
}
const evidence = (provider: VerifiedNativePurchase["provider"] = "google_test", identity = randomUUID()): VerifiedNativePurchase => ({ provider, transactionKey:transactionKey(identity), binding:accountBinding(owner), state:"purchased" });
const orders = (p: VerifiedNativePurchase) => getDb().select().from(commerceOrders).where(and(eq(commerceOrders.provider,p.provider),eq(commerceOrders.providerPaymentIntentId,p.transactionKey)));
async function snapshot() {
  return Promise.all([commerceOrders,commerceEntitlements,commerceProviderEvents,commerceProductGrants,commerceProducts].map(async table => (await getDb().select().from(table)).sort((a,b)=>String(a.id).localeCompare(String(b.id)))));
}
const request = (body: unknown) => new Request("https://preview.example.test/api/commerce/city-unlock/lubeck", {method:"POST",headers:{"Content-Type":"application/json","X-Citywalk-Account":owner},body:JSON.stringify(body)});

describe.runIf(process.env.NATIVE_BILLING_DB_INTEGRATION === "1")("Phase 3B real DB boundaries with synthetic Store verification", () => {
  beforeAll(async () => {
    const target=new URL(process.env.DATABASE_URL!);
    if(target.hostname!=="127.0.0.1"||!/^\/cw_billing_\d+$/.test(target.pathname))throw new Error("New disposable loopback billing DB required");
    vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE","sandbox");
    vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET","synthetic-test-only-".repeat(3));vi.stubEnv("CITYWALK_NATIVE_SANDBOX_USERS",`${owner},${other}`);
    vi.stubEnv("UPSTASH_REDIS_REST_URL","https://redis.example.test");vi.stubEnv("UPSTASH_REDIS_REST_TOKEN","synthetic-test-only");
    await getDb().insert(user).values([owner,other].map(id=>({id,name:"Synthetic billing traveler",email:`${id}@example.test`})));
  });
  beforeEach(()=>{vi.clearAllMocks();googleConfiguration();mocks.session.mockResolvedValue({user:{id:owner}});mocks.push.mockResolvedValue(undefined);});
  afterAll(async()=>{await closeDb();vi.unstubAllEnvs();});

  it("preserves legacy 72h active/revoked/expired access and auth/Saved Walk fixtures after upgrade",async()=>{
    const active=await getCityPassAccessState({userId:"upgrade-active",citySlug:"lubeck"});
    expect(active).toMatchObject({active:true,status:"active"});expect(active.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    const [row]=await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.userId,"upgrade-active"));
    expect(row.expiresAt!.getTime()-row.grantedAt.getTime()).toBe(72*60*60*1000);
    expect(await getCityPassAccessState({userId:"upgrade-revoked",citySlug:"lubeck"})).toMatchObject({active:false,status:"revoked"});
    expect(await getCityPassAccessState({userId:"upgrade-expired",citySlug:"lubeck"})).toMatchObject({active:false,status:"expired"});
    expect(await getDb().select().from(account).where(eq(account.userId,"upgrade-active"))).toHaveLength(1);
    expect(await getDb().select().from(session).where(eq(session.userId,"upgrade-active"))).toHaveLength(1);
    expect(await getDb().select().from(accountSavedWalks).where(eq(accountSavedWalks.userId,"upgrade-active"))).toHaveLength(1);
  });

  it("disabled Google purchase/restore/service/ack/notification attempts leave all ownership tables identical",async()=>{
    const p=evidence();mocks.google.mockResolvedValue(p);const before=await snapshot();
    vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES","0");
    for(const proof of ["synthetic-purchase","synthetic-restore"]) {
      const result=await postPurchase(request({store:"google",proof}),{params:Promise.resolve({citySlug:"lubeck"})});
      expect(result.status).toBe(503);expect(await result.json()).toEqual({code:"GOOGLE_BILLING_DISABLED"});
      await expect(verifyAndDeliver(owner,"google",proof)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    }
    await expect(deliverNativePurchase(p,owner)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    await expect(acknowledgeGoogle("synthetic-proof")).rejects.toThrow("GOOGLE_BILLING_DISABLED");
    for(const kind of ["oneTimeProductNotification","voidedPurchaseNotification"]) {
      const data=Buffer.from(JSON.stringify({packageName:"com.citywalk.app",[kind]:{purchaseToken:"synthetic-proof"}})).toString("base64");
      const result=await googleNotification(request({message:{data}}));
      expect(result.status).toBe(503);expect(await result.json()).toEqual({code:"GOOGLE_BILLING_DISABLED"});
    }
    expect(mocks.google).not.toHaveBeenCalled();expect(mocks.push).not.toHaveBeenCalled();
    expect(await snapshot()).toEqual(before);expect(await orders(p)).toHaveLength(0);
  });

  it("enabled Google service delivers once and acknowledges only after committed DB ownership",async()=>{
    const p=normalizeGoogle({testPurchaseContext:{fopType:"TEST"},purchaseStateContext:{purchaseState:"PURCHASED"},productLineItem:[{productId:"com.citywalk.luebeck.premium",productOfferDetails:{quantity:1,refundableQuantity:1}}],obfuscatedExternalAccountId:accountBinding(owner)},randomUUID());
    const ack=vi.fn(async()=>{const rows=await orders(p);expect(rows).toHaveLength(1);expect(await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,rows[0].id))).toHaveLength(1);});
    const ports={verifyGoogle:vi.fn(async()=>p),verifyApple:vi.fn(),deliverNativePurchase,acknowledgeGoogle:ack,hasCityUnlock};
    await expect(verifyAndDeliver(owner,"google","synthetic-proof",ports)).resolves.toEqual({delivered:true,active:true});
    await expect(verifyAndDeliver(owner,"google","synthetic-proof",ports)).resolves.toEqual({delivered:true,active:true});
    expect(await orders(p)).toHaveLength(1);expect(ack).toHaveBeenCalledTimes(2);
    await expect(verifyAndDeliver(other,"google","synthetic-proof",ports)).rejects.toThrow("ACCOUNT_CONFLICT");
    await expect(deliverNativePurchase({...p,binding:accountBinding(other)},other)).rejects.toThrow("ACCOUNT_CONFLICT");
    expect(await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.userId,other))).toHaveLength(0);
  });

  it("database uniqueness rejects duplicate provider/transaction and event identities",async()=>{
    const p=evidence();await deliverNativePurchase(p,owner);const [existing]=await orders(p);
    await expect(getDb().insert(commerceOrders).values({...existing,id:randomUUID(),userId:other})).rejects.toMatchObject({cause:{code:"23505"}});
    await expect(getDb().insert(commerceProviderEvents).values({provider:p.provider,providerEventId:`verified:${p.transactionKey}`,eventType:"native_verified",outcome:"processed"})).rejects.toMatchObject({cause:{code:"23505"}});
    expect(await orders(p)).toHaveLength(1);
  });

  it("Apple/Google and distinct qualified environments have separate DB namespaces",async()=>{
    const identity=randomUUID(),apple=evidence("apple_sandbox",identity),google=evidence("google_test",identity);
    await deliverNativePurchase(apple,owner);await deliverNativePurchase(google,owner);
    expect(await orders(apple)).toHaveLength(1);expect(await orders(google)).toHaveLength(1);
    const [legacyPrice]=await getDb().select().from(commercePrices).limit(1);
    // Schema namespace probe only; no Production verifier, service, grant or connection.
    await getDb().insert(commerceOrders).values({id:randomUUID(),userId:owner,productId:legacyPrice.productId,priceId:legacyPrice.id,provider:"apple_production",providerPaymentIntentId:apple.transactionKey,status:"pending",currency:"eur",amountTotal:699});
    expect(await getDb().select().from(commerceOrders).where(eq(commerceOrders.providerPaymentIntentId,apple.transactionKey))).toHaveLength(3);
    const distinct=evidence();
    const grantsBefore=await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.userId,owner));
    await deliverNativePurchase(distinct,owner);
    expect(await orders(distinct)).toHaveLength(1);
    expect(await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.userId,owner))).toHaveLength(grantsBefore.length+1);
  });

  it("financial-evidence constraint rejects mixed nulls and unknown/Production native null financial rows",async()=>{
    const [price]=await getDb().select().from(commercePrices).limit(1);
    const base={userId:owner,productId:price.productId,status:"pending" as const};
    for(const provider of ["stripe","apple_production","unknown"]) {
      await expect(getDb().insert(commerceOrders).values({...base,id:randomUUID(),provider,priceId:null,currency:null,amountTotal:null})).rejects.toMatchObject({cause:{code:"23514"}});
    }
    for(const provider of ["apple_sandbox","google_test"]) {
      for(const fields of [{priceId:price.id,currency:null,amountTotal:null},{priceId:null,currency:"eur",amountTotal:null},{priceId:null,currency:null,amountTotal:699}]) {
        await expect(getDb().insert(commerceOrders).values({...base,...fields,id:randomUUID(),provider})).rejects.toMatchObject({cause:{code:"23514"}});
      }
    }
  });

  it("Apple service still verifies, delivers, replays, rejects conflicts and revokes with Google disabled",async()=>{
    vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES","0");
    const raw={environment:Environment.SANDBOX,bundleId:"com.citywalk.app",productId:"com.citywalk.luebeck.premium",type:Type.NON_CONSUMABLE,inAppOwnershipType:InAppOwnershipType.PURCHASED,quantity:1,originalTransactionId:randomUUID(),transactionId:randomUUID(),appAccountToken:accountBinding(owner)};
    const p=normalizeApple(raw),ports={verifyApple:vi.fn(async()=>p),verifyGoogle:vi.fn(),deliverNativePurchase,acknowledgeGoogle:vi.fn(),hasCityUnlock};
    for(let i=0;i<2;i++)await expect(verifyAndDeliver(owner,"apple","synthetic-verified-proof",ports)).resolves.toEqual({delivered:true,active:true});
    expect(await orders(p)).toHaveLength(1);
    await expect(verifyAndDeliver(other,"apple","synthetic-verified-proof",ports)).rejects.toThrow("ACCOUNT_CONFLICT");
    await deliverNativePurchase({...p,state:"revoked"});
    await expect(verifyAndDeliver(owner,"apple","older-proof",ports)).rejects.toThrow("PURCHASE_REVOKED");
    for(const change of [{productId:"wrong"},{bundleId:"wrong"},{appAccountToken:undefined}]) {
      const before=await snapshot();ports.verifyApple.mockImplementation(async()=>normalizeApple({...raw,...change}));
      await expect(verifyAndDeliver(owner,"apple","bad-proof",ports)).rejects.toThrow("INVALID_PURCHASE");expect(await snapshot()).toEqual(before);
    }
    expect(ports.verifyGoogle).not.toHaveBeenCalled();expect(ports.acknowledgeGoogle).not.toHaveBeenCalled();
  });

  it("enabled Google success notifications do not grant and revocation notifications cannot resurrect",async()=>{
    const p=evidence();mocks.google.mockResolvedValue(p);
    const data=Buffer.from(JSON.stringify({packageName:"com.citywalk.app",oneTimeProductNotification:{purchaseToken:"synthetic-proof"}})).toString("base64");
    const before=await snapshot();expect((await googleNotification(request({message:{data}}))).status).toBe(200);expect(await snapshot()).toEqual(before);
    await deliverNativePurchase(p,owner);mocks.google.mockResolvedValue({...p,state:"revoked"});
    for(let i=0;i<2;i++)expect((await googleNotification(request({message:{data}}))).status).toBe(200);
    expect(await deliverNativePurchase(p,owner)).toBe("revoked");
    expect((await orders(p))[0].status).toBe("refunded");
  });

  it("legacy Stripe refund revokes the 72h pass without modifying a preserved saved walk",async()=>{
    const before=await getDb().select().from(accountSavedWalks).where(eq(accountSavedWalks.userId,"upgrade-active"));
    const event={provider:"stripe",eventId:randomUUID(),eventType:"charge.refunded",normalized:{kind:"payment_refunded",paymentIntentId:"synthetic-upgrade-tx-active",amountRefunded:699,fullyRefunded:true}} as const;
    expect(await processVerifiedProviderEvent(event,createDatabaseWebhookDependencies({captureEntitlementGrant:async()=>undefined}))).toBe("processed");
    expect(await processVerifiedProviderEvent(event,createDatabaseWebhookDependencies())).toBe("duplicate");
    expect(await getCityPassAccessState({userId:"upgrade-active",citySlug:"lubeck"})).toMatchObject({status:"revoked",active:false});
    expect(await getDb().select().from(accountSavedWalks).where(eq(accountSavedWalks.userId,"upgrade-active"))).toEqual(before);
  });

  it.each(["apple_sandbox","google_test"] as const)("native %s ownership blocks account deletion without losing account/session/order/grant",async provider=>{
    const id=randomUUID(),sid=randomUUID();await getDb().insert(user).values({id,name:"Retention test",email:`${id}@example.test`});
    await getDb().insert(account).values({id:randomUUID(),accountId:id,providerId:"credential",issuer:"credential",userId:id,password:"synthetic-test-hash"});
    await getDb().insert(session).values({id:sid,userId:id,token:randomUUID(),expiresAt:new Date(Date.now()+3600000)});
    const p={...evidence(provider),binding:accountBinding(id)};await deliverNativePurchase(p,id);
    const before=await snapshot();await expect(deleteTravelerAccount({userId:id,sessionId:sid,password:"synthetic",verify:async()=>true})).rejects.toMatchObject({code:"RETENTION_REVIEW_REQUIRED",status:409});
    expect(await snapshot()).toEqual(before);expect(await getDb().select().from(user).where(eq(user.id,id))).toHaveLength(1);expect(await getDb().select().from(session).where(eq(session.id,sid))).toHaveLength(1);
  });
});
