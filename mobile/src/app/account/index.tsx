import { Link, router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Card, PrimaryButton, Screen, StatusMessage } from "../../components/ui";
import { CitywalkLoading } from "../../components/CitywalkLoading";
import { colors, radius, spacing, typography } from "../../design/tokens";
import { nativeAuthClient } from "../../lib/auth/client";
import {
  classifyNativeAuthError,
  type NativeAuthErrorCode,
  validateNativeAuthInput,
} from "../../lib/auth/errors";
import { loadLocalTrips, type LocalSavedTrip } from "../../lib/tripStorage";
import { createMobileTripPlaceParams } from "../../lib/tripNavigation";
import { useNativeLocale } from "../../localization/LocaleProvider";

export default function AccountScreen() {
  const { locale, messages } = useNativeLocale();
  const { data: session, isPending } = nativeAuthClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"sign-in" | "sign-up">();
  const [failure, setFailure] = useState<NativeAuthErrorCode>();
  const [notice, setNotice] = useState<string>();
  const [savedTrips, setSavedTrips] = useState<readonly LocalSavedTrip[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadLocalTrips().then((trips) => {
      if (active) setSavedTrips(trips);
    });
    return () => { active = false; };
  }, []));

  async function authenticate(mode: "sign-in" | "sign-up") {
    const normalizedEmail = email.trim();
    const validationFailure = validateNativeAuthInput(normalizedEmail, password);
    if (validationFailure) {
      setFailure(validationFailure);
      setNotice(undefined);
      return;
    }
    setBusy(mode);
    setFailure(undefined);
    setNotice(undefined);
    try {
      const result = mode === "sign-in"
        ? await nativeAuthClient.signIn.email({ email: normalizedEmail, password })
        : await nativeAuthClient.signUp.email({
            email: normalizedEmail,
            password,
            name: normalizedEmail.split("@")[0] || "CITYWALK traveler",
          });
      if (result.error) {
        setFailure(classifyNativeAuthError(result.error));
        return;
      }
      if (mode === "sign-up") setNotice(messages.accountCreated);
    } catch {
      setFailure("network");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: messages.account }} />
      <AppText variant="title">{messages.account}</AppText>
      <AppText>{messages.guestMode}</AppText>
      <PrimaryButton label={messages.continueAsGuest} onPress={() => router.back()} />

      {isPending ? <CitywalkLoading compact /> : null}
      {session ? (
        <Card>
          <AppText variant="heading">{messages.signedIn}</AppText>
          <AppText>{session.user.email}</AppText>
          <PrimaryButton label={messages.signOut} onPress={() => void nativeAuthClient.signOut()} />
        </Card>
      ) : (
        <Card>
          <TextInput
            accessibilityLabel={messages.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder={messages.email}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel={messages.password}
            autoCapitalize="none"
            autoComplete="password"
            placeholder={messages.password}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <View style={styles.actions}>
            <PrimaryButton label={messages.signIn} busy={busy === "sign-in"} onPress={() => void authenticate("sign-in")} style={styles.action} />
            <PrimaryButton label={messages.signUp} busy={busy === "sign-up"} onPress={() => void authenticate("sign-up")} style={styles.action} />
          </View>
          {failure ? <StatusMessage>{authFailureMessage(failure, messages)}</StatusMessage> : null}
          {notice ? <StatusMessage>{notice}</StatusMessage> : null}
        </Card>
      )}

      <View style={styles.savedTrips}>
        <AppText variant="heading">{messages.savedTrips}</AppText>
        {savedTrips.length === 0 ? <AppText>{messages.noSavedTrips}</AppText> : null}
        {savedTrips.map((trip) => (
          <Card key={trip.id}>
            <AppText variant="label">{trip.citySlug}</AppText>
            <AppText variant="caption" style={styles.savedMetadata}>
              {trip.stopSlugs.length} {messages.stops} · {trip.totalMinutes} {messages.minutes} · {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
              }).format(new Date(trip.savedAt))}
            </AppText>
            <Link
              href={{
                pathname: "/city/[citySlug]/place/[placeSlug]",
                params: createMobileTripPlaceParams({
                  id: trip.id,
                  citySlug: trip.citySlug,
                  stopSlugs: trip.stopSlugs,
                  source: "saved",
                }, 0),
              }}
              asChild
            >
              <PrimaryButton label={messages.resumeTrip} />
            </Link>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function authFailureMessage(
  failure: NativeAuthErrorCode,
  messages: ReturnType<typeof useNativeLocale>["messages"],
): string {
  if (failure === "invalid_email") return messages.invalidEmail;
  if (failure === "password_too_short") return messages.passwordTooShort;
  if (failure === "account_exists") return messages.accountExists;
  if (failure === "invalid_credentials") return messages.invalidCredentials;
  if (failure === "network") return messages.authNetworkError;
  return messages.authError;
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  actions: { gap: spacing.sm },
  action: { width: "100%" },
  savedTrips: { gap: spacing.sm },
  savedMetadata: { color: colors.textMuted },
});
