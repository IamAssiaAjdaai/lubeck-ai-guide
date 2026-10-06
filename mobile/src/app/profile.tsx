import { t, type TranslationKey } from "@citywalk/i18n";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { NativeIcon } from "../components/NativeIcon";
import { AppText, PrimaryButton, PressableSurface, Screen } from "../components/ui";
import { CitywalkLoading } from "../components/CitywalkLoading";
import { colors, radius, spacing } from "../design/tokens";
import { useAccountWalks } from "../hooks/useAccountWalks";
import { usePremiumAccess, type PremiumAccessState } from "../hooks/usePremiumAccess";
import { nativeAuthClient } from "../lib/auth/client";
import { loadLocalTrips } from "../lib/tripStorage";
import {
  DEFAULT_TRAVELER_STYLE,
  loadTravelerStyle,
  type TravelerStyle,
} from "../lib/travelerStyle";
import { loadSavedPlaces, loadSavedWalks } from "../lib/walkStorage";
import { useNativeLocale } from "../localization/LocaleProvider";

type LocalActivity = Readonly<{
  walkKeys: readonly string[];
  citySlugs: readonly string[];
  savedPlaces: number;
  loading: boolean;
}>;

type EntitlementPresentation = Readonly<{
  detail: string;
  color: string;
}>;

function entitlementPresentation(
  state: PremiumAccessState,
  label: (key: TranslationKey) => string,
): EntitlementPresentation {
  switch (state.status) {
    case "premium":
      return { detail: label("profile.passActive"), color: colors.success };
    case "free":
    case "guest":
      return { detail: label("profile.freePlan"), color: colors.primary };
    case "unavailable":
      return { detail: label("profile.passUnavailable"), color: colors.textMuted };
    case "loading":
      return { detail: label("loading.account"), color: colors.textMuted };
  }
}

export default function ProfileScreen() {
  const { locale, direction, messages } = useNativeLocale();
  const { data: session, isPending } = nativeAuthClient.useSession();
  const accountWalks = useAccountWalks();
  const premium = usePremiumAccess();
  const userId = session?.user.id;
  const copy = walkCopy(locale);
  const label = (key: TranslationKey) => t(locale, key);
  const premiumPresentation = entitlementPresentation(premium, label);
  const [travelerStyle, setTravelerStyle] = useState<TravelerStyle>(DEFAULT_TRAVELER_STYLE);
  const [localActivity, setLocalActivity] = useState<LocalActivity>({
    walkKeys: [],
    citySlugs: [],
    savedPlaces: 0,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    void loadTravelerStyle(userId).then((style) => {
      if (active) setTravelerStyle(style);
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadSavedWalks(), loadLocalTrips(), loadSavedPlaces()])
      .then(([savedWalks, legacyTrips, savedPlaces]) => {
        if (!active) return;
        setLocalActivity({
          walkKeys: [
            ...savedWalks.map((walk) => `${walk.citySlug}:${walk.id}`),
            ...legacyTrips.map((walk) => `${walk.citySlug}:${walk.id}`),
          ],
          citySlugs: [
            ...savedWalks.map((walk) => walk.citySlug),
            ...legacyTrips.map((walk) => walk.citySlug),
            ...savedPlaces.map((place) => place.citySlug),
          ],
          savedPlaces: savedPlaces.length,
          loading: false,
        });
      })
      .catch(() => {
        if (active) setLocalActivity((current) => ({ ...current, loading: false }));
      });
    return () => { active = false; };
  }, [userId]);

  const walkKeys = new Set([
    ...accountWalks.walks.map((walk) => `${walk.citySlug}:${walk.id}`),
    ...localActivity.walkKeys,
  ]);
  const citySlugs = new Set([
    ...accountWalks.walks.map((walk) => walk.citySlug),
    ...localActivity.citySlugs,
  ]);
  const activityLoading = accountWalks.loading || localActivity.loading;

  return (
    <Screen>
      <Stack.Screen options={{ title: label("navigation.profile") }} />

      <View style={styles.titleRow}>
        <AppText variant="screenTitle">{label("navigation.profile")}</AppText>
      </View>

      {isPending ? <CitywalkLoading compact label={label("navigation.profile")} /> : null}

      {!isPending && !session ? (
        <View style={styles.guest} testID="profile-guest-state">
          <View style={styles.avatar}>
            <NativeIcon ios="person.crop.circle.fill" android="account_circle" color={colors.primary} size={42} />
          </View>
          <AppText variant="title">{label("profile.guestFirst")}</AppText>
          <AppText variant="metadata" style={styles.secondary}>{label("profile.accountValue")}</AppText>
          <View style={styles.guestActions}>
            <PrimaryButton
              label={messages.signIn}
              onPress={() => router.push({ pathname: "/account", params: { entry: "sign-in" } })}
            />
            <PrimaryButton
              label={messages.signUp}
              tone="secondary"
              onPress={() => router.push({ pathname: "/account", params: { entry: "sign-up" } })}
            />
          </View>
        </View>
      ) : null}

      {session ? (
        <>
          <View style={styles.identity} testID="profile-identity">
            <View style={styles.avatar}>
              <NativeIcon ios="person.crop.circle.fill" android="account_circle" color={colors.primary} size={48} />
            </View>
            <View style={styles.identityText}>
              <AppText variant="title" numberOfLines={1}>{session.user.name}</AppText>
              <AppText variant="metadata" style={styles.explorer}>{label("profile.explorerTitle")}</AppText>
              <AppText variant="metadata" style={styles.secondary} numberOfLines={1}>{session.user.email}</AppText>
            </View>
          </View>

          {activityLoading ? <CitywalkLoading compact label={label("profile.yourActivity")} /> : (
            <View style={styles.metrics} testID="profile-activity">
              <Metric value={citySlugs.size} label={label("profile.activityCities")} />
              <Metric value={walkKeys.size} label={label("profile.activityWalks")} />
              <Metric value={localActivity.savedPlaces} label={label("profile.activitySavedPlaces")} />
            </View>
          )}

          <View style={styles.section} testID="profile-travel-style">
            <View style={styles.sectionHeading}>
              <AppText variant="heading">{label("profile.travelStyle")}</AppText>
              <AppText variant="metadata" style={styles.secondary}>
                {label(`profile.walking_${travelerStyle.walking}` as TranslationKey)} · {label("profile.typicalWalkMinutes").replace("{minutes}", String(travelerStyle.minutes))}
              </AppText>
            </View>
            <View style={styles.chips}>
              {travelerStyle.interests.map((interest) => (
                <View key={interest} style={styles.chip}>
                  <AppText variant="metadata">
                    {label(`profile.interest_${interest.replace("-", "_")}` as TranslationKey)}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.menu} testID="profile-menu">
            <ProfileRow
              direction={direction}
              ios="suitcase.rolling"
              android="luggage"
              title={copy.trips}
              detail={`${walkKeys.size} ${label("profile.activityWalks")}`}
              onPress={() => router.navigate({ pathname: "/saved", params: { view: "trips" } })}
            />
            <ProfileRow
              direction={direction}
              ios="heart"
              android="favorite_border"
              title={copy.saved}
              detail={`${localActivity.savedPlaces} ${label("profile.activitySavedPlaces")}`}
              onPress={() => router.navigate("/saved")}
            />
            <ProfileRow
              direction={direction}
              ios={premium.active ? "sparkles" : "lock"}
              android={premium.active ? "auto_awesome" : "lock"}
              iconColor={premiumPresentation.color}
              title="CITYWALK Premium"
              detail={premiumPresentation.detail}
              onPress={() => router.navigate("/premium")}
            />
            <ProfileRow
              direction={direction}
              ios="person.crop.circle"
              android="person_outline"
              title={messages.account}
              detail={session.user.email}
              onPress={() => router.navigate("/account")}
              last
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Metric({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <View style={styles.metric}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="metadata" style={styles.secondary}>{label}</AppText>
    </View>
  );
}

function ProfileRow({
  direction,
  ios,
  android,
  title,
  detail,
  iconColor = colors.primary,
  onPress,
  last = false,
}: Readonly<{
  direction: "ltr" | "rtl";
  ios: Parameters<typeof NativeIcon>[0]["ios"];
  android: Parameters<typeof NativeIcon>[0]["android"];
  title: string;
  detail?: string;
  iconColor?: string;
  onPress: () => void;
  last?: boolean;
}>) {
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.menuRow, !last && styles.menuDivider]}
    >
      <View style={styles.rowIcon}>
        <NativeIcon ios={ios} android={android} color={iconColor} size={21} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="label">{title}</AppText>
        {detail ? <AppText variant="metadata" style={styles.secondary} numberOfLines={1}>{detail}</AppText> : null}
      </View>
      <NativeIcon
        ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
        android={direction === "rtl" ? "chevron_left" : "chevron_right"}
        color={colors.textMuted}
        size={16}
      />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  titleRow: { paddingTop: spacing.xs },
  guest: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  guestActions: { alignSelf: "stretch", gap: spacing.sm, paddingTop: spacing.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  identityText: { flex: 1, minWidth: 0, gap: spacing.xs },
  avatar: { width: 68, height: 68, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  explorer: { color: colors.primary, fontWeight: "700" },
  secondary: { color: colors.textMuted },
  metrics: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm },
  section: { gap: spacing.sm, paddingVertical: spacing.md },
  sectionHeading: { gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  menu: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  menuRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 32, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
});
