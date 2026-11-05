import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import type { TourTimeBudget } from "@citywalk/traveler-core";
import type { PublicCitySummaryResponse, PublicTour } from "../../../lib/api/contracts";
import { AppText, EmptyState, PressableSurface, PrimaryButton, Screen, StatusMessage } from "../../../components/ui";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { ContentRecovery } from "../../../components/ContentRecovery";
import { NativeContentImage } from "../../../components/NativeContentImage";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeIcon } from "../../../components/NativeIcon";
import { colors, shadows } from "../../../design/tokens";
import { nativeContentTextStyle, nativeRowStyle, nativeTextBlock } from "../../../design/rtlPresentation";
import { useResponsiveTextLayout } from "../../../design/responsiveText";
import { usePublicCity } from "../../../hooks/usePublicContent";
import { citywalkApi } from "../../../lib/api/instance";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { nativeCityName, nativePlaceName } from "../../../lib/displayNames";
import { nativeCategoryLabel } from "../../../lib/contentLabels";
import { filterPublishedRoutes, publishedRoutePresentation, routeTimeBudgets, routesCopy } from "../../../lib/publishedRoutes";
import { photoCreditEntries, photoCreditsCopy } from "../../../lib/photoCredits";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function WalkingRoutesScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale, messages } = useNativeLocale();
  const state = usePublicCity(identity?.citySlug ?? "invalid", locale);
  if (!identity) return <Screen navigation={false}><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (state.status === "loading") return <Screen navigation={false}><CitywalkLoading variant="city" /></Screen>;
  if (state.status === "error") return <Screen navigation={false}><ContentRecovery citySlug={identity.citySlug} retry={state.retry} /></Screen>;
  if (state.data.city.slug !== identity.citySlug) return <Screen navigation={false}><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  return <RoutesContent key={identity.citySlug} data={state.data} />;
}
function RoutesContent({ data }: { data: PublicCitySummaryResponse }) {
  const { locale, direction, messages } = useNativeLocale();
  const copy = routesCopy(locale);
  const [budget, setBudget] = useState<TourTimeBudget>();
  const visible = filterPublishedRoutes(data.tours, budget);
  return <Screen navigation={false}>
    <View style={[styles.header, nativeTextBlock(direction)]}>
      <View style={[styles.city, nativeRowStyle(direction)]}><NativeIcon ios="mappin" android="place" size={16} color="#FFFFFF" /><AppText style={styles.cityLabel}>{nativeCityName(data.city.slug, data.city.content.name, locale)}</AppText></View>
      <AppText accessibilityRole="header" style={styles.heading}>{copy.title}</AppText>
      <AppText style={styles.introduction}>{copy.introduction}</AppText>
      {data.tours.length ? <View accessibilityRole="radiogroup" accessibilityLabel={messages.minutes} style={[styles.filters, nativeRowStyle(direction)]}>
        {[undefined, ...routeTimeBudgets].map(value => <PressableSurface key={value ?? "all"} accessibilityRole="radio" accessibilityLabel={value ? copy.budget.replace("{minutes}", String(value)) : copy.all} accessibilityState={{ checked: budget === value }}
          onPress={() => setBudget(value)} style={[styles.filter, budget === value && styles.selectedFilter]}>
          <AppText style={[styles.filterLabel, budget === value && styles.selectedFilterLabel]}>{value ? `≤ ${value} ${messages.minutes}` : copy.all}</AppText>
        </PressableSurface>)}
      </View> : null}
    </View>
    <AppText accessibilityLiveRegion="polite" variant="metadata" style={styles.muted}>{copy.routes} · {visible.length}</AppText>
    {visible.map(tour => <PublishedRouteCard key={tour.slug} tour={tour} data={data} />)}
    {!visible.length ? <EmptyState title={data.tours.length ? copy.empty : copy.noRoutes} description={data.tours.length ? copy.emptyDescription : copy.noRoutesDescription}
      icon={<NativeIcon ios="map" android="map" size={30} />}
      action={data.tours.length ? <PrimaryButton label={copy.reset} tone="secondary" onPress={() => setBudget(undefined)} /> : undefined} /> : null}
    <View style={styles.footer}>
      <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug: data.city.slug } }} asChild><PrimaryButton wrapLabel label={copy.build} tone="secondary" /></Link>
      <Link href="/saved?view=trips" asChild><PrimaryButton wrapLabel label={copy.saved} tone="secondary" /></Link>
      <Link href={{ pathname: "/city/[citySlug]", params: { citySlug: data.city.slug } }} asChild><PrimaryButton wrapLabel label={copy.city} tone="secondary" /></Link>
    </View>
  </Screen>;
}
function PublishedRouteCard({ tour, data }: { tour: PublicTour; data: PublicCitySummaryResponse }) {
  const { locale, direction, messages } = useNativeLocale();
  const copy = routesCopy(locale), { expanded } = useResponsiveTextLayout();
  const { photo, photoPlace, themes } = publishedRoutePresentation(data.city.slug, tour, data.places);
  const centralCredit = photo?.credit ? photoCreditEntries.find(entry => entry.source === photo.credit?.source) : undefined;
  const textStyle = nativeContentTextStyle(locale, tour.resolvedLocale);
  return <View style={styles.card}>
    <Link href={{ pathname: "/city/[citySlug]/tour/[tourSlug]", params: { citySlug: data.city.slug, tourSlug: tour.slug } }} asChild>
      <PressableSurface accessibilityRole="link" accessibilityLabel={`${copy.preview}: ${tour.content.title} · ${tour.estimatedDurationMinutes !== undefined ? `${tour.estimatedDurationMinutes} ${messages.minutes}` : copy.unknownDuration} · ${tour.stops.length} ${messages.stops}${themes.length ? ` · ${themes.map(theme => nativeCategoryLabel(theme, locale)).join(" · ")}` : ""}`} style={styles.routeLink}>
        {photo ? <NativeContentImage source={photo.uri ? { uri: citywalkApi.resolveUrl(photo.uri) } : photo.source} style={styles.photo} contentFit="cover" cachePolicy="memory-disk"
          accessibilityLabel={photoPlace ? copy.photoStop.replace("{place}", nativePlaceName(data.city.slug, photoPlace.slug, photoPlace.content.name, locale)) : tour.content.title} />
          : <View style={[styles.photo, styles.placeholder]}><NativeIcon ios="map" android="map" size={42} /><AppText style={styles.muted}>{copy.noPhoto}</AppText></View>}
        <View style={[styles.cardCopy, nativeTextBlock(direction)]}>
          <AppText accessibilityRole="header" style={[styles.routeTitle, textStyle]}>{tour.content.title}</AppText>
          <View style={[styles.metadata, nativeRowStyle(direction)]}>
            <NativeIcon ios="clock" android="schedule" size={16} color={colors.primary} />
            <AppText variant="metadata" style={styles.muted}>{tour.estimatedDurationMinutes !== undefined ? `${tour.estimatedDurationMinutes} ${messages.minutes}` : copy.unknownDuration} · {tour.stops.length} {messages.stops}</AppText>
          </View>
          {themes.length ? <View style={[styles.themes, nativeRowStyle(direction)]}>{themes.slice(0, 3).map(theme => <AppText key={theme} variant="caption" style={styles.theme}>{nativeCategoryLabel(theme, locale)}</AppText>)}</View> : null}
          {tour.content.shortDescription ? <AppText numberOfLines={expanded ? undefined : 3} variant="metadata" style={[styles.muted, textStyle]}>{tour.content.shortDescription}</AppText> : null}
          {tour.didFallback ? <AppText variant="caption" style={styles.muted}>{messages.fallbackContent}</AppText> : null}
          <View style={[styles.preview, nativeRowStyle(direction)]}><AppText style={styles.previewLabel}>{copy.preview}</AppText><NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} color={colors.primary} size={20} /></View>
        </View>
      </PressableSurface>
    </Link>
    {centralCredit ? <Link href={{ pathname: "/photo-credits", params: { image: centralCredit.id } }} asChild><PressableSurface accessibilityRole="link" accessibilityLabel={`${photoCreditsCopy(locale).title}: ${centralCredit.title}`} style={styles.creditLink}><AppText style={styles.creditLabel}>{photoCreditsCopy(locale).title}</AppText></PressableSurface></Link> : photo?.attribution ? <View style={styles.credits}><MediaAttribution attribution={photo.attribution} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.text, borderRadius: 24, padding: 18, gap: 12 },
  city: { alignItems: "center", gap: 5 }, cityLabel: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  heading: { color: "#FFFFFF", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5 },
  introduction: { color: "#D4E5F9", fontSize: 13, lineHeight: 20 },
  filters: { flexWrap: "wrap", gap: 6 }, filter: { minHeight: 44, paddingHorizontal: 8, justifyContent: "center", borderRadius: 18, backgroundColor: "#FFFFFF", maxWidth: "100%" },
  selectedFilter: { backgroundColor: colors.primary }, filterLabel: { color: colors.text, fontSize: 12, lineHeight: 18 }, selectedFilterLabel: { color: "#FFFFFF", fontWeight: "600" },
  muted: { color: colors.textMuted }, card: { ...shadows.card, backgroundColor: "#FFFFFF", borderRadius: 24, overflow: "hidden" }, routeLink: { minHeight: 44 },
  photo: { width: "100%", height: 190, backgroundColor: colors.primarySoft }, placeholder: { alignItems: "center", justifyContent: "center", gap: 12 },
  cardCopy: { padding: 18, gap: 10 }, routeTitle: { color: colors.text, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3 },
  metadata: { alignItems: "center", gap: 6, flexWrap: "wrap" }, themes: { gap: 6, flexWrap: "wrap" }, theme: { color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  preview: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: colors.primarySoft, justifyContent: "space-between", alignItems: "center", gap: 8 }, previewLabel: { flexShrink: 1, color: colors.primary, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  creditLink: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18, paddingBottom: 8 }, creditLabel: { color: colors.primary, fontSize: 12, lineHeight: 18, textDecorationLine: "underline" }, credits: { padding: 16 }, footer: { gap: 10 },
});
