// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nativeCopy } from "@citywalk/i18n/adapters";
import { sharedLocales, t } from "@citywalk/i18n";
const mocks = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  locale: "en", session: null as null | { user: { id: string; name: string; email: string } },
  deleteAccount: vi.fn(), listAccounts: vi.fn(), updateUser: vi.fn(), changePassword: vi.fn(), requestPasswordReset: vi.fn(), deleteUser: vi.fn(),
  signIn: vi.fn(), socialSignIn: vi.fn(), linkSocial: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), back: vi.fn(), replace: vi.fn(),
  data: new Map<string, string>(), write: vi.fn(), remove: vi.fn(), clear: vi.fn(),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => mocks.data.get(key) ?? null,
  setItem: mocks.write, removeItem: mocks.remove, clear: mocks.clear,
} }));
vi.mock("../src/lib/auth/lifecycle", () => ({ deleteNativeAccount: mocks.deleteAccount }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: {
  useSession: () => ({ data: mocks.session, isPending: false }),
  listAccounts: mocks.listAccounts, updateUser: mocks.updateUser, changePassword: mocks.changePassword, requestPasswordReset: mocks.requestPasswordReset, deleteUser: mocks.deleteUser,
  signIn: { email: mocks.signIn, social: mocks.socialSignIn }, linkSocial: mocks.linkSocial, signUp: { email: mocks.signUp }, signOut: mocks.signOut,
} }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: mocks.locale, direction: mocks.locale === "ar" ? "rtl" : "ltr", messages: nativeCopy(mocks.locale) }) }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: async () => {} }));
vi.mock("expo-router", () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => mocks.params,
  router: { back: mocks.back, canGoBack: () => true, replace: mocks.replace },
  Link: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>,
}));
vi.mock("react-native", () => ({
  StyleSheet: { create: (style: unknown) => style }, BackHandler: { addEventListener: () => ({ remove: () => {} }) },
  Pressable: ({ children, accessibilityLabel, onPress }: React.PropsWithChildren<{ accessibilityLabel: string; onPress: () => void }>) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TextInput: ({ accessibilityLabel, value, onChangeText, secureTextEntry, editable, autoComplete, textContentType }: { accessibilityLabel: string; value: string; onChangeText: (v: string) => void; secureTextEntry?: boolean; editable: boolean; autoComplete?: string; textContentType?: string }) =>
    <input data-autocomplete={autoComplete} data-content-type={textContentType} aria-label={accessibilityLabel} type={secureTextEntry ? "password" : "text"} value={value} onChange={e => onChangeText(e.target.value)} disabled={!editable} />,
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => <span>Pending</span> }));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children, onBack }: React.PropsWithChildren<{ onBack?: () => void }>) => <main>{onBack ? <button onClick={onBack}>Header back</button> : null}{children}</main>,
  PressableSurface: ({ children, onPress }: React.PropsWithChildren<{ onPress: () => void }>) => <button onClick={onPress}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <p role="status">{children}</p>,
  PrimaryButton: ({ label, onPress, busy, disabled }: { label: string; onPress?: () => void; busy?: boolean; disabled?: boolean }) => <button disabled={busy || disabled} onClick={onPress}>{label}</button>,
}));
import AccountScreen from "../src/app/account";
const messages = () => nativeCopy(mocks.locale);
function open(mode: "signIn" | "signUp" = "signIn") {
  fireEvent.click(screen.getByRole("button", { name: messages()[mode] }));
}
function fill() {
  const name = screen.queryByLabelText(t(mocks.locale, "profile.accountDisplayName"));
  if (name) fireEvent.change(name, { target: { value: "  Alex Traveler  " } });
  fireEvent.change(screen.getByLabelText(messages().email), { target: { value: "traveler@example.test" } });
  fireEvent.change(screen.getByLabelText(messages().password), { target: { value: "a-local-test-password" } });
}
function unchanged(before: Map<string, string>) {
  expect(mocks.data).toEqual(before); expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.clear).not.toHaveBeenCalled();
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.params = {}; mocks.locale = "en"; mocks.session = null;
  mocks.listAccounts.mockResolvedValue({ data: [{ providerId: "credential" }] });
  mocks.deleteAccount.mockResolvedValue({}); mocks.requestPasswordReset.mockResolvedValue({ data: { status: true } });
  mocks.updateUser.mockResolvedValue({}); mocks.changePassword.mockResolvedValue({});
  mocks.signIn.mockResolvedValue({}); mocks.socialSignIn.mockResolvedValue({}); mocks.linkSocial.mockResolvedValue({});
  mocks.signUp.mockResolvedValue({}); mocks.signOut.mockResolvedValue({});
  mocks.data = new Map(["citywalk:native:v2:saved", "citywalk:native:v2:places", "citywalk:native:v2:active:lubeck", "citywalk:local-trips:v2", "citywalk:native:locale:v1", "citywalk:native:public-review:v1"].map(key => [key, `existing-${key}`]));
});
afterEach(() => { vi.unstubAllEnvs(); cleanup(); });
describe("guest-first account", () => {
  it.each(sharedLocales)("offers truthful choices and localized email flow in %s without gating guests", locale => {
    mocks.locale = locale; const before = new Map(mocks.data); render(<AccountScreen />);
    expect(screen.getByText(t(locale, "profile.guestFirst"))).toBeTruthy();
    expect(screen.getByText(t(locale, "profile.accountValue"))).toBeTruthy();
    expect(screen.queryByText(t(locale, "profile.localDataNotice"))).toBeNull();
    expect(screen.queryByLabelText(messages().password)).toBeNull();
    expect(screen.queryByRole("button", { name: /Apple|Google/ })).toBeNull();
    open("signUp"); expect(screen.getByLabelText(messages().email)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t(locale, "common.back") }));
    open(); fireEvent.click(screen.getByRole("button", { name: messages().continueAsGuest }));
    expect(mocks.back).toHaveBeenCalledOnce(); expect(mocks.locale).toBe(locale); unchanged(before);
  });
  it("offers opt-in Google and Apple sign-in without touching guest data", async () => {
    vi.stubEnv("EXPO_PUBLIC_CITYWALK_GOOGLE_AUTH", "1");
    vi.stubEnv("EXPO_PUBLIC_CITYWALK_APPLE_AUTH", "1");
    const before = new Map(mocks.data);
    render(<AccountScreen />);

    fireEvent.click(screen.getByRole("button", { name: copy("profile.continueWithApple") }));
    await waitFor(() => expect(mocks.socialSignIn).toHaveBeenCalledWith({
      provider: "apple",
      callbackURL: "/account",
    }));

    fireEvent.click(screen.getByRole("button", { name: copy("profile.continueWithGoogle") }));
    await waitFor(() => expect(mocks.socialSignIn).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/account",
    }));
    unchanged(before);
  });

  it("validation and failed authentication retain guest data and language", async () => {
    mocks.locale = "de"; mocks.signIn.mockResolvedValue({ error: { code: "INVALID_EMAIL_OR_PASSWORD" } });
    const before = new Map(mocks.data); render(<AccountScreen />); open(); open();
    expect(screen.getByText(messages().invalidEmail)).toBeTruthy(); expect(mocks.signIn).not.toHaveBeenCalled();
    fill(); open(); await screen.findByText(messages().invalidCredentials); expect(mocks.locale).toBe("de"); unchanged(before);
  });
  it("successful sign-in/sign-out preserve all device-local data", async () => {
    const before = new Map(mocks.data); const view = render(<AccountScreen />); open(); fill(); open();
    await waitFor(() => expect(screen.queryByLabelText(messages().password)).toBeNull());
    mocks.session = { user: { id: "private-user-id", name: "Alex", email: "traveler@example.test" } }; view.rerender(<AccountScreen />);
    fireEvent.click(screen.getByRole("button", { name: messages().signOut }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    mocks.session = null; view.rerender(<AccountScreen />);
    expect(screen.getByText(copy("profile.guestFirst"))).toBeTruthy(); unchanged(before);
  });
  it("signup explains explicit sign-in (backend autoSignIn is false) without migrating local data", async () => {
    const before = new Map(mocks.data); render(<AccountScreen />); open("signUp"); fill(); open("signUp");
    await screen.findByText(messages().accountCreated); expect(screen.getByRole("button", { name: messages().signIn })).toBeTruthy();
    expect(mocks.signUp).toHaveBeenCalledOnce(); expect(mocks.signIn).not.toHaveBeenCalled(); unchanged(before);
  });
  it("prevents repeated submissions and ignores a late response after closing the email flow", async () => {
    let finish!: (value: object) => void;
    mocks.signIn.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const before = new Map(mocks.data); render(<AccountScreen />); open(); fill(); open(); open();
    expect(mocks.signIn).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: t(mocks.locale, "common.back") }));
    await act(async () => finish({ error: { code: "INVALID_EMAIL_OR_PASSWORD" } }));
    expect(screen.queryByText(messages().invalidCredentials)).toBeNull(); expect(screen.queryByLabelText(messages().password)).toBeNull(); unchanged(before);
  });
});

const copy = (key: Parameters<typeof t>[1]) => t(mocks.locale, key);
function press(key: Parameters<typeof t>[1]) { fireEvent.click(screen.getByRole("button", { name: copy(key) })); }
function enter(key: Parameters<typeof t>[1], value: string) { fireEvent.change(screen.getByLabelText(copy(key)), { target: { value } }); }
function signedIn() { mocks.session = { user: { id: "private-user-id", name: "Alex", email: "traveler@example.test" } }; }

describe("account management with real capability boundaries", () => {
  it("validates the signup name and sends it trimmed with email and password", async () => {
    render(<AccountScreen />); open("signUp"); open("signUp");
    expect(screen.getByText(copy("profile.invalidName"))).toBeTruthy(); expect(mocks.signUp).not.toHaveBeenCalled();
    fill(); open("signUp"); await screen.findByText(messages().accountCreated);
    expect(mocks.signUp).toHaveBeenCalledWith({ name: "Alex Traveler", email: "traveler@example.test", password: "a-local-test-password" });
  });
  it("uses secure entry with independent eye controls and current/new password autofill", () => {
    render(<AccountScreen />); open();
    let field = screen.getByLabelText(messages().password);
    expect(field.getAttribute("type")).toBe("password"); expect(field.getAttribute("data-autocomplete")).toBe("current-password");
    fireEvent.click(screen.getByRole("button", { name: `${copy("profile.showPassword")}: ${messages().password}` }));
    expect(field.getAttribute("type")).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: `${copy("profile.hidePassword")}: ${messages().password}` }));
    expect(field.getAttribute("type")).toBe("password");
    press("common.back"); open("signUp"); field = screen.getByLabelText(messages().password);
    expect(field.getAttribute("data-autocomplete")).toBe("new-password"); expect(field.getAttribute("data-content-type")).toBe("newPassword");
    expect(screen.getByLabelText(copy("profile.accountDisplayName")).getAttribute("data-autocomplete")).toBe("name");
    expect(screen.getByLabelText(messages().email).getAttribute("data-autocomplete")).toBe("email");
  });
  it.each(["traveler@example.test", "unknown@example.test"])("shows the same reset acknowledgement for %s", async email => {
    const before = new Map(mocks.data); render(<AccountScreen />); open(); press("profile.forgotPassword");
    press("profile.sendResetLink"); expect(screen.getByText(messages().invalidEmail)).toBeTruthy(); expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
    enter("profile.email", email); press("profile.sendResetLink");
    await screen.findByText(copy("lifecycle.resetRequested"));
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith({ email, fetchOptions: { headers: { "X-Citywalk-Locale": "en" } } });
    unchanged(before);
  });
  it("shows a recoverable reset failure without claiming delivery", async () => {
    mocks.requestPasswordReset.mockResolvedValueOnce({ error: { code: "UNAVAILABLE" } });
    render(<AccountScreen />); open(); press("profile.forgotPassword"); enter("profile.email", "traveler@example.test"); press("profile.sendResetLink");
    await screen.findByText(copy("lifecycle.unavailable")); expect(screen.queryByText(copy("lifecycle.resetRequested"))).toBeNull();
    press("profile.sendResetLink"); await screen.findByText(copy("lifecycle.resetRequested"));
  });
  it("shows profile identity, edits only the name, and recovers from an update failure", async () => {
    signedIn(); mocks.updateUser.mockResolvedValueOnce({ error: { code: "INTERNAL_SERVER_ERROR" } }).mockImplementationOnce(async () => { mocks.session!.user.name = "New name"; return {}; });
    const before = new Map(mocks.data); render(<AccountScreen />);
    expect(screen.getByText("Alex")).toBeTruthy(); expect(screen.getByText("traveler@example.test")).toBeTruthy();
    expect(screen.queryByText("private-user-id")).toBeNull();
    press("profile.editProfile"); expect(screen.queryByLabelText(messages().email)).toBeNull();
    expect(screen.getByText(copy("profile.emailReadOnly"))).toBeTruthy();
    enter("profile.accountDisplayName", "  New name  "); press("profile.saveProfile");
    await screen.findByText(messages().authError); press("profile.saveProfile");
    await screen.findByText(copy("profile.profileUpdated")); expect(screen.getByText("New name")).toBeTruthy(); expect(mocks.updateUser).toHaveBeenLastCalledWith({ name: "New name" }); unchanged(before);
  });
  it("lets a signed-in user explicitly connect Google without implicit account linking", async () => {
    vi.stubEnv("EXPO_PUBLIC_CITYWALK_GOOGLE_AUTH", "1");
    signedIn();
    mocks.listAccounts.mockResolvedValue({ data: [{ providerId: "credential" }] });
    render(<AccountScreen />);
    const connect = await screen.findByRole("button", { name: copy("profile.connectGoogle") });
    fireEvent.click(connect);
    await waitFor(() => expect(mocks.linkSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/account",
    }));
    await screen.findByText(copy("profile.socialLinked"));
  });

  it("gates password controls by the authenticated account provider", async () => {
    signedIn(); mocks.listAccounts.mockResolvedValue({ data: [{ providerId: "google" }] });
    render(<AccountScreen />); await waitFor(() => expect(mocks.listAccounts).toHaveBeenCalledOnce());
    expect(screen.queryByRole("button", { name: copy("profile.changePassword") })).toBeNull();
  });
  it("recovers an account-provider lookup error without claiming a social-only account", async () => {
    signedIn(); mocks.listAccounts.mockResolvedValueOnce({ error: {} }).mockResolvedValueOnce({ data: [{ providerId: "credential" }] });
    render(<AccountScreen />); await screen.findByText(messages().authNetworkError);
    expect(screen.queryByRole("button", { name: copy("profile.changePassword") })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: messages().retry }));
    await screen.findByRole("button", { name: copy("profile.changePassword") });
  });
  it("validates changed passwords, delegates current-password verification, and revokes other sessions", async () => {
    signedIn(); const before = new Map(mocks.data); render(<AccountScreen />);
    fireEvent.click(await screen.findByRole("button", { name: copy("profile.changePassword") }));
    press("profile.changePassword"); expect(screen.getByText(copy("profile.currentPasswordRequired"))).toBeTruthy();
    enter("profile.currentPassword", "old-test-password"); enter("profile.newPassword", "new-test-password"); enter("profile.confirmPassword", "different-password");
    press("profile.changePassword"); expect(screen.getByText(copy("profile.passwordMismatch"))).toBeTruthy(); expect(mocks.changePassword).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `${copy("profile.showPassword")}: ${copy("profile.newPassword")}` }));
    expect(screen.getByLabelText(copy("profile.newPassword")).getAttribute("type")).toBe("text");
    expect(screen.getByLabelText(copy("profile.currentPassword")).getAttribute("type")).toBe("password");
    expect(screen.getByLabelText(copy("profile.confirmPassword")).getAttribute("type")).toBe("password");
    enter("profile.confirmPassword", "new-test-password");
    mocks.changePassword.mockResolvedValueOnce({ error: { code: "INVALID_PASSWORD" } }); press("profile.changePassword");
    await screen.findByText(copy("profile.currentPasswordIncorrect"));
    press("profile.changePassword"); await screen.findByText(copy("profile.passwordChanged"));
    expect(mocks.changePassword).toHaveBeenLastCalledWith({ currentPassword: "old-test-password", newPassword: "new-test-password", revokeOtherSessions: true });
    expect(screen.queryByLabelText(copy("profile.currentPassword"))).toBeNull(); unchanged(before);
  });
  it("prevents double password submission and ignores late form feedback after Back", async () => {
    signedIn(); let finish!: (result: object) => void;
    mocks.changePassword.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<AccountScreen />); fireEvent.click(await screen.findByRole("button", { name: copy("profile.changePassword") }));
    enter("profile.currentPassword", "old-test-password"); enter("profile.newPassword", "new-test-password"); enter("profile.confirmPassword", "new-test-password");
    press("profile.changePassword"); press("profile.changePassword"); expect(mocks.changePassword).toHaveBeenCalledOnce();
    press("common.back"); await act(async () => finish({}));
    expect(screen.queryByText(copy("profile.passwordChanged"))).toBeNull();
  });
  it("requires password and explicit confirmation, then returns to guest without touching local data", async () => {
    signedIn(); const before = new Map(mocks.data); const view = render(<AccountScreen />); press("profile.deleteAccount");
    await screen.findByLabelText(copy("profile.currentPassword"));
    expect((screen.getByRole("button", { name: copy("lifecycle.deletePermanently") }) as HTMLButtonElement).disabled).toBe(true);
    enter("profile.currentPassword", "original-test-password");
    fireEvent.click(screen.getByText(new RegExp(copy("lifecycle.deleteConfirm"))));
    press("lifecycle.deletePermanently"); await screen.findByText(copy("lifecycle.deleted"));
    expect(mocks.deleteAccount).toHaveBeenCalledWith("private-user-id", "original-test-password");
    mocks.session = null; view.rerender(<AccountScreen />); expect(screen.getByText(copy("profile.guestFirst"))).toBeTruthy(); unchanged(before);
  });
  it("does not fake success on a failed deletion and allows retry", async () => {
    signedIn(); mocks.deleteAccount.mockResolvedValueOnce({ error: { code: "RETENTION_REVIEW_REQUIRED" } });
    const before = new Map(mocks.data); render(<AccountScreen />); press("profile.deleteAccount"); await screen.findByLabelText(copy("profile.currentPassword"));
    enter("profile.currentPassword", "original-test-password"); fireEvent.click(screen.getByText(new RegExp(copy("lifecycle.deleteConfirm"))));
    press("lifecycle.deletePermanently"); await screen.findByText(copy("lifecycle.retentionBlocked"));
    expect(screen.queryByText(copy("lifecycle.deleted"))).toBeNull(); expect(mocks.signOut).not.toHaveBeenCalled();
    press("lifecycle.deletePermanently"); await screen.findByText(copy("lifecycle.deleted")); unchanged(before);
  });
});

it("deduplicates signup requests while showing the busy state", async () => {
  let finish!: (result: object) => void;
  mocks.signUp.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const before = new Map(mocks.data); render(<AccountScreen />); open("signUp"); fill(); open("signUp"); open("signUp");
  expect(mocks.signUp).toHaveBeenCalledOnce();
  expect((screen.getByRole("button", { name: messages().signUp }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish({})); await screen.findByText(messages().accountCreated); unchanged(before);
});
it("deduplicates display-name saves and preserves a rejected draft for retry", async () => {
  signedIn(); let finish!: (result: object) => void;
  mocks.updateUser.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const before = new Map(mocks.data); render(<AccountScreen />); press("profile.editProfile");
  enter("profile.accountDisplayName", "Draft name"); press("profile.saveProfile"); press("profile.saveProfile");
  expect(mocks.updateUser).toHaveBeenCalledOnce(); await act(async () => finish({ error: { code: "INTERNAL_SERVER_ERROR" } }));
  expect((screen.getByLabelText(copy("profile.accountDisplayName")) as HTMLInputElement).value).toBe("Draft name");
  expect((screen.getByRole("button", { name: copy("profile.saveProfile") }) as HTMLButtonElement).disabled).toBe(false); unchanged(before);
});

it("returns to the pending walk only after explicit sign-in, without saving or changing traveler data", async () => {
  mocks.params = { entry: "sign-up", returnToWalk: "1" };
  const before = new Map(mocks.data); render(<AccountScreen />); fill(); open("signUp");
  await screen.findByText(messages().accountCreated); expect(mocks.back).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(messages().password), { target: { value: "a-local-test-password" } }); open();
  await waitFor(() => expect(mocks.back).toHaveBeenCalledOnce()); unchanged(before);
});

it("does not claim a reset acknowledgement for an unexpected API response", async () => {
  mocks.requestPasswordReset.mockResolvedValue({ data: {} }); render(<AccountScreen />); open(); press("profile.forgotPassword");
  enter("profile.email", "synthetic@example.test"); press("profile.sendResetLink");
  await screen.findByText(copy("lifecycle.unavailable")); expect(screen.queryByText(copy("lifecycle.resetRequested"))).toBeNull();
});
