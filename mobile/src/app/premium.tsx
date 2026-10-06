import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { RevenueCatPremiumCard } from "../components/RevenueCatPremiumCard";
import { NativeIcon } from "../components/NativeIcon";
import { AppText, PrimaryButton, Screen } from "../components/ui";
import { colors, spacing } from "../design/tokens";
import { nativeAuthClient } from "../lib/auth/client";
import { premiumEnabled } from "../lib/revenueCatPremiumCore";

export default function PremiumScreen() {
  const { data: session, isPending } = nativeAuthClient.useSession();

  return (
    <Screen>
      <Stack.Screen options={{ title: "CITYWALK Premium" }} />

      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <NativeIcon ios="sparkles" android="auto_awesome" color={colors.primary} size={18} />
          <AppText variant="caption" style={styles.eyebrowText}>
            CITYWALK PREMIUM
          </AppText>
        </View>
        <AppText variant="screenTitle">Stay guided while you move.</AppText>
        <AppText variant="metadata" style={styles.secondary}>
          Turn your planned route into a live city guide that adapts around your time and walk.
        </AppText>
      </View>

      <View style={styles.benefits}>
        <Benefit text="Next stop and progress while you walk" />
        <Benefit text="Live ETA and remaining time" />
        <Benefit text="Shorten or adapt your route" />
        <Benefit text="Get back on time" />
        <Benefit text="Premium audio and AI guidance" />
      </View>

      {!premiumEnabled() ? (
        <>
          <AppText variant="metadata" style={styles.secondary}>
            Premium subscriptions are not enabled in this build yet. Your basic CITYWALK route still works.
          </AppText>
          <PrimaryButton label="Back to my route" tone="secondary" onPress={() => router.back()} />
        </>
      ) : isPending ? (
        <AppText variant="metadata" style={styles.secondary}>
          Checking your CITYWALK account…
        </AppText>
      ) : session?.user.id ? (
        <RevenueCatPremiumCard account={session.user.id} />
      ) : (
        <>
          <AppText variant="metadata" style={styles.secondary}>
            Sign in before purchasing or restoring Premium.
          </AppText>
          <PrimaryButton
            label="Sign in"
            onPress={() => router.push({ pathname: "/account", params: { entry: "sign-in" } })}
          />
          <PrimaryButton label="Continue with basic route" tone="secondary" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

function Benefit({ text }: Readonly<{ text: string }>) {
  return (
    <View style={styles.benefitRow}>
      <NativeIcon ios="checkmark" android="check" color={colors.success} size={16} />
      <AppText variant="metadata" style={styles.benefitText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  eyebrowText: {
    color: colors.primary,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  secondary: {
    color: colors.textMuted,
  },
  benefits: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  benefitText: {
    color: colors.text,
    flex: 1,
  },
});
