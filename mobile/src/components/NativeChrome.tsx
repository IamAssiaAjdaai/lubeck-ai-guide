import { Image } from "expo-image";
import {
  useLocalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { colors, layout, spacing, typography } from "../design/tokens";
import { citywalkBrand } from "../design/brand";
import { useNativeLocale } from "../localization/LocaleProvider";
import { LocaleSelector } from "./LocaleSelector";
import { NativeIcon } from "./NativeIcon";
import { activeNativeTab, tabRootKey, useTabScrollCoordinator, logTabPress } from "../lib/tabNavigation";

export function NativeBrand({ onBack, variant }: { onBack?: () => void; variant?: "city-hub" }) {
  const router = useRouter(),
    path = usePathname();
  const { locale, direction } = useNativeLocale();
  const nested = path !== "/" && path !== "/saved" && path !== "/profile";
  return (
    <View accessibilityRole="header" testID="native-header" style={[styles.brand, nested && styles.compactBrand, variant === "city-hub" && styles.hubBrand, { direction }]}>
      {nested ? (
        <Pressable accessibilityRole="button" accessibilityLabel={walkCopy(locale).back}
          onPress={onBack ?? (() => router.canGoBack() ? router.back() : router.replace("/"))}
          style={[styles.back, variant === "city-hub" && { minHeight: 44 }]}>
          <NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"}
            android={direction === "rtl" ? "chevron_right" : "chevron_left"} color={colors.primary} />
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="link" accessibilityLabel={citywalkBrand.name} onPress={() => router.navigate("/")}
        style={[styles.wordmark, { direction: "ltr" }]}>
        <Image source={require("../../assets/images/citywalk-mark.svg")} style={variant === "city-hub" ? styles.hubMark : nested ? styles.compactMark : styles.mark} contentFit="contain" />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.name, nested && styles.compactName, variant === "city-hub" && styles.hubName]}>{citywalkBrand.name}</Text>
      </Pressable>
      <LocaleSelector showLabel={!nested} />
    </View>
  );
}
export function NativeBottomNavigation({ onScrollToTop, labelMaxFontSizeMultiplier, labelFontScale = 1 }: { onScrollToTop: () => void; labelMaxFontSizeMultiplier?: number; labelFontScale?: number }) {
  const labelScale = labelMaxFontSizeMultiplier ? Math.min(labelFontScale, labelMaxFontSizeMultiplier) : undefined;
  const { locale, direction } = useNativeLocale(),
    t = walkCopy(locale);
  const router = useRouter(),
    path = usePathname();
  const { citySlug, view, section } = useLocalSearchParams<{
    citySlug?: string;
    view?: string;
    section?: string;
  }>();
  const active = activeNativeTab(path, { section, view });
  const scrollCoordinator = useTabScrollCoordinator();
  const items = [
    { key: "home", label: t.home, ios: "house", android: "home", href: "/" },
    {
      key: "explore",
      label: t.explore,
      ios: "safari",
      android: "explore",
      href: citySlug
        ? {
            pathname: "/city/[citySlug]/explore",
            params: { citySlug },
          }
        : "/?section=cities",
    },
    {
      key: "trips",
      label: t.trips,
      ios: "suitcase.rolling",
      android: "luggage",
      href: "/saved?view=trips",
    },
    {
      key: "saved",
      label: t.saved,
      ios: "heart",
      android: "favorite_border",
      href: "/saved",
    },
    {
      key: "profile",
      label: t.profile,
      ios: "person.crop.circle",
      android: "person_outline",
      href: "/profile",
    },
  ] as const;
  return (
    <View style={[styles.navigation, { direction }]} accessibilityRole="tablist">
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active === item.key }}
          onPress={() => {
            scrollCoordinator?.clear();
            if (active !== item.key) {
              logTabPress(item.key, false, "navigate");
              router.navigate(item.href as Href);
              return;
            }
            const root = item.key === "explore" && citySlug
              ? `/city/${citySlug}/explore`
              : item.key === "profile" ? "/profile"
              : item.key === "home" || item.key === "explore" ? `/:${item.key}`
              : `/saved:${item.key}`;
            if (tabRootKey(path, { section, view }) === root) {
              logTabPress(item.key, true, "scroll-top");
              onScrollToTop();
            } else {
              logTabPress(item.key, true, "return-root-and-scroll-top");
              scrollCoordinator?.request(root);
              router.dismissTo(item.href as Href);
            }
          }}
          style={styles.tab}
        >
          <NativeIcon
            ios={item.ios}
            android={item.android}
            size={25}
            color={active === item.key ? colors.primary : colors.textMuted}
          />
          <Text
            adjustsFontSizeToFit={false}
            maxFontSizeMultiplier={labelMaxFontSizeMultiplier}
            allowFontScaling={labelScale === undefined}
            numberOfLines={labelScale === undefined ? undefined : 2}
            style={[
              styles.tabLabel,
              labelScale !== undefined && { fontSize: typography.caption.fontSize * labelScale, lineHeight: typography.caption.lineHeight * labelScale },
              { writingDirection: direction, ...(direction === "rtl" ? { lineHeight: 19 } : {}) },
              active === item.key && { color: colors.primary },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  back: {
    minHeight: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  brand: {
    minHeight: 60,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  hubBrand: { minHeight: 48, gap: 10 },
  hubMark: { width: 28, height: 39 },
  hubName: { color: "#09234D", fontSize: 18, lineHeight: 24, letterSpacing: 1.8, fontWeight: "600" },
  compactBrand: { minHeight: 48, gap: spacing.xs },
  compactMark: { width: 22, height: 30 },
  compactName: { fontSize: 15, letterSpacing: 1.2 },
  wordmark: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  mark: { width: 30, height: 42 },
  name: { flexShrink: 1, color: citywalkBrand.colors.navy, fontSize: 18, fontWeight: "600", letterSpacing: 1.8 },
  navigation: {
    flexShrink: 0,
    width: "100%",
    maxWidth: 576,
    alignSelf: "center",
    backgroundColor: colors.surface,
    minHeight: layout.navigationHeight,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tabLabel: {
    width: "100%",
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});
