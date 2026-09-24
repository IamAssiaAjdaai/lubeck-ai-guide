import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuth, getSession } = vi.hoisted(() => ({ getAuth: vi.fn(), getSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./server", () => ({ getAuth }));
import { getPublicSession } from "./publicSession.server";

describe("optional public sessions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuth.mockReturnValue({ api: { getSession } });
  });

  it("does not initialize auth for anonymous discovery or a locale cookie", async () => {
    expect(await getPublicSession(new Headers())).toBeNull();
    expect(await getPublicSession(new Headers({ cookie: "locale=de" }))).toBeNull();
    expect(getAuth).not.toHaveBeenCalled();
  });

  it.each(["better-auth.session_token", "__Secure-better-auth.session_token"])("verifies %s on the server", async (name) => {
    const session = { user: { id: "traveler" } };
    getSession.mockResolvedValue(session);
    const headers = new Headers({ cookie: `locale=en; ${name}=signed-token` });
    expect(await getPublicSession(headers)).toBe(session);
    expect(getSession).toHaveBeenCalledWith({ headers });
  });

  it("fails closed when optional session verification is unavailable", async () => {
    getSession.mockRejectedValue(new Error("private service details"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await getPublicSession(new Headers({ cookie: "better-auth.session_token=invalid" }))).toBeNull();
    expect(warning).not.toHaveBeenCalledWith(expect.stringContaining("private service details"));
    warning.mockRestore();
  });
});
