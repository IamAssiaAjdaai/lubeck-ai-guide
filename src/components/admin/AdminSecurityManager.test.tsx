import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addPasskey: vi.fn(),
  deletePasskey: vi.fn(),
  listUserPasskeys: vi.fn(),
  enableTwoFactor: vi.fn(),
  verifyTotp: vi.fn(),
  disableTwoFactor: vi.fn(),
}));

vi.mock("@/lib/admin/authClient", () => ({
  adminAuthClient: {
    passkey: {
      addPasskey: mocks.addPasskey,
      deletePasskey: mocks.deletePasskey,
      listUserPasskeys: mocks.listUserPasskeys,
    },
    twoFactor: {
      enable: mocks.enableTwoFactor,
      verifyTotp: mocks.verifyTotp,
      disable: mocks.disableTwoFactor,
    },
  },
}));

import { AdminSecurityManager } from "@/components/admin/AdminSecurityManager";

describe("AdminSecurityManager", () => {
  beforeEach(() => {
    mocks.listUserPasskeys.mockResolvedValue({ data: [], error: null });
    mocks.addPasskey.mockReset();
    mocks.deletePasskey.mockReset();
    mocks.enableTwoFactor.mockReset();
    mocks.verifyTotp.mockReset();
    mocks.disableTwoFactor.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows passkey-first security and password fallback protection", async () => {
    render(<AdminSecurityManager initialTwoFactorEnabled={false} />);

    expect(screen.getByRole("heading", { name: "Passkeys" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add first passkey" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Password fallback protection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up authenticator" })).toBeDisabled();
    await waitFor(() => expect(mocks.listUserPasskeys).toHaveBeenCalledTimes(1));
  });

  it("registers a passkey and refreshes the device list", async () => {
    mocks.addPasskey.mockResolvedValue({ data: { id: "pk-1" }, error: null });
    mocks.listUserPasskeys
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{
          id: "pk-1",
          name: "Mac mini",
          publicKey: "public",
          userId: "staff-1",
          credentialID: "cred-1",
          counter: 0,
          deviceType: "singleDevice",
          backedUp: false,
          transports: "",
          createdAt: new Date("2026-10-05T00:00:00Z"),
        }],
        error: null,
      });

    render(<AdminSecurityManager initialTwoFactorEnabled={false} />);
    await waitFor(() => expect(mocks.listUserPasskeys).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Passkey name"), { target: { value: "Mac mini" } });
    fireEvent.click(screen.getByRole("button", { name: "Add first passkey" }));

    await waitFor(() => expect(mocks.addPasskey).toHaveBeenCalledWith({ name: "Mac mini" }));
    expect(await screen.findByText("Mac mini")).toBeInTheDocument();
  });

  it("enrolls TOTP, verifies it, and keeps backup codes visible", async () => {
    mocks.enableTwoFactor.mockResolvedValue({
      data: {
        method: "totp",
        totpURI: "otpauth://totp/CITYWALK?secret=ABCDEF123456&issuer=CITYWALK",
        backupCodes: ["BACKUP-ONE", "BACKUP-TWO"],
      },
      error: null,
    });
    mocks.verifyTotp.mockResolvedValue({ data: { status: true }, error: null });

    render(<AdminSecurityManager initialTwoFactorEnabled={false} />);
    fireEvent.change(screen.getByLabelText("Current password for authenticator setup"), { target: { value: "valid-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up authenticator" }));

    expect(await screen.findByText("ABCDEF123456")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & enable" }));

    expect(await screen.findByText("Authenticator fallback enabled")).toBeInTheDocument();
    expect(screen.getByText("BACKUP-ONE")).toBeInTheDocument();
    expect(screen.getByText("BACKUP-TWO")).toBeInTheDocument();
  });
});