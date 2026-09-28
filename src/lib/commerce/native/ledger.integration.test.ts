// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
vi.mock("server-only",()=>({}));
import { getDb, closeDb } from "@/db/client";
import { user } from "@/db/authSchema";
import { commerceOrders, commerceEntitlements, commerceProviderEvents, commerceProducts, commerceProductGrants } from "@/db/commerceSchema";
import { accountBinding, type VerifiedNativePurchase } from "./config.server";
import { deliverNativePurchase } from "./ledger.server";
import { transactionKey } from "./providers.server";
import { hasCityUnlock } from "../cityUnlock.server";
const owner=randomUUID(),other=randomUUID();
const evidence=(identity=randomUUID()):VerifiedNativePurchase=>({provider:"apple_sandbox",transactionKey:transactionKey(identity),binding:accountBinding(owner),state:"purchased"});
const googleConfig=()=>{
 vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES","1");
 vi.stubEnv("CITYWALK_GOOGLE_SERVICE_ACCOUNT",JSON.stringify({type:"service_account",client_email:"test@example.test",private_key:"synthetic-test-only"}));
};
const ledgerSnapshot=async()=>({
 orders:await getDb().select().from(commerceOrders),
 grants:await getDb().select().from(commerceEntitlements),
 events:await getDb().select().from(commerceProviderEvents),
 products:await getDb().select().from(commerceProducts),
 productGrants:await getDb().select().from(commerceProductGrants),
});
const orders=(p:VerifiedNativePurchase)=>getDb().select().from(commerceOrders).where(and(eq(commerceOrders.provider,p.provider),eq(commerceOrders.providerPaymentIntentId,p.transactionKey)));
describe.runIf(process.env.NATIVE_BILLING_DB_INTEGRATION==="1")("native ledger in disposable loopback database",()=>{
 beforeAll(async()=>{const url=new URL(process.env.DATABASE_URL!);if(url.hostname!=="127.0.0.1"||!/^\/cw_billing_\d+$/.test(url.pathname))throw new Error("Disposable local DB required");vi.stubEnv("CITYWALK_NATIVE_BILLING_MODE","sandbox");vi.stubEnv("CITYWALK_NATIVE_ACCOUNT_SECRET","x".repeat(40));vi.stubEnv("CITYWALK_NATIVE_SANDBOX_USERS",`${owner},${other}`);vi.stubEnv("VERCEL_ENV","preview");await getDb().insert(user).values([{id:owner,name:"Synthetic",email:`${owner}@example.test`},{id:other,name:"Synthetic",email:`${other}@example.test`}]);});
 afterEach(()=>{googleConfig();vi.stubEnv("VERCEL_ENV","preview");});
 afterAll(async()=>{await closeDb();vi.unstubAllEnvs();});
 it("concurrent same-owner delivery yields one order/grant/event",async()=>{const p=evidence();expect(await Promise.all(Array.from({length:5},()=>deliverNativePurchase(p,owner)))).toEqual(Array(5).fill("active"));const rows=await orders(p);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({priceId:null,currency:null,amountTotal:null,status:"paid",userId:owner});expect(await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,rows[0].id))).toHaveLength(1);expect(await getDb().select().from(commerceProviderEvents).where(eq(commerceProviderEvents.providerEventId,`verified:${p.transactionKey}`))).toHaveLength(1);});
 it("another account cannot take the transaction even if binding changes",async()=>{const p=evidence();await deliverNativePurchase(p,owner);await expect(deliverNativePurchase(p,other)).rejects.toThrow("ACCOUNT_CONFLICT");await expect(deliverNativePurchase({...p,binding:accountBinding(other)},other)).rejects.toThrow("ACCOUNT_CONFLICT");expect((await orders(p))[0].userId).toBe(owner);});
 it("notification before first delivery creates a terminal tombstone",async()=>{const p=evidence();expect(await deliverNativePurchase({...p,state:"revoked"})).toBe("revoked");expect(await deliverNativePurchase(p,owner)).toBe("revoked");expect(await orders(p)).toHaveLength(0);});
 it("refund revokes the exact grant; repeated/old events cannot resurrect",async()=>{const p=evidence();await deliverNativePurchase(p,owner);await deliverNativePurchase({...p,state:"revoked"});await deliverNativePurchase({...p,state:"revoked"});expect(await deliverNativePurchase(p,owner)).toBe("revoked");const [order]=await orders(p);expect(order.status).toBe("refunded");const [grant]=await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,order.id));expect(grant.status).toBe("revoked");});
 it("refund races are terminal regardless of lock acquisition order",async()=>{const p=evidence();await Promise.all([deliverNativePurchase(p,owner),deliverNativePurchase({...p,state:"revoked"})]);expect(await deliverNativePurchase(p,owner)).toBe("revoked");});
 it("rebuilds a genuinely missing grant for the same paid owner",async()=>{const p=evidence();await deliverNativePurchase(p,owner);const [order]=await orders(p);await getDb().delete(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,order.id));expect(await deliverNativePurchase(p,owner)).toBe("active");expect(await orders(p)).toHaveLength(1);});
 it("a revoked grant on a paid order is never reactivated by restore",async()=>{const p=evidence();await deliverNativePurchase(p,owner);const [order]=await orders(p);await getDb().update(commerceEntitlements).set({status:"revoked"}).where(eq(commerceEntitlements.sourceOrderId,order.id));expect(await deliverNativePurchase(p,owner)).toBe("revoked");});
 it("fresh server access is account-bound and grant-dependent",async()=>{expect(await hasCityUnlock({userId:owner,citySlug:"lubeck"})).toBe(true);expect(await hasCityUnlock({userId:other,citySlug:"lubeck"})).toBe(false);expect(await hasCityUnlock({citySlug:"lubeck"})).toBe(false);});
 it("native unknown financial data cannot relax Stripe constraints",async()=>{const [product]=await getDb().select().from(commerceProducts).limit(1);await expect(getDb().insert(commerceOrders).values({id:randomUUID(),userId:owner,productId:product.id,provider:"stripe",status:"paid",priceId:null,currency:null,amountTotal:null})).rejects.toThrow();});
 it("never stores receipt/token/account binding in order or event records",async()=>{const p=evidence();await deliverNativePurchase(p,owner);const json=JSON.stringify({orders:await orders(p),events:await getDb().select().from(commerceProviderEvents).where(eq(commerceProviderEvents.providerEventId,`verified:${p.transactionKey}`))});expect(json).not.toContain(p.binding);expect(json).not.toContain("purchaseToken");});
 it.each([undefined,"0","false","invalid"])("disabled Google flag %s leaves all ledger tables unchanged",async flag=>{
  googleConfig();const p={...evidence(),provider:"google_test" as const};
  const before=await ledgerSnapshot();vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES",flag);
  await expect(deliverNativePurchase(p,owner)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
  await expect(deliverNativePurchase({...p,state:"revoked"})).rejects.toThrow("GOOGLE_BILLING_DISABLED");
  expect(await ledgerSnapshot()).toEqual(before);expect(await orders(p)).toHaveLength(0);
 });
 it("explicit enabled Google test delivery is idempotent and disabled restore cannot repair a grant",async()=>{
  googleConfig();const p={...evidence(),provider:"google_test" as const};
  expect(await Promise.all([deliverNativePurchase(p,owner),deliverNativePurchase(p,owner)])).toEqual(["active","active"]);
  const rows=await orders(p);expect(rows).toHaveLength(1);
  expect(await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,rows[0].id))).toHaveLength(1);
  await getDb().delete(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,rows[0].id));
  const before=await ledgerSnapshot();vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES","0");
  await expect(deliverNativePurchase(p,owner)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
  expect(await ledgerSnapshot()).toEqual(before);
 });
 it("disabled revocation is deferred without writes; retry after reenable revokes and cannot resurrect",async()=>{
  googleConfig();const p={...evidence(),provider:"google_test" as const};await deliverNativePurchase(p,owner);
  const before=await ledgerSnapshot();vi.stubEnv("CITYWALK_GOOGLE_TEST_PURCHASES","0");
  await expect(deliverNativePurchase({...p,state:"revoked"})).rejects.toThrow("GOOGLE_BILLING_DISABLED");
  expect(await ledgerSnapshot()).toEqual(before);
  googleConfig();expect(await deliverNativePurchase({...p,state:"revoked"})).toBe("revoked");
  expect(await deliverNativePurchase({...p,state:"revoked"})).toBe("revoked");
  expect(await deliverNativePurchase(p,owner)).toBe("revoked");
  const [order]=await orders(p);expect(order.status).toBe("refunded");
  expect(await getDb().select().from(commerceEntitlements).where(eq(commerceEntitlements.sourceOrderId,order.id))).toEqual([expect.objectContaining({status:"revoked"})]);
 });
 it("Production cannot write Google test orders even with explicit flag",async()=>{
  googleConfig();const p={...evidence(),provider:"google_test" as const};const before=await ledgerSnapshot();
  vi.stubEnv("VERCEL_ENV","production");
  await expect(deliverNativePurchase(p,owner)).rejects.toThrow("GOOGLE_BILLING_DISABLED");
  expect(await ledgerSnapshot()).toEqual(before);
 });

});
