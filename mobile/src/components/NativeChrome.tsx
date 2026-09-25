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
import { useNativeLocale } from "../localization/LocaleProvider";
import { LocaleSelector } from "./LocaleSelector";
import { NativeIcon } from "./NativeIcon";
import { activeNativeTab, tabRootKey, useTabScrollCoordinator } from "../lib/tabNavigation";

export function NativeBrand({ onBack }: { onBack?: () => void }) {
  const router = useRouter(),
    path = usePathname();
  const { locale, direction } = useNativeLocale();
  return (
    <View>
      <View style={[styles.brand, { direction }]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="CITYWALK"
          onPress={() => router.navigate("/")}
          style={[styles.wordmark, { direction: "ltr" }]}
        >
          <Image
            source={require("../../assets/images/citywalk-mark.svg")}
            style={styles.mark}
            contentFit="contain"
          />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.name}>CITYWALK</Text>
        </Pressable>
        {path === "/" ? (
          <LocaleSelector showLabel />
        ) : (
          <Text style={styles.motto}>
            {"CITIES\nSTORIES\nPEOPLE\nEVERYWHERE\n—"}
          </Text>
        )}
      </View>
      {path !== "/" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={walkCopy(locale).back}
          onPress={
            onBack ??
            (() => (router.canGoBack() ? router.back() : router.replace("/")))
          }
          style={styles.back}
        >
          <NativeIcon
            ios={direction === "rtl" ? "chevron.right" : "chevron.left"}
            android={direction === "rtl" ? "chevron_right" : "chevron_left"}
            color={colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
export function NativeBottomNavigation() {
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
            pathname: "/city/[citySlug]",
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
      href: "/account",
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
              router.navigate(item.href as Href);
              return;
            }
            const root = item.key === "explore" && citySlug
              ? `/city/${citySlug}`
              : item.key === "profile" ? "/account"
              : item.key === "home" || item.key === "explore" ? `/:${item.key}`
              : `/saved:${item.key}`;
            scrollCoordinator?.request(root);
            if (tabRootKey(path, { section, view }) !== root)
              router.dismissTo(item.href as Href);
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
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[
              styles.tabLabel,
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
    minHeight: 44,
    width: 44,
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  brand: {
    minHeight: 68,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  wordmark: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  mark: { width: 40, height: 42 },
  name: { flexShrink: 1, color: "#183F67", fontSize: 19, fontWeight: "600", letterSpacing: 2 },
  motto: {
    color: colors.textSubtle,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 1.4,
    writingDirection: "ltr",
  },
  navigation: {
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
