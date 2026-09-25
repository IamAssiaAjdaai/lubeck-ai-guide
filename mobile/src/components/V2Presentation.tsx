import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { discoveryCopy } from "../design/discoveryCopy";
import { walkCopy, walkCategoryLabel } from "@citywalk/traveler-core/walkCopy";
import type { WalkBuildStage } from "@citywalk/traveler-core/walkPlanner";
import type { PublicPlaceCard } from "../lib/api/contracts";
import { citywalkApi } from "../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../lib/api/media";
import { useNativeLocale } from "../localization/LocaleProvider";
import { useReducedMotion } from "../lib/motion";
import { colors, layout, radius, shadows, spacing } from "../design/tokens";
import { AppText, PressableSurface, PrimaryButton } from "./ui";
import { NativeContentImage } from "./NativeContentImage";
import { NativeIcon } from "./NativeIcon";

export function V2Hero({
  title,
  subtitle,
  city = false,
  compact = false,
  children,
}: {
  title: string;
  subtitle?: string;
  city?: boolean;
  compact?: boolean;
  children?: ReactNode;
}) {
  const { direction } = useNativeLocale();
  return (
    <View
      style={[
        styles.hero,
        city && styles.cityHero,
        compact && styles.compactHero,
        { direction },
      ]}
    >
      <Image
        source={require("../../assets/images/citywalk-waterfront.webp")}
        contentFit="cover"
        style={[
          styles.heroArt,
          {
            transform: [{ scaleX: direction === "rtl" ? -1 : 1 }],
          },
        ]}
        accessible={false}
      />
      <View style={styles.heroCopy}>
      {children}
      <AppText variant={city ? "hero" : "screenTitle"} style={styles.heroTitle}>
        {title}
      </AppText>
      {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
    </View>
  );
}
export function StepProgress({ step, label }: { step: number; label: string }) {
  return (
    <View style={styles.progress}>
      <AppText variant="caption" style={styles.muted}>
        {label}
      </AppText>
      <View style={styles.dots}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.dot, n <= step && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}
export function MetricSummary({
  items,
}: {
  items: readonly { label: string; value: string; icon?: ReactNode }[];
}) {
  return (
    <View style={styles.metrics}>
      {items.map((item, i) => (
        <View
          key={item.label}
          style={[styles.metric, i > 0 && styles.metricDivider]}
        >
          <View style={styles.metricValue}>
            {item.icon}
            <AppText variant="label" style={styles.metricText}>
              {item.value}
            </AppText>
          </View>
          <AppText variant="caption" style={styles.muted}>
            {item.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}
export function V2Itinerary({
  places,
  citySlug,
  interactive = true,
}: {
  places: readonly PublicPlaceCard[];
  citySlug: string;
  interactive?: boolean;
}) {
  const { locale, direction } = useNativeLocale(),
    t = walkCopy(locale);
  return (
    <View style={styles.itinerary}>
      {places.map((place, index) => {
        const url = selectImageUrl(
          selectPrimaryImageMedia(place.media),
          place.image,
          place.imageVariants,
          "thumbnail",
        );
        const row = (
          <View style={styles.itineraryRow}>
            <View style={styles.number}>
              <AppText style={styles.numberText}>{index + 1}</AppText>
            </View>
            <NativeContentImage
              source={url ? { uri: citywalkApi.resolveUrl(url) } : undefined}
              fallbackSource={
                place.image
                  ? { uri: citywalkApi.resolveUrl(place.image) }
                  : undefined
              }
              contentFit="cover"
              style={styles.thumbnail}
              accessibilityLabel={place.content.name}
            />
            <View style={styles.rowCopy}>
              <AppText
                variant="label"
                style={{
                  writingDirection:
                    place.resolvedLocale === "ar" ? "rtl" : "ltr",
                  textAlign: direction === "rtl" ? "right" : "left",
                }}
              >
                {place.content.name}
              </AppText>
              <AppText variant="caption" style={styles.muted}>
                {t.minutes.replace("{minutes}", String(place.durationMinutes))}{" "}
                ·{" "}
                {place.category === "see" ||
                place.category === "eat" ||
                place.category === "fun"
                  ? discoveryCopy(locale)[place.category]
                  : walkCategoryLabel(place.category, locale)}
              </AppText>
            </View>
            {interactive ? (
              <NativeIcon
                ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
                android={direction === "rtl" ? "chevron_left" : "chevron_right"}
                size={16}
                color={colors.textMuted}
              />
            ) : null}
          </View>
        );
        return interactive ? (
          <Link
            key={place.slug}
            href={{
              pathname: "/city/[citySlug]/place/[placeSlug]",
              params: { citySlug, placeSlug: place.slug },
            }}
            asChild
          >
            <PressableSurface
              accessibilityRole="link"
              accessibilityLabel={place.content.name}
            >
              {row}
            </PressableSurface>
          </Link>
        ) : (
          <View key={place.slug}>{row}</View>
        );
      })}
    </View>
  );
}
export function V2Loading({ stage = "matching" }: { stage?: WalkBuildStage }) {
  const { locale, direction } = useNativeLocale(),
    t = walkCopy(locale),
    reduced = useReducedMotion();
  const [rotation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1700,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation, reduced]);
  return (
    <View style={{ direction }} accessibilityRole="progressbar" accessibilityLabel={t.loading} accessibilityValue={{ text: t[stage] }}>
      <V2Hero title={t.loading} subtitle={t.loadingSubtitle} />
      <View style={styles.ring}>
        <NativeIcon
          ios="figure.walk"
          android="directions_walk"
          size={48}
          color={colors.primary}
        />
        <Animated.View
          style={[
            styles.orbit,
            {
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      <View style={styles.stages}>
        {(["matching", "checking", "fitting", "choosing"] as const).map((key, index, stages) => {
          const current = stages.indexOf(stage), completed = index < current, active = index === current;
          return <View key={key} style={styles.stage} testID={`build-${key}-${completed ? "completed" : active ? "current" : "upcoming"}`}>
            <NativeIcon
              ios={completed ? "checkmark.circle.fill" : active ? "circle.dotted" : "circle"}
              android={completed ? "check_circle" : active ? "pending" : "radio_button_unchecked"}
              color={completed || active ? colors.primary : colors.borderStrong}
              size={26}
            />
            <AppText accessibilityLiveRegion={active ? "polite" : "none"} style={[styles.rowCopy, !active && styles.muted]}>{t[key]}</AppText>
          </View>;
        })}
      </View>
      <View style={styles.reassurance}>
        <NativeIcon
          ios="sparkles"
          android="auto_awesome"
          color={colors.primary}
        />
        <AppText style={styles.rowCopy}>{t.reassurance}</AppText>
      </View>
    </View>
  );
}
export function V2WalkError({
  empty = false,
  retry,
  close,
}: {
  empty?: boolean;
  retry: () => void;
  close: () => void;
}) {
  const { locale } = useNativeLocale(),
    t = walkCopy(locale);
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <View style={styles.errorArt}>
        <Image
          source={require("../../assets/images/citywalk-waterfront.webp")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <NativeIcon ios="map" android="map" size={96} color={colors.primary} />
      </View>
      <AppText variant="screenTitle" style={styles.center}>
        {empty ? t.empty : t.error}
      </AppText>
      <AppText style={[styles.subtitle, styles.center]}>
        {empty ? t.emptyHelp : t.errorHelp}
      </AppText>
      <PrimaryButton label={empty ? t.customize : t.retry} onPress={retry} />
      <PrimaryButton label={t.backCity} tone="secondary" onPress={close} />
      {!empty ? (
        <AppText style={[styles.muted, styles.center]}>{t.errorHint}</AppText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    minHeight: layout.heroHeight,
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  heroArt: { width: "100%", height: 140, position: "absolute", bottom: 0, start: 0 },
  heroCopy: { gap: spacing.sm, paddingBottom: 148 },
  cityHero: {
    minHeight: layout.cityHeroHeight,
    justifyContent: "flex-start",
    paddingTop: spacing.xl,
  },
  compactHero: { minHeight: 125, paddingVertical: spacing.md },
  heroTitle: { maxWidth: "95%" },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 25 },
  muted: { color: colors.textMuted },
  progress: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
  },
  dots: { flexDirection: "row", gap: spacing.md },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotActive: { backgroundColor: colors.primary },
  metrics: { flexDirection: "row", marginVertical: spacing.md },
  metric: { flex: 1, gap: spacing.xs, paddingHorizontal: spacing.sm },
  metricDivider: { borderStartWidth: 1, borderColor: colors.border },
  metricValue: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  metricText: { flexShrink: 1 },
  itinerary: { gap: spacing.sm },
  itineraryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingEnd: spacing.sm,
    ...shadows.card,
  },
  number: {
    width: 25,
    height: 25,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: { color: colors.surface, fontSize: 13 },
  thumbnail: {
    width: layout.itineraryPhoto,
    height: layout.itineraryPhoto,
    borderRadius: radius.sm,
  },
  rowCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  ring: {
    width: 174,
    height: 174,
    borderRadius: radius.pill,
    borderWidth: 9,
    borderColor: colors.border,
    alignSelf: "center",
    marginVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    position: "absolute",
    inset: -9,
    borderWidth: 9,
    borderColor: "transparent",
    borderTopColor: colors.primary,
    borderEndColor: colors.primary,
    borderRadius: radius.pill,
  },
  stages: { gap: 20, paddingHorizontal: spacing.md },
  stage: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  reassurance: {
    marginTop: spacing.xl,
    padding: 20,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  error: { gap: spacing.md },
  errorArt: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.hero,
    marginBottom: spacing.md,
  },
  center: { textAlign: "center" },
});
