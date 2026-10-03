import { nativeRowStyle, nativeTextBlock } from "../../design/rtlPresentation";
import { uxCopy } from "../../design/uxCopy";
import { t, type TranslationKey } from "@citywalk/i18n";
import { cityLaunches } from "@citywalk/traveler-core/cityAvailability";
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
import { nativeCityName } from "../../lib/displayNames";
import { useAccountWalks } from "../../hooks/useAccountWalks";
import { readCityUnlock } from "../../lib/cityUnlockAccess";
import { loadLocalTrips } from "../../lib/tripStorage";
import { loadSavedPlaces, loadSavedWalks } from "../../lib/walkStorage";
import {
  DEFAULT_TRAVELER_PREFERENCES,
  TRAVELER_WALK_DURATIONS,
  loadTravelerPreferences,
  saveTravelerPreferences,
  type TravelerPreferences,
  type TravelerWalkDuration,
} from "../../lib/travelerPreferences";
import { interestTags, type Interest, type WalkSettings } from "@citywalk/traveler-core/walkPlanner";

type Entry = "sign-in" | "sign-up" | "reset" | "edit" | "travel-style" | "change-password" | "delete";
type SocialProvider = "google" | "apple";
type Action = "sign-in" | "sign-up" | "edit" | "save-preferences" | "change-password" | "sign-out" | "reset" | "resend-verification" | "delete" | "social-google" | "social-apple" | "link-google" | "link-apple";

export default function AccountScreen() {
  const { locale, direction, messages } = useNativeLocale();
  const params = useLocalSearchParams<{ entry?: string; returnToWalk?: string; error?: string }>();
  const { data: session, isPending } = nativeAuthClient.useSession();
  const socialAuth = getNativeSocialAuthAvailability();
  const accountWalks = useAccountWalks();
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
  const [localActivity, setLocalActivity] = useState<{
    walkKeys: string[];
    citySlugs: string[];
    savedPlaces: number;
    loading: boolean;
    error: boolean;
  }>({ walkKeys: [], citySlugs: [], savedPlaces: 0, loading: true, error: false });
  const [passState, setPassState] = useState<"loading" | "free" | "active" | "unavailable">("loading");
  const [travelerPreferences, setTravelerPreferences] = useState<TravelerPreferences>(DEFAULT_TRAVELER_PREFERENCES);
  const [preferenceDraft, setPreferenceDraft] = useState<TravelerPreferences>(DEFAULT_TRAVELER_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
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
  useEffect(() => {
    let active = true;
    void Promise.all([loadSavedWalks(), loadLocalTrips(), loadSavedPlaces()])
      .then(([savedWalks, legacyTrips, savedPlaces]) => {
        if (!active) return;
        const walkKeys = [
          ...savedWalks.map((walk) => `${walk.citySlug}:${walk.id}`),
          ...legacyTrips.map((walk) => `${walk.citySlug}:${walk.id}`),
        ];
        const citySlugs = [
          ...savedWalks.map((walk) => walk.citySlug),
          ...legacyTrips.map((walk) => walk.citySlug),
          ...savedPlaces.map((place) => place.citySlug),
        ];
        setLocalActivity({
          walkKeys,
          citySlugs,
          savedPlaces: savedPlaces.length,
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (active) setLocalActivity((current) => ({ ...current, loading: false, error: true }));
      });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void readCityUnlock("lubeck", userId)
      .then((unlocked) => { if (active) setPassState(unlocked ? "active" : "free"); })
      .catch(() => { if (active) setPassState("unavailable"); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadTravelerPreferences(userId)
      .then((preferences) => {
        if (!active) return;
        setTravelerPreferences(preferences);
        setPreferenceDraft(preferences);
        setPreferencesLoading(false);
      })
      .catch(() => {
        if (active) setPreferencesLoading(false);
      });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 2800);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!params.error) return;
    const oauthError = params.error;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setNotice(undefined);
      setFailure(classifyNativeAuthError({ code: oauthError }));
      router.replace("/account");
    });
    return () => { active = false; };
  }, [params.error]);
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
        callbackURL: "citywalk://account",
        errorCallbackURL: "citywalk://account",
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
        callbackURL: "citywalk://account",
        errorCallbackURL: "citywalk://account",
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
  async function savePreferences() {
    if (!userId || busy) return;
    setBusy("save-preferences");
    setFailure(undefined);
    try {
      const saved = await saveTravelerPreferences(userId, preferenceDraft);
      if (!mounted.current) return;
      setTravelerPreferences(saved);
      setPreferenceDraft(saved);
      setEntry(undefined);
      setNotice("profile.preferencesSaved");
      void triggerCitywalkHaptic("success");
    } catch {
      if (mounted.current) setFailure("unknown");
    } finally {
      if (mounted.current) setBusy(undefined);
    }
  }
  function deleteAccount() {
    if (!session || !deleteConfirmed || !hasCredential) return;
    if (!password) { setFailure("current_password_required"); return; }
    void perform("delete", () => deleteNativeAccount(session.user.id, password), () => { setEntry(undefined); setNotice("lifecycle.deleted"); });
  }
  const localWalkKeys = new Set(localActivity.walkKeys);
  const walkKeys = new Set([
    ...accountWalks.walks.map((walk) => `${walk.citySlug}:${walk.id}`),
    ...localWalkKeys,
  ]);
  const citySlugs = new Set([
    ...accountWalks.walks.map((walk) => walk.citySlug),
    ...localActivity.citySlugs,
  ]);
  const activity = {
    cities: citySlugs.size,
    walks: walkKeys.size,
    saved: localActivity.savedPlaces,
    loading: accountWalks.loading || localActivity.loading,
    error: accountWalks.error || localActivity.error,
  };
  const lubeckName = nativeCityName("lubeck", cityLaunches.lubeck.name, locale);
  const isEmailEntry = !session && (entry === "sign-in" || entry === "sign-up");
  const label = (key: TranslationKey) => t(locale, key);
  const interestLabel = (interest: Interest) => label(({
    history: "categories.history",
    architecture: "categories.architecture",
    "hidden-gems": "categories.hidden-gems",
    nature: "categories.nature",
    food: "categories.food",
    culture: "categories.culture",
    family: "categories.family",
  } as const)[interest]);
  const walkingLabel = (walking: WalkSettings["walking"]) =>
    label(walking === "easy" ? "planner.easy" : walking === "long" ? "planner.long" : "planner.balanced");
  const durationLabel = (minutes: TravelerWalkDuration) =>
    label(minutes === 60 ? "planner.hour1" : minutes === 120 ? "planner.hour2" : minutes === 180 ? "planner.hour3" : "planner.halfDay");
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
      <View style={styles.profileHero}>
        <View style={styles.profileAvatar}>
          <NativeIcon ios="person.crop.circle.fill" android="account_circle" color={colors.primary} size={48} />
        </View>
        <AppText variant="title" style={styles.profileName}>{session.user.name}</AppText>
        <AppText variant="metadata" style={styles.profileEyebrow}>{label("profile.explorerTitle")}</AppText>
        {!activity.loading ? (
          <AppText variant="metadata" style={styles.muted}>
            {activity.cities} {label("profile.activityCities")} · {activity.walks} {label("profile.activityWalks")}
          </AppText>
        ) : null}
        <PrimaryButton compact label={label("profile.editProfile")} tone="secondary" onPress={() => open("edit")} />
      </View>

      <Card>
        <AppText variant="heading">{label("profile.yourTravelStyle")}</AppText>
        {preferencesLoading ? <CitywalkLoading compact label={uxCopy(locale).account} /> : <>
          <View style={styles.preferenceChips}>
            {travelerPreferences.interests.length ? travelerPreferences.interests.map((interest) => (
              <View key={interest} style={styles.preferenceTag}>
                <AppText variant="metadata" style={styles.preferenceTagText}>{interestLabel(interest)}</AppText>
              </View>
            )) : <AppText variant="metadata" style={styles.muted}>{label("profile.noPreferredInterests")}</AppText>}
          </View>
          <AppText variant="metadata" style={styles.muted}>
            {walkingLabel(travelerPreferences.walking)} · {durationLabel(travelerPreferences.typicalMinutes)}
          </AppText>
          <AppText variant="metadata" style={styles.muted}>{label("profile.travelStyleHelp")}</AppText>
          <PrimaryButton
            tone="secondary"
            label={label("profile.editPreferences")}
            onPress={() => {
              setPreferenceDraft(travelerPreferences);
              open("travel-style");
            }}
          />
        </>}
      </Card>

      <Card>
        <AppText variant="heading">{label("profile.yourActivity")}</AppText>
        {activity.loading ? <CitywalkLoading compact label={uxCopy(locale).account} /> : (
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <AppText variant="title">{activity.cities}</AppText>
              <AppText variant="metadata" style={styles.muted}>{label("profile.activityCities")}</AppText>
            </View>
            <View style={styles.metric}>
              <AppText variant="title">{activity.walks}</AppText>
              <AppText variant="metadata" style={styles.muted}>{label("profile.activityWalks")}</AppText>
            </View>
            <View style={styles.metric}>
              <AppText variant="title">{activity.saved}</AppText>
              <AppText variant="metadata" style={styles.muted}>{label("profile.activitySavedPlaces")}</AppText>
            </View>
          </View>
        )}
        {activity.error ? <AppText variant="metadata" style={styles.muted}>{label("profile.activityUnavailable")}</AppText> : null}
      </Card>

      <Card>
        <View style={styles.cardHeaderRow}>
          <AppText variant="heading">{label("profile.citywalkPass")}</AppText>
          {passState === "active" ? <AppText variant="metadata" style={styles.connected}>{label("profile.passActive")}</AppText> : null}
        </View>
        {passState === "loading" ? <CitywalkLoading compact label={uxCopy(locale).account} /> : <>
          <AppText variant="label">{passState === "active" ? label("profile.cityExplorerPass").replace("{city}", lubeckName) : passState === "free" ? label("profile.freePlan") : label("profile.passUnavailable")}</AppText>
          <AppText variant="metadata" style={styles.muted}>
            {passState === "active" ? label("profile.passActiveDescription") : passState === "free" ? label("profile.passFreeDescription") : label("profile.passUnavailableDescription")}
          </AppText>
          {passState !== "unavailable" ? (
            <Link href={{ pathname: "/city/[citySlug]", params: { citySlug: "lubeck" } }} asChild>
              <PrimaryButton tone="secondary" label={passState === "active" ? label("profile.openCity").replace("{city}", lubeckName) : label("profile.explorePass")} />
            </Link>
          ) : null}
        </>}
      </Card>

      <Card>
        <AppText variant="heading">{messages.account}</AppText>
        {credential?.userId !== userId ? <CitywalkLoading compact label={uxCopy(locale).account} /> : null}
        {credential?.userId === userId && credential?.status === "error" ? <>
          <StatusMessage>{messages.authNetworkError}</StatusMessage>
          <PrimaryButton label={messages.retry} tone="secondary" onPress={() => { setCredential(undefined); setProviderReload(value => value + 1); }} />
        </> : null}

        {socialAuth.apple ? (
          <View style={styles.accountRow}>
            <View style={styles.accountRowLabel}>{socialIcon("apple")}<AppText variant="label">Apple</AppText></View>
            {hasApple ? <AppText variant="metadata" style={styles.connected}>{label("profile.connected")}</AppText> :
              <PressableSurface accessibilityRole="button" accessibilityLabel={label("profile.connectApple")} style={styles.compactAction} disabled={Boolean(busy)} onPress={() => linkSocial("apple")}>
                <AppText variant="label" style={styles.actionText}>{label("profile.connect")}</AppText>
              </PressableSurface>}
          </View>
        ) : null}
        {socialAuth.google ? (
          <View style={styles.accountRow}>
            <View style={styles.accountRowLabel}>{socialIcon("google")}<AppText variant="label">Google</AppText></View>
            {hasGoogle ? <AppText variant="metadata" style={styles.connected}>{label("profile.connected")}</AppText> :
              <PressableSurface accessibilityRole="button" accessibilityLabel={label("profile.connectGoogle")} style={styles.compactAction} disabled={Boolean(busy)} onPress={() => linkSocial("google")}>
                <AppText variant="label" style={styles.actionText}>{label("profile.connect")}</AppText>
              </PressableSurface>}
          </View>
        ) : null}
        <View style={styles.accountRow}>
          <AppText variant="label">{messages.email}</AppText>
          <AppText variant="metadata" style={[styles.muted, styles.accountEmail]} numberOfLines={1}>{session.user.email}</AppText>
        </View>
        {hasCredential ? <PrimaryButton label={label("profile.changePassword")} tone="secondary" onPress={() => open("change-password")} /> : null}
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
    {session && entry === "travel-style" ? <Card>
      <AppText variant="heading">{label("profile.yourTravelStyle")}</AppText>
      <AppText variant="metadata" style={styles.muted}>{label("profile.travelStyleHelp")}</AppText>

      <AppText variant="label">{label("planner.interests")}</AppText>
      <View style={styles.preferenceChips}>
        {(Object.keys(interestTags) as Interest[]).map((interest) => {
          const selected = preferenceDraft.interests.includes(interest);
          return (
            <PressableSurface
              key={interest}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={[styles.preferenceChoice, selected && styles.preferenceChoiceSelected]}
              onPress={() => setPreferenceDraft((current) => ({
                ...current,
                interests: selected
                  ? current.interests.filter((value) => value !== interest)
                  : [...current.interests, interest],
              }))}
            >
              <AppText variant="metadata" style={selected ? styles.preferenceChoiceTextSelected : undefined}>
                {interestLabel(interest)}
              </AppText>
            </PressableSurface>
          );
        })}
      </View>

      <AppText variant="label">{label("profile.walkingPace")}</AppText>
      <View style={styles.preferenceChips}>
        {(["easy", "balanced", "long"] as const).map((walking) => {
          const selected = preferenceDraft.walking === walking;
          return (
            <PressableSurface
              key={walking}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.preferenceChoice, selected && styles.preferenceChoiceSelected]}
              onPress={() => setPreferenceDraft((current) => ({ ...current, walking }))}
            >
              <AppText variant="metadata" style={selected ? styles.preferenceChoiceTextSelected : undefined}>
                {walkingLabel(walking)}
              </AppText>
            </PressableSurface>
          );
        })}
      </View>

      <AppText variant="label">{label("profile.typicalWalk")}</AppText>
      <View style={styles.preferenceChips}>
        {TRAVELER_WALK_DURATIONS.map((typicalMinutes) => {
          const selected = preferenceDraft.typicalMinutes === typicalMinutes;
          return (
            <PressableSurface
              key={typicalMinutes}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.preferenceChoice, selected && styles.preferenceChoiceSelected]}
              onPress={() => setPreferenceDraft((current) => ({ ...current, typicalMinutes }))}
            >
              <AppText variant="metadata" style={selected ? styles.preferenceChoiceTextSelected : undefined}>
                {durationLabel(typicalMinutes)}
              </AppText>
            </PressableSurface>
          );
        })}
      </View>

      <PrimaryButton label={label("profile.savePreferences")} busy={busy === "save-preferences"} onPress={() => void savePreferences()} />
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
  if (failure === "social_account_in_use") return t(locale, "profile.socialAccountInUse");
  if (failure === "invalid_credentials") return messages.invalidCredentials;
  if (failure === "network") return messages.authNetworkError;
  return messages.authError;
}
const styles = StyleSheet.create({
  introduction: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  profileHero: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  profileAvatar: { alignItems: "center", justifyContent: "center", width: 84, height: 84, borderRadius: radius.pill, backgroundColor: colors.primarySoft, marginBottom: spacing.xs },
  profileName: { textAlign: "center" },
  profileEyebrow: { color: colors.primary, fontWeight: "700" },
  metrics: { flexDirection: "row", gap: spacing.sm },
  preferenceChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preferenceTag: { borderRadius: radius.pill, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  preferenceTagText: { color: colors.primary, fontWeight: "700" },
  preferenceChoice: { minHeight: 38, justifyContent: "center", borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  preferenceChoiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  preferenceChoiceTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  metric: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  accountRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  accountRowLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  accountEmail: { flex: 1, textAlign: "right" },
  compactAction: { minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.sm },
  actionText: { color: colors.primary },
  connected: { color: colors.success, fontWeight: "700" },
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
