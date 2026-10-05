import { beforeEach, expect, it, vi } from "vitest";
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
