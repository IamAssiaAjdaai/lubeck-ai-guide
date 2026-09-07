import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAccessOutcome: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin/authorization.server", () => ({
  getAdminAccessOutcome: mocks.getAdminAccessOutcome,
}));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => children,
}));

import ProtectedAdminLayout from "./layout";

describe("protected admin routes", () => {
  it("redirects unauthenticated visitors before rendering preview children", async () => {
    mocks.getAdminAccessOutcome.mockResolvedValue({ kind: "unauthenticated" });

    await expect(
      ProtectedAdminLayout({ children: <p>Unpublished preview</p> }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });
});
