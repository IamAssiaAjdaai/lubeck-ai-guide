import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteNativeAccount } from "./lifecycle";

const mocks = vi.hoisted(() => ({
  fetchAuthenticated: vi.fn(),
  purgeDeletedAccountLocalData: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("../api/instance", () => ({
  citywalkApi: { fetchAuthenticated: mocks.fetchAuthenticated },
}));
vi.mock("./accountLocalData", () => ({
  purgeDeletedAccountLocalData: mocks.purgeDeletedAccountLocalData,
}));
vi.mock("./client", () => ({
  nativeAuthClient: { signOut: mocks.signOut, getSession: mocks.getSession },
}));

function deletedResponse() {
  return new Response(JSON.stringify({ deleted: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("deleteNativeAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAuthenticated.mockResolvedValue(deletedResponse());
    mocks.purgeDeletedAccountLocalData.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue({});
    mocks.getSession.mockResolvedValue({ data: null });
  });

  it("omits a password for the fresh social-session deletion path", async () => {
    await deleteNativeAccount("user-social");

    expect(mocks.fetchAuthenticated).toHaveBeenCalledOnce();
    const [, request] = mocks.fetchAuthenticated.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({ confirm: true });
  });

  it("sends the password for a credential-account deletion", async () => {
    await deleteNativeAccount("user-password", "secret-password");

    const [, request] = mocks.fetchAuthenticated.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({ password: "secret-password", confirm: true });
  });
});
