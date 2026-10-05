import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  verifyTotp: vi.fn(),
  verifyBackupCode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/lib/admin/authClient", () => ({
  adminAuthClient: {
    twoFactor: {
      verifyTotp: mocks.verifyTotp,
      verifyBackupCode: mocks.verifyBackupCode,
    },
  },
}));

import { AdminTwoFactorForm } from "@/components/admin/AdminTwoFactorForm";

describe("AdminTwoFactorForm", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
    mocks.verifyTotp.mockReset();
    mocks.verifyBackupCode.mockReset();
  });

  afterEach(cleanup);

  it("verifies a TOTP challenge and opens the control center", async () => {
    mocks.verifyTotp.mockResolvedValue({ data: { status: true }, error: null });
    render(<AdminTwoFactorForm />);

    fireEvent.change(screen.getByLabelText("6-digit authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & continue" }));

    await waitFor(() => expect(mocks.verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: false }));
    expect(mocks.replace).toHaveBeenCalledWith("/admin");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("supports a one-time backup code", async () => {
    mocks.verifyBackupCode.mockResolvedValue({ data: { status: true }, error: null });
    render(<AdminTwoFactorForm />);

    fireEvent.click(screen.getByRole("button", { name: "Backup code" }));
    fireEvent.change(screen.getByLabelText("One-time backup code"), { target: { value: "BACKUP-ONE" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & continue" }));

    await waitFor(() => expect(mocks.verifyBackupCode).toHaveBeenCalledWith({
      code: "BACKUP-ONE",
      disableSession: false,
      trustDevice: false,
    }));
  });

  it("shows temporary lockout without revealing sensitive details", async () => {
    mocks.verifyTotp.mockResolvedValue({
      data: null,
      error: { status: 429, code: "ACCOUNT_TEMPORARILY_LOCKED" },
    });
    render(<AdminTwoFactorForm />);

    fireEvent.change(screen.getByLabelText("6-digit authenticator code"), { target: { value: "111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily locked");
  });
});