// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { t } from "@citywalk/i18n";
import ResetPasswordForm from "./ResetPasswordForm";
const token = "A".repeat(24);
const fetcher = vi.fn();
beforeEach(() => {
  fetcher.mockReset().mockImplementation(async path => Response.json(path === "/api/auth/reset-password" ? { status: true } : { valid: true })); vi.stubGlobal("fetch", fetcher);
  history.replaceState(null, "", `/account/reset-password?locale=de#token=${token}`);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const label = (key: Parameters<typeof t>[1]) => t("de", key);
async function ready() { render(<ResetPasswordForm locale="de" />); await screen.findByLabelText(label("profile.newPassword")); }
function fill(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText(label("profile.newPassword")), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(label("profile.confirmPassword")), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: label("lifecycle.resetSubmit") }));
}
it("removes the fragment, validates by POST and never stores the token", async () => {
  const storage = vi.spyOn(Storage.prototype, "setItem"); await ready();
  expect(location.hash).toBe(""); expect(storage).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledWith("/api/account/reset-token", expect.objectContaining({ method: "POST", body: JSON.stringify({ token }) }));
});
it("enforces min/max/mismatch, supports password managers/show-hide, then displays success/sign-in", async () => {
  await ready(); const field = screen.getByLabelText(label("profile.newPassword")); expect(field.getAttribute("autocomplete")).toBe("new-password"); expect(field.getAttribute("type")).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: `${label("profile.showPassword")}: ${label("profile.newPassword")}` })); expect(field.getAttribute("type")).toBe("text");
  fill("x".repeat(11)); expect(screen.getByRole("alert").textContent).toBe(label("profile.passwordTooShort"));
  fill("x".repeat(129)); expect(screen.getByRole("alert").textContent).toBe(label("profile.passwordTooLong"));
  fill("x".repeat(12), "different"); expect(screen.getByRole("alert").textContent).toBe(label("profile.passwordMismatch")); expect(fetcher).toHaveBeenCalledTimes(1);
  fill("x".repeat(12)); await screen.findByText(label("lifecycle.resetSuccess")); expect(screen.getByRole("link").getAttribute("href")).toBe("/de/account");
  expect(fetcher).toHaveBeenLastCalledWith("/api/auth/reset-password", expect.objectContaining({ body: JSON.stringify({ token, newPassword: "x".repeat(12) }) }));
});
it("shows invalid/expired link without a password form", async () => {
  fetcher.mockResolvedValue(Response.json({ valid: false }, { status: 400 })); render(<ResetPasswordForm locale="de" />);
  await screen.findByText(label("lifecycle.invalidLink")); expect(screen.queryByLabelText(label("profile.newPassword"))).toBeNull();
});
it("offers retry on validation network failure rather than consuming or losing the token", async () => {
  fetcher.mockRejectedValueOnce(new Error("offline")); render(<ResetPasswordForm locale="de" />);
  await screen.findByText(label("lifecycle.unavailable")); fireEvent.click(screen.getByRole("button", { name: label("common.retry") }));
  await screen.findByLabelText(label("profile.newPassword")); expect(fetcher).toHaveBeenCalledTimes(2);
});
it("shows rate-limit feedback and does not claim success on reset failure", async () => {
  await ready(); fetcher.mockResolvedValue(Response.json({ code: "RATE_LIMITED" }, { status: 429 })); fill("x".repeat(12));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(label("lifecycle.rateLimited"))); expect(screen.queryByText(label("lifecycle.resetSuccess"))).toBeNull();
});

it("does not mistake a protected Preview HTML response for token validation", async () => {
  fetcher.mockResolvedValue(new Response("<html>Platform sign in</html>", { status: 200 }));
  render(<ResetPasswordForm locale="de" />); await screen.findByText(label("lifecycle.unavailable"));
  expect(screen.queryByLabelText(label("profile.newPassword"))).toBeNull();
});
it("does not claim reset success for an unexpected successful HTTP response", async () => {
  await ready(); fetcher.mockResolvedValue(Response.json({})); fill("x".repeat(12));
  await screen.findByText(label("lifecycle.unavailable")); expect(screen.queryByText(label("lifecycle.resetSuccess"))).toBeNull();
});
