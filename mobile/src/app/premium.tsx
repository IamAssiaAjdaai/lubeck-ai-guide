import { t } from "@citywalk/i18n";
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
import { useNativeLocale } from "../localization/LocaleProvider";

export default function PremiumScreen() {
  const { data: session, isPending } = nativeAuthClient.useSession();
  const { locale } = useNativeLocale();

  return (
    <Screen>
      <Stack.Screen options={{ title: t(locale, "premium.title") }} />

      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <NativeIcon
            ios="sparkles"
            android="auto_awesome"
            color={colors.primary}
            size={18}
          />
          <AppText variant="caption" style={styles.eyebrowText}>
            {t(locale, "premium.eyebrow")}
          </AppText>
        </View>
        <AppText variant="screenTitle">{t(locale, "premium.startLiveWalk")}</AppText>
        <AppText variant="metadata" style={styles.secondary}>
          {t(locale, "premium.stayGuided")}
        </AppText>
      </View>

      <View style={styles.benefits} testID="premium-benefits">
        <Benefit text={t(locale, "premium.benefitLockScreen")} />
        <Benefit text={t(locale, "premium.benefitEta")} />
        <Benefit text={t(locale, "premium.benefitAdapt")} />
        <Benefit text={t(locale, "premium.benefitBackOnTime")} />
        <Benefit text={t(locale, "premium.benefitAudioAi")} />
      </View>

      {!premiumEnabled() ? (
        <>
          <AppText variant="metadata" style={styles.secondary}>
            {t(locale, "premium.subscriptionsDisabled")}
          </AppText>
          <ContinueBasicRoute />
        </>
      ) : isPending ? (
        <AppText variant="metadata" style={styles.secondary}>
          {t(locale, "premium.checkingAccount")}
        </AppText>
      ) : session?.user.id ? (
        <>
          <RevenueCatPremiumCard account={session.user.id} />
          <ContinueBasicRoute />
        </>
      ) : (
        <>
          <AppText variant="metadata" style={styles.secondary}>
            {t(locale, "premium.signInBeforePurchase")}
          </AppText>
          <PrimaryButton
            label={t(locale, "profile.signIn")}
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
  const { locale } = useNativeLocale();
  const label = t(locale, "premium.continueBasicRoute");
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.continueBasic}
      onPress={() => router.back()}
    >
      <AppText variant="label" style={styles.continueBasicText}>
        {label}
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
