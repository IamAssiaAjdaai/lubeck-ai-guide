import { router, Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Card, PrimaryButton, Screen, StatusMessage } from "../../components/ui";
import { colors, radius, spacing, typography } from "../../design/tokens";
import { nativeAuthClient } from "../../lib/auth/client";
import { useNativeLocale } from "../../localization/LocaleProvider";

export default function AccountScreen() {
  const { messages } = useNativeLocale();
  const { data: session, isPending } = nativeAuthClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"sign-in" | "sign-up">();
  const [failed, setFailed] = useState(false);

  async function authenticate(mode: "sign-in" | "sign-up") {
    setBusy(mode);
    setFailed(false);
    try {
      const result = mode === "sign-in"
        ? await nativeAuthClient.signIn.email({ email, password })
        : await nativeAuthClient.signUp.email({
            email,
            password,
            name: email.split("@")[0] || "CITYWALK traveler",
          });
      setFailed(Boolean(result.error));
    } catch {
      setFailed(true);
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

      {isPending ? <AppText>{messages.loading}</AppText> : null}
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
          {failed ? <StatusMessage>{messages.authError}</StatusMessage> : null}
        </Card>
      )}
    </Screen>
  );
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
});
