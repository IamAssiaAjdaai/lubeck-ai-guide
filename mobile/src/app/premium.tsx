import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { RevenueCatPremiumCard } from "../components/RevenueCatPremiumCard";
import { NativeIcon } from "../components/NativeIcon";
import {
  AppText,
  PressableSurface,
  PrimaryButton,
  Screen,
} from "../components/ui";
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
          <NativeIcon
            ios="sparkles"
            android="auto_awesome"
            color={colors.primary}
            size={18}
          />
          <AppText variant="caption" style={styles.eyebrowText}>
            CITYWALK PREMIUM
          </AppText>
        </View>
        <AppText variant="screenTitle">Start Live Walk</AppText>
        <AppText variant="metadata" style={styles.secondary}>
          Stay guided while you move.
        </AppText>
      </View>

      <View style={styles.benefits} testID="premium-benefits">
        <Benefit text="Next stop on your Lock Screen" />
        <Benefit text="Live ETA and remaining time" />
        <Benefit text="Shorten or adapt your route" />
        <Benefit text="Get back on time" />
        <Benefit text="Premium audio & AI guide" />
      </View>

      {!premiumEnabled() ? (
        <>
          <AppText variant="metadata" style={styles.secondary}>
            Premium subscriptions are not enabled in this build yet. Your basic CITYWALK route still works.
          </AppText>
          <ContinueBasicRoute />
        </>
      ) : isPending ? (
        <AppText variant="metadata" style={styles.secondary}>
          Checking your CITYWALK account…
        </AppText>
      ) : session?.user.id ? (
        <>
          <RevenueCatPremiumCard account={session.user.id} />
          <ContinueBasicRoute />
        </>
      ) : (
        <>
          <AppText variant="metadata" style={styles.secondary}>
            Sign in before purchasing or restoring Premium.
          </AppText>
          <PrimaryButton
            label="Sign in"
            onPress={() =>
              router.push({ pathname: "/account", params: { entry: "sign-in" } })
            }
          />
          <ContinueBasicRoute />
        </>
      )}
    </Screen>
  );
}

function ContinueBasicRoute() {
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel="Continue with basic route"
      style={styles.continueBasic}
      onPress={() => router.back()}
    >
      <AppText variant="label" style={styles.continueBasicText}>
        Continue with basic route
      </AppText>
    </PressableSurface>
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
  hero: { gap: spacing.sm },
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
  secondary: { color: colors.textMuted },
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
  continueBasic: {
    minHeight: 40,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  continueBasicText: { color: colors.primary },
});
