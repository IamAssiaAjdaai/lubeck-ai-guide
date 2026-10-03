import { nativeRowStyle, nativeTextBlock } from "../../design/rtlPresentation";
import { uxCopy } from "../../design/uxCopy";
import { getLocaleLabel, t, type TranslationKey } from "@citywalk/i18n";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, TextInput, View } from "react-native";

import { NativeIcon } from "../../components/NativeIcon";
import { PasswordField } from "../../components/PasswordField";
import { AppText, Card, PrimaryButton, PressableSurface, Screen, StatusMessage } from "../../components/ui";
import { CitywalkLoading } from "../../components/CitywalkLoading";
import { colors, radius, spacing, typography } from "../../design/tokens";
import { deleteNativeAccount } from "../../lib/auth/lifecycle";
import { nativeAuthClient } from "../../lib/auth/client";
import { getNativeSocialAuthAvailability } from "../../lib/auth/configuration";
import { classifyNativeAuthError, type NativeAuthErrorCode, validateDisplayName, validateNativeAuthInput, validateNewPassword } from "../../lib/auth/errors";
import { triggerCitywalkHaptic } from "../../lib/haptics";
import { useNativeLocale } from "../../localization/LocaleProvider";

type Entry = "sign-in" | "sign-up" | "reset" | "edit" | "change-password" | "delete";
type SocialProvider = "google" | "apple";
type Action = "sign-in" | "sign-up" | "edit" | "change-password" | "sign-out" | "reset" | "resend-verification" | "delete" | "social-google" | "social-apple" | "link-google" | "link-apple";

export default function AccountScreen() {
  const { locale, direction, messages } = useNativeLocale();
  const params = useLocalSearchParams<{ entry?: string; returnToWalk?: string }>();
  const { data: session, isPending } = nativeAuthClient.useSession();
  const socialAuth = getNativeSocialAuthAvailability();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<Action>();
  const [failure, setFailure] = useState<NativeAuthErrorCode>();
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [lifecycleFailure, setLifecycleFailure] = useState<TranslationKey>();
  const [notice, setNotice] = useState<TranslationKey>();
  const [entry, setEntry] = useState<Entry | undefined>(() => params.entry === "sign-in" || params.entry === "sign-up" ? params.entry : undefined);
  const submitLock = useRef(false);
  const mounted = useRef(true);
  const request = useRef(0);
  const [providerReload, setProviderReload] = useState(0);
  const [credential, setCredential] = useState<{ userId: string; status: "yes" | "no" | "error"; providers: string[] }>();
  const userId = session?.user.id;
  // Provider IDs are used only to gate password management, never displayed or logged.
  useEffect(() => {
    let active = true;
    if (userId) void nativeAuthClient.listAccounts().then(result => {
      const providers = result.data?.map(account => account.providerId) ?? [];
      if (active) setCredential({
        userId,
        status: result.error ? "error" : providers.includes("credential") ? "yes" : "no",
        providers,
      });
    }).catch(() => { if (active) setCredential({ userId, status: "error", providers: [] }); });
    return () => { active = false; };
  }, [userId, providerReload]);
  const hasCredential = credential?.userId === userId && credential?.status === "yes";
  const linkedProviders =
    credential && credential.userId === userId ? credential.providers : [];
  const hasGoogle = linkedProviders.includes("google");
  const hasApple = linkedProviders.includes("apple");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function clearPasswords() { setPassword(""); setNewPassword(""); setConfirmation(""); }
  const open = useCallback((next?: Entry) => {
    request.current++;
    setDeleteConfirmed(false); setLifecycleFailure(undefined);
    setPassword(""); setNewPassword(""); setConfirmation("");
    setFailure(undefined); setNotice(undefined); setEntry(next);
    if (next === "edit") setName(session?.user.name ?? "");
    if (next === "sign-up") setName("");
  }, [session?.user.name]);
  function back() { open(entry === "reset" ? "sign-in" : undefined); }
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!entry) return false;
      open(entry === "reset" ? "sign-in" : undefined); return true;
    });
    return () => listener.remove();
  }, [entry, open]);
  function leave() {
    open();
    if (router.canGoBack()) router.back(); else router.replace("/");
  }
  async function perform(action: Action, work: () => Promise<{ error?: unknown }>, success: () => void) {
    if (submitLock.current) return;
    submitLock.current = true;
    const token = ++request.current;
    setBusy(action); setFailure(undefined); setNotice(undefined); setLifecycleFailure(undefined);
    try {
      const result = await work();
      if (!mounted.current || token !== request.current) return;
      if (result.error) {
        const code = typeof result.error === "object" && result.error !== null && "code" in result.error ? result.error.code : undefined;
        if (action === "reset" || action === "delete") setLifecycleFailure(code === "RETENTION_REVIEW_REQUIRED" ? "lifecycle.retentionBlocked" : code === "RATE_LIMITED" ? "lifecycle.rateLimited" : code === "REAUTH_REQUIRED" ? "lifecycle.reauthRequired" : "lifecycle.unavailable");
        else setFailure(classifyNativeAuthError(result.error));
        void triggerCitywalkHaptic("error"); return;
      }
      clearPasswords(); success(); void triggerCitywalkHaptic("success");
    } catch {
      if (mounted.current && token === request.current) setFailure("network");
    } finally {
      submitLock.current = false;
      if (mounted.current) setBusy(undefined);
    }
  }
  function authenticate(mode: "sign-in" | "sign-up") {
    if (submitLock.current) return;
    const error = (mode === "sign-up" ? validateDisplayName(name) : undefined) ?? validateNativeAuthInput(email.trim(), password);
    if (error) { setFailure(error); setNotice(undefined); return; }
    const fetchOptions = { headers: { "X-Citywalk-Locale": locale } };
    void perform(mode, () => mode === "sign-in"
      ? nativeAuthClient.signIn.email({ email: email.trim(), password, fetchOptions })
      : nativeAuthClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
          callbackURL: "citywalk://account",
          fetchOptions,
        }), () => {
        if (mode === "sign-up") { setEntry("sign-in"); setNotice("profile.verificationSent"); }
        else { setEntry(undefined); if (params.returnToWalk === "1" && router.canGoBack()) router.back(); }
      });
  }
  function socialSignIn(provider: SocialProvider) {
    if (submitLock.current) return;
    void perform(
      `social-${provider}`,
      () => nativeAuthClient.signIn.social({
        provider,
        callbackURL: "/account",
      }),
      () => {
        setEntry(undefined);
        setProviderReload(value => value + 1);
        if (params.returnToWalk === "1" && router.canGoBack()) router.back();
      },
    );
  }
  function linkSocial(provider: SocialProvider) {
    if (submitLock.current || !session) return;
    void perform(
      `link-${provider}`,
      () => nativeAuthClient.linkSocial({
        provider,
        callbackURL: "/account",
      }),
      () => {
        setProviderReload(value => value + 1);
        setNotice("profile.socialLinked");
      },
    );
  }
  function saveProfile() {
    if (submitLock.current || !session) return;
    const error = validateDisplayName(name);
    if (error) { setFailure(error); return; }
    void perform("edit", () => nativeAuthClient.updateUser({ name: name.trim() }), () => {
      setEntry(undefined); setNotice("profile.profileUpdated");
    });
  }
  function changePassword() {
    if (submitLock.current || !session || !hasCredential) return;
    const error = !password ? "current_password_required" : validateNewPassword(newPassword, confirmation);
    if (error) { setFailure(error); return; }
    void perform("change-password", () => nativeAuthClient.changePassword({ currentPassword: password, newPassword, revokeOtherSessions: true }), () => {
      setEntry(undefined); setNotice("profile.passwordChanged");
    });
  }
  function requestReset() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFailure("invalid_email"); setNotice(undefined); setLifecycleFailure(undefined); return; }
    void perform("reset", async () => {
      const result = await nativeAuthClient.requestPasswordReset({ email: email.trim(), fetchOptions: { headers: { "X-Citywalk-Locale": locale } } });
      return result.error ? { error: result.error } : result.data?.status === true ? {} : { error: { code: "UNAVAILABLE" } };
    }, () => setNotice("lifecycle.resetRequested"));
  }
  function resendVerification() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFailure("invalid_email"); setNotice(undefined); return; }
    void perform("resend-verification", async () => {
      const result = await nativeAuthClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: "citywalk://account",
        fetchOptions: { headers: { "X-Citywalk-Locale": locale } },
      });
      return result.error ? { error: result.error } : result.data?.status === true ? {} : { error: { code: "UNAVAILABLE" } };
    }, () => setNotice("profile.verificationResent"));
  }
  function deleteAccount() {
    if (!session || !deleteConfirmed || !hasCredential) return;
    if (!password) { setFailure("current_password_required"); return; }
    void perform("delete", () => deleteNativeAccount(session.user.id, password), () => { setEntry(undefined); setNotice("lifecycle.deleted"); });
  }
  const isEmailEntry = !session && (entry === "sign-in" || entry === "sign-up");
  const label = (key: TranslationKey) => t(locale, key);
  const socialIcon = (provider: SocialProvider) => (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.socialIcon}
    >
      <AppText style={styles.socialIconText}>
        {provider === "apple" ? "" : "G"}
      </AppText>
    </View>
  );
  const nameField = <>
    <AppText variant="label">{label("profile.accountDisplayName")}</AppText>
    <TextInput accessibilityLabel={label("profile.accountDisplayName")} value={name} onChangeText={setName}
      autoComplete="name" textContentType="name" autoCapitalize="words" editable={!busy} maxLength={100}
      style={[styles.input, { textAlign: direction === "rtl" ? "right" : "left" }]} />
  </>;
  const emailField = <>
    <AppText variant="label">{messages.email}</AppText>
    <TextInput accessibilityLabel={messages.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
      autoComplete="email" textContentType="emailAddress" value={email} onChangeText={setEmail} editable={!busy} style={[styles.input, { textAlign: direction === "rtl" ? "right" : "left" }]} />
  </>;
  return <Screen>
    <Stack.Screen options={{ title: label("profile.nativeAccountTitle") }} />
    <View style={[styles.introduction, nativeRowStyle(direction)]}>
      <View style={styles.accountIcon}><NativeIcon ios="person.crop.circle" android="account_circle" color={colors.primary} size={30} /></View>
      <View style={[styles.introductionText, nativeTextBlock(direction)]}>
        <AppText variant="screenTitle">{session ? label("navigation.profile") : label("profile.nativeAccountTitle")}</AppText>
        {!session ? <AppText style={styles.muted}>{label("profile.guestFirst")}</AppText> : null}
      </View>
    </View>
    {!session && !entry ? <AppText>{label("profile.accountValue")}</AppText> : null}
    {isPending ? <CitywalkLoading compact label={uxCopy(locale).account} /> : null}
    {session && !entry ? <>
      <Card>
        <AppText variant="heading">{session.user.name}</AppText>
        <AppText>{session.user.email}</AppText>
        <PrimaryButton label={label("profile.editProfile")} tone="secondary" onPress={() => open("edit")} />
        <AppText variant="metadata">{messages.language} · {getLocaleLabel(locale)}</AppText>
      </Card>
      <Card>
        <AppText variant="heading">{messages.account}</AppText>
        {credential?.userId !== userId ? <CitywalkLoading compact label={uxCopy(locale).account} /> : null}
        {credential?.userId === userId && credential?.status === "error" ? <>
          <StatusMessage>{messages.authNetworkError}</StatusMessage>
          <PrimaryButton label={messages.retry} tone="secondary" onPress={() => { setCredential(undefined); setProviderReload(value => value + 1); }} />
        </> : null}
        {hasCredential ? <PrimaryButton label={label("profile.changePassword")} tone="secondary" onPress={() => open("change-password")} /> : null}
        {socialAuth.apple ? hasApple
          ? <AppText variant="metadata">{label("profile.appleConnected")}</AppText>
          : <PrimaryButton
              label={label("profile.connectApple")}
              leadingIcon={socialIcon("apple")}
              tone="secondary"
              busy={busy === "link-apple"}
              disabled={Boolean(busy)}
              onPress={() => linkSocial("apple")}
            /> : null}
        {socialAuth.google ? hasGoogle
          ? <AppText variant="metadata">{label("profile.googleConnected")}</AppText>
          : <PrimaryButton
              label={label("profile.connectGoogle")}
              leadingIcon={socialIcon("google")}
              tone="secondary"
              busy={busy === "link-google"}
              disabled={Boolean(busy)}
              onPress={() => linkSocial("google")}
            /> : null}
        <PrimaryButton label={messages.signOut} busy={busy === "sign-out"} onPress={() => void perform("sign-out", () => nativeAuthClient.signOut(), () => setEntry(undefined))} tone="secondary" />
        <PressableSurface accessibilityRole="button" onPress={() => open("delete")} style={styles.deleteAction}>
          <AppText variant="label" style={styles.destructive}>{label("profile.deleteAccount")}</AppText>
        </PressableSurface>
      </Card>
    </> : null}
    {!session && !entry ? <Card>
      {socialAuth.apple ? <PrimaryButton
        label={label("profile.continueWithApple")}
        leadingIcon={socialIcon("apple")}
        busy={busy === "social-apple"}
        disabled={isPending || Boolean(busy)}
        onPress={() => socialSignIn("apple")}
      /> : null}
      {socialAuth.google ? <PrimaryButton
        label={label("profile.continueWithGoogle")}
        leadingIcon={socialIcon("google")}
        busy={busy === "social-google"}
        disabled={isPending || Boolean(busy)}
        tone="secondary"
        onPress={() => socialSignIn("google")}
      /> : null}
      <PrimaryButton label={messages.signUp} disabled={isPending || Boolean(busy)} onPress={() => open("sign-up")} />
      <PrimaryButton label={messages.signIn} disabled={isPending || Boolean(busy)} tone="secondary" onPress={() => open("sign-in")} />
      <PrimaryButton label={messages.continueAsGuest} tone="secondary" onPress={leave} />
    </Card> : null}
    {isEmailEntry ? <Card>
      {socialAuth.apple ? <PrimaryButton
        label={label("profile.continueWithApple")}
        leadingIcon={socialIcon("apple")}
        busy={busy === "social-apple"}
        disabled={isPending || Boolean(busy)}
        onPress={() => socialSignIn("apple")}
      /> : null}
      {socialAuth.google ? <PrimaryButton
        label={label("profile.continueWithGoogle")}
        leadingIcon={socialIcon("google")}
        busy={busy === "social-google"}
        disabled={isPending || Boolean(busy)}
        tone="secondary"
        onPress={() => socialSignIn("google")}
      /> : null}
      <AppText variant="heading">{entry === "sign-up" ? messages.signUp : messages.signIn}</AppText>
      {entry === "sign-up" ? nameField : null}
      {emailField}
      <PasswordField key={entry} label={messages.password} value={password} onChange={setPassword} newPassword={entry === "sign-up"} disabled={Boolean(busy)} />
      {entry === "sign-up" ? <AppText variant="metadata">{messages.passwordTooShort}</AppText> : null}
      <PrimaryButton label={entry === "sign-up" ? messages.signUp : messages.signIn} busy={Boolean(busy)} disabled={isPending} onPress={() => authenticate(entry === "sign-up" ? "sign-up" : "sign-in")} />
      {entry === "sign-in" ? <PrimaryButton label={label("profile.forgotPassword")} tone="secondary" onPress={() => open("reset")} /> : null}
    </Card> : null}
    {!session && entry === "reset" ? <Card>
      <AppText variant="heading">{label("profile.resetPassword")}</AppText>
      {emailField}
      <AppText>{label("lifecycle.resetRequestHelp")}</AppText>
      <PrimaryButton label={label("profile.sendResetLink")} busy={busy === "reset"} onPress={requestReset} />
    </Card> : null}
    {session && entry === "edit" ? <Card>
      <AppText variant="heading">{label("profile.editProfile")}</AppText>
      {nameField}
      <AppText variant="label">{messages.email}</AppText><AppText>{session.user.email}</AppText>
      <AppText variant="metadata">{label("profile.emailReadOnly")}</AppText>
      <PrimaryButton label={label("profile.saveProfile")} busy={Boolean(busy)} onPress={saveProfile} />
    </Card> : null}
    {session && entry === "change-password" ? <Card>
      <AppText variant="heading">{label("profile.changePassword")}</AppText>
      <PasswordField label={label("profile.currentPassword")} value={password} onChange={setPassword} disabled={Boolean(busy)} />
      <PasswordField label={label("profile.newPassword")} value={newPassword} onChange={setNewPassword} newPassword disabled={Boolean(busy)} />
      <PasswordField label={label("profile.confirmPassword")} value={confirmation} onChange={setConfirmation} newPassword disabled={Boolean(busy)} />
      <AppText variant="metadata">{messages.passwordTooShort}</AppText>
      <PrimaryButton label={label("profile.changePassword")} busy={Boolean(busy)} disabled={!hasCredential} onPress={changePassword} />
    </Card> : null}
    {session && entry === "delete" ? <Card>
      <AppText variant="heading">{label("profile.deleteAccount")}</AppText>
      <AppText>{label("lifecycle.deleteWarning")}</AppText>
      <AppText>{label("lifecycle.localDataRemains")}</AppText>
      {hasCredential ? <>
        <PasswordField label={label("profile.currentPassword")} value={password} onChange={setPassword} disabled={Boolean(busy)} />
        <PressableSurface accessibilityRole="checkbox" accessibilityState={{ checked: deleteConfirmed, disabled: Boolean(busy) }} disabled={Boolean(busy)} onPress={() => setDeleteConfirmed(value => !value)} style={styles.deleteAction}>
          <AppText variant="label">{deleteConfirmed ? "✓ " : "□ "}{label("lifecycle.deleteConfirm")}</AppText>
        </PressableSurface>
        <PrimaryButton label={label("lifecycle.deletePermanently")} busy={busy === "delete"} disabled={!deleteConfirmed || !password} onPress={deleteAccount} />
      </> : <StatusMessage>{label("lifecycle.reauthRequired")}</StatusMessage>}
    </Card> : null}
    {failure ? <StatusMessage tone="error">{failure === "invalid_credentials" && entry === "change-password" ? label("profile.currentPasswordIncorrect") : authFailureMessage(failure, locale, messages)}</StatusMessage> : null}
    {failure === "email_not_verified" && !session && entry === "sign-in" ? <PrimaryButton
      label={label("profile.resendVerification")}
      tone="secondary"
      busy={busy === "resend-verification"}
      disabled={Boolean(busy)}
      onPress={resendVerification}
    /> : null}
    {lifecycleFailure ? <StatusMessage tone="error">{label(lifecycleFailure)}</StatusMessage> : null}
    {notice ? <StatusMessage tone="success">{label(notice)}</StatusMessage> : null}
    {entry ? <PrimaryButton label={label("common.back")} tone="secondary" onPress={back} /> : null}
    {!session && entry ? <PrimaryButton label={messages.continueAsGuest} tone="secondary" onPress={leave} /> : null}
    <Link href="/saved" asChild><PrimaryButton label={messages.savedTrips} tone="secondary" /></Link>
  </Screen>;
}
function authFailureMessage(failure: NativeAuthErrorCode, locale: string, messages: ReturnType<typeof useNativeLocale>["messages"]): string {
  if (failure === "invalid_email") return messages.invalidEmail;
  if (failure === "password_too_short") return messages.passwordTooShort;
  if (failure === "password_too_long") return t(locale, "profile.passwordTooLong");
  if (failure === "password_mismatch") return t(locale, "profile.passwordMismatch");
  if (failure === "invalid_name") return t(locale, "profile.invalidName");
  if (failure === "current_password_required") return t(locale, "profile.currentPasswordRequired");
  if (failure === "account_exists") return messages.accountExists;
  if (failure === "email_not_verified") return t(locale, "profile.emailNotVerified");
  if (failure === "invalid_credentials") return messages.invalidCredentials;
  if (failure === "network") return messages.authNetworkError;
  return messages.authError;
}
const styles = StyleSheet.create({
  introduction: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  introductionText: { flex: 1, gap: spacing.xs },
  accountIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 56, justifyContent: "center", width: 56 },
  muted: { color: colors.textMuted },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, backgroundColor: colors.surface, ...typography.body },
  deleteAction: { minHeight: 48, justifyContent: "center", padding: spacing.sm },
  destructive: { color: colors.danger },
  socialIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  socialIconText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
});
