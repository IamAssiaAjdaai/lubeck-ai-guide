import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), signOut: vi.fn(), getSession: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { fetchAuthenticated: mocks.request } }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { signOut: mocks.signOut, getSession: mocks.getSession } }));
import { deleteNativeAccount } from "../src/lib/auth/lifecycle";
beforeEach(() => { vi.clearAllMocks(); mocks.signOut.mockResolvedValue({}); mocks.getSession.mockResolvedValue({ data: null }); });
it("sends password confirmation with the expected account header, then clears auth only after committed deletion", async () => {
  mocks.request.mockResolvedValue(Response.json({ deleted: true }));
  expect(await deleteNativeAccount("synthetic-owner", "synthetic-password")).toEqual({});
  expect(mocks.request).toHaveBeenCalledWith("/api/account/delete", expect.objectContaining({ headers: expect.objectContaining({ "X-Citywalk-Account": "synthetic-owner" }), body: JSON.stringify({ password: "synthetic-password", confirm: true }) }));
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
it("does not clear local auth on deletion rejection or network failure", async () => {
  mocks.request.mockResolvedValueOnce(Response.json({ code: "RETENTION_REVIEW_REQUIRED" }, { status: 409 })).mockRejectedValueOnce(new Error("offline"));
  expect(await deleteNativeAccount("owner", "password")).toEqual({ error: { code: "RETENTION_REVIEW_REQUIRED" } });
  await expect(deleteNativeAccount("owner", "password")).rejects.toThrow("offline"); expect(mocks.signOut).not.toHaveBeenCalled();
});
it("does not misreport an already committed deletion if the subsequent sign-out network request fails", async () => {
  mocks.request.mockResolvedValue(Response.json({ deleted: true })); mocks.signOut.mockRejectedValue(new Error("offline")); mocks.getSession.mockRejectedValue(new Error("offline"));
  expect(await deleteNativeAccount("owner", "password")).toEqual({});
});
