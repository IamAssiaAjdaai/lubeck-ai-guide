import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

const { refresh, replace, signInEmail } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: signInEmail },
  },
}));

describe("AdminLoginForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    signInEmail.mockReset();
  });

  it("shows only staff sign-in fields and no public signup", () => {
    render(<AdminLoginForm />);

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeTruthy();
    expect(screen.queryByText(/sign up/i)).toBeNull();
  });

  it("uses a generic error without disclosing which credential failed", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "traveler@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Sign-in failed. Check your details and try again.",
    );
    expect(screen.queryByText(/user not found/i)).toBeNull();
  });

  it("redirects to the protected dashboard after identity sign-in", async () => {
    signInEmail.mockResolvedValue({ data: { token: null }, error: null });
    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "staff@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "valid-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
