// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import { BrandContextPersistenceError } from "@/lib/marketing/brandContext/service.server";
import { createBrandAction, confirmBrandAction, correctBrandAction, associateBrandCampaignAction } from "./actions";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), confirm: vi.fn(), correct: vi.fn(), associate: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/admin/authorization.server", async importOriginal => ({ ...await importOriginal<object>(), requireAdminCapability: mocks.auth }));
vi.mock("@/lib/marketing/brandContext/service.server", async importOriginal => ({ ...await importOriginal<object>(), createPersistedBrandContext: mocks.create, confirmPersistedBrandFacts: mocks.confirm, correctPersistedBrandContext: mocks.correct, associateBrandProjectCampaign: mocks.associate }));
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); });
describe("Brand Server Actions", () => {
  it.each([createBrandAction, correctBrandAction, confirmBrandAction, associateBrandCampaignAction])("reauthorizes direct calls before delegating", async action => {
    mocks.auth.mockRejectedValue(new AdminAuthorizationError(403, "FORBIDDEN"));
    expect(await action({ actorId: "forged" })).toMatchObject({ ok: false, code: "FORBIDDEN" });
    for (const fn of [mocks.create, mocks.confirm, mocks.correct, mocks.associate]) expect(fn).not.toHaveBeenCalled();
  });
  it("uses reviewer capability and delegates expectedRevision without supplying identity/time", async () => {
    const request = { projectId: "id", contextId: "id", command: { expectedRevision: 3, factIds: ["claim"] } };
    mocks.confirm.mockResolvedValue({ projectId: "id", contextId: "id", revision: 4 });
    expect(await confirmBrandAction(request)).toMatchObject({ ok: true, revision: 4 });
    expect(mocks.auth).toHaveBeenCalledWith("publishing:review"); expect(mocks.confirm).toHaveBeenCalledWith(request);
  });
  it("reports stale writes and never retries", async () => {
    mocks.correct.mockRejectedValue(new BrandContextPersistenceError("STALE_REVISION"));
    expect(await correctBrandAction({})).toMatchObject({ ok: false, code: "STALE_REVISION" });
    expect(mocks.correct).toHaveBeenCalledTimes(1); expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("sanitizes database and validation messages rather than reflecting private values", async () => {
    mocks.create.mockRejectedValue(new Error("private claim DATABASE_URL=secret"));
    expect(JSON.stringify(await createBrandAction({}))).not.toContain("private claim");
    mocks.create.mockRejectedValue(new ZodError([{ code: "custom", path: ["brief", "identity", "name"], message: "private input" }]));
    const result = await createBrandAction({}); expect(result).toMatchObject({ code: "INVALID" }); expect(JSON.stringify(result)).not.toContain("private input");
  });
});
