import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TravelerAccountPanel } from "@/components/account/TravelerAccountPanel";
import { getAccountCopy } from "@/lib/account/copy";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  signOut: vi.fn(),
  getIdentity: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: mocks.signInEmail },
    signUp: { email: mocks.signUpEmail },
    signOut: mocks.signOut,
  },
}));

vi.mock("@/lib/visitorSession", () => ({
  getBrowserVisitorSessionIdentity: mocks.getIdentity,
}));

const copy = getAccountCopy("en");

function renderPanel() {
  render(
    <TravelerAccountPanel
      locale="en"
      nextHref="/en/lubeck"
      copy={copy}
    />,
  );
}

describe("TravelerAccountPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIdentity.mockReturnValue({
      visitorId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("uses a generic sign-in error without leaking auth provider details", async () => {
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });
    renderPanel();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "traveler@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect-password" },
    });
    const buttons = screen.getAllByRole("button", { name: "Sign in" });
    fireEvent.click(buttons[buttons.length - 1]!);

    expect((await screen.findByRole("alert")).textContent).toContain(
      copy.genericSignInError,
    );
    expect(screen.queryByText(/user not found/i)).toBeNull();
  });

  it("creates an account without silently auto-signing in", async () => {
    mocks.signUpEmail.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-secure-password" },
    });
    const createButtons = screen.getAllByRole("button", { name: "Create account" });
    fireEvent.click(createButtons[createButtons.length - 1]!);

    expect((await screen.findByRole("status")).textContent).toContain(
      copy.accountCreated,
    );
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it("links the anonymous guest identity before returning to the trip", async () => {
    mocks.signInEmail.mockResolvedValue({ data: { token: null }, error: null });
    renderPanel();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "traveler@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-secure-password" },
    });
    const buttons = screen.getAllByRole("button", { name: "Sign in" });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/en/lubeck"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/account/link-guest",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
