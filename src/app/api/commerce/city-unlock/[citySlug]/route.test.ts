import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({getAuth: () => ({api: {getSession: mocks.session}})}));
vi.mock("@/lib/commerce/premiumAccess.server", () => ({resolveCitywalkPaidAccess: mocks.access}));
import { GET, POST } from "./route";
const params = { params: Promise.resolve({citySlug: "lubeck"}) };
beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({user:{id:"owner"}}); mocks.access.mockResolvedValue({tier:"free",premium:false,cityPass:false}); });
it("uses the authenticated owner regardless of forged query/flags", async () => {
 const r=await GET(new Request("https://preview.test/api/commerce/city-unlock/lubeck?userId=other&premium=true",{headers:{"X-Citywalk-Account":"owner"}}),params);
 expect(r.status).toBe(200); expect(r.headers.get("Cache-Control")).toBe("private, no-store");
 expect(mocks.access).toHaveBeenCalledWith({citySlug:"lubeck",userId:"owner"}); expect((await r.json()).active).toBe(false);
});
it("rejects account switches instead of leaking another account's entitlement", async () => {
 const r=await GET(new Request("https://preview.test/api/commerce/city-unlock/lubeck",{headers:{"X-Citywalk-Account":"other"}}),params);
 expect(r.status).toBe(401); expect(mocks.access).not.toHaveBeenCalled();
});
it("reports canonical city-pass access independently of the sandbox billing context", async () => {
 mocks.access.mockResolvedValue({tier:"city_pass",premium:false,cityPass:true});const r=await GET(new Request("https://preview.test/api/commerce/city-unlock/lubeck",{headers:{"X-Citywalk-Account":"owner"}}),params);
 expect(await r.json()).toEqual({citySlug:"lubeck",scopeType:"city",scopeKey:"lubeck",tier:"city_pass",active:true});
});
it("treats global Premium as paid city access", async () => {
 mocks.access.mockResolvedValue({tier:"premium",premium:true,cityPass:false});const r=await GET(new Request("https://preview.test/api/commerce/city-unlock/lubeck",{headers:{"X-Citywalk-Account":"owner"}}),params);
 expect((await r.json()).active).toBe(true);
});
it("cannot activate entitlement through client receipts or flags", async () => {
 const r=await POST(new Request("https://preview.test/api/commerce/city-unlock/lubeck", {method:"POST"}), params);expect(r.status).toBe(503);expect(mocks.access).not.toHaveBeenCalled();
});
it("returns recoverable failure on an auth/database error",async()=>{
 mocks.session.mockRejectedValue(new Error("private details")); const r=await GET(new Request("https://preview.test/api/commerce/city-unlock/lubeck"),params);
 expect(r.status).toBe(503);expect(await r.text()).not.toContain("private details");
});

afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
it.each([undefined,"owner"])("grants launch city access for %s using server time despite forged query dates",async account=>{
 const start="2030-01-01T00:00:00.000Z";
 for(const [key,value] of Object.entries({CITYWALK_LAUNCH_FREE_ENABLED:"1",CITYWALK_LAUNCH_START_UTC:start,CITYWALK_LAUNCH_APPROVED_AT_UTC:start,CITYWALK_LAUNCH_VERIFIED_PUBLIC_AT_UTC:start,CITYWALK_LAUNCH_APPROVAL_REFERENCE:"synthetic",CITYWALK_LAUNCH_AI_CALLS_PER_24H:"10"}))vi.stubEnv(key,value);
 vi.useFakeTimers();vi.setSystemTime(new Date(start));
 mocks.session.mockResolvedValue(account?{user:{id:account}}:null);
 mocks.access.mockRejectedValue(new Error("paid sources unavailable"));
 const request=new Request("https://preview.test/api/commerce/city-unlock/lubeck?now=2040-01-01&premium=true",{headers:account?{"X-Citywalk-Account":account}:{}});
 const response=await GET(request,params);
 expect(await response.json()).toMatchObject({tier:"launch_free",active:true});
 expect(mocks.access).not.toHaveBeenCalled();
 vi.setSystemTime(new Date("2030-01-29T00:00:00.000Z"));
 expect((await GET(request,params)).status).toBe(503);
});
