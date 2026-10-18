import { afterEach, expect, it, vi } from "vitest";
const fetch = vi.hoisted(()=>vi.fn());
vi.mock("../src/lib/api/instance",()=>({citywalkApi:{fetchAuthenticated:fetch}}));
import { readPublicPurchasePolicy, requirePublicPurchases } from "../src/lib/launchPolicy";
afterEach(()=>vi.resetAllMocks());
it.each([{active:true,purchasesAllowed:true},{active:true,purchasesAllowed:false},{},{purchasesAllowed:"true",active:false}])("denies invalid/launch purchase state %j",async body=>{
 fetch.mockImplementation(async()=>Response.json(body));expect(await readPublicPurchasePolicy()).toBe(false);
 await expect(requirePublicPurchases()).rejects.toThrow("PURCHASES_DISABLED");
});
it("permits only a separate explicit server approval",async()=>{fetch.mockResolvedValue(Response.json({active:false,purchasesAllowed:true}));await expect(requirePublicPurchases()).resolves.toBeUndefined();});
it("fails closed on network/server failure",async()=>{fetch.mockResolvedValue(new Response(null,{status:503}));await expect(requirePublicPurchases()).rejects.toThrow();fetch.mockRejectedValue(new Error("offline"));await expect(requirePublicPurchases()).rejects.toThrow();});
