import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

const { refresh, replace, signInEmail, signInPasskey } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
  signInPasskey: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/admin/authClient", () => ({
  adminAuthClient: {
    signIn: {
      email: signInEmail,
      passkey: signInPasskey,
    },
  },
}));

describe("AdminLoginForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    signInEmail.mockReset();
    signInPasskey.mockReset();
    vi.stubGlobal("PublicKeyCredential", class PublicKeyCredential {});
  });

  it("makes passkey the primary staff sign-in and keeps password as fallback", () => {
    render(<AdminLoginForm />);

    expect(screen.getByRole("button", { name: "Continue with passkey" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use password instead" })).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.queryByText(/sign up/i)).toBeNull();
  });

  it("signs in with a passkey and opens the protected dashboard", async () => {
    signInPasskey.mockResolvedValue({ data: { user: { id: "staff-1" } }, error: null });
    render(<AdminLoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));

    await waitFor(() => expect(signInPasskey).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/admin");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("uses a generic password error without disclosing which credential failed", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });
    render(<AdminLoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Use password instead" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "traveler@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with password" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Sign-in failed. Check your details and try again.",
    );
    expect(screen.queryByText(/user not found/i)).toBeNull();
  });

  it("lets the 2FA client redirect handle a password challenge", async () => {
    signInEmail.mockResolvedValue({
      data: { twoFactorRedirect: true, twoFactorMethods: ["totp"] },
      error: null,
    });
    render(<AdminLoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Use password instead" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "staff@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "valid-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with password" }));

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
  });
});
