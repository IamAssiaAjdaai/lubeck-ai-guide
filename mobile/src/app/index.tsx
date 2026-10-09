import { nativeTextStyle } from "../design/rtlPresentation";
import { ContentRecovery } from "../components/ContentRecovery";
import { Image } from "expo-image";
import { LocaleSelector } from "../components/LocaleSelector";
import { nativeCityName } from "../lib/displayNames";
import { triggerCitywalkHaptic } from "../lib/haptics";
import { cityLaunches, getLaunchDescription } from "@citywalk/traveler-core/cityAvailability";
import { calculateDistanceMeters } from "@citywalk/traveler-core";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { NativeContentImage } from "../components/NativeContentImage";
import { CitywalkLoading } from "../components/CitywalkLoading";
import { MediaAttribution } from "../components/MediaAttribution";
import { NativeIcon } from "../components/NativeIcon";
import {
  AppText,
  EmptyState,
  PressableSurface,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../components/ui";
import { motion, radius, spacing } from "../design/tokens";
import { prefetchPublicCity, usePublicCities } from "../hooks/usePublicContent";
import { citywalkApi } from "../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../lib/api/media";
import { requestForegroundLocation } from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import { useNativeLocale } from "../localization/LocaleProvider";

type HomeCity = {
  slug: string;
  name: string;
  available: boolean;
  image?: string;
  shortDescription?: string;
  attribution?: { text: string; href?: string; license?: string };
};

const editorialLabels: Record<string, { eyebrow: string; featured: string; more: string; seeAll: string; brandline: string }> = {
  en: { eyebrow: "EXPLORE CITIES", featured: "Featured cities", more: "More cities coming soon", seeAll: "See all", brandline: "EXPLORE. DISCOVER. FEEL." },
  de: { eyebrow: "STÄDTE ENTDECKEN", featured: "Entdecke Städte", more: "Bald verfügbar", seeAll: "Alle ansehen", brandline: "ENTDECKEN. ERLEBEN. GENIESSEN." },
  fr: { eyebrow: "EXPLOREZ LES VILLES", featured: "Villes à découvrir", more: "Bientôt disponibles", seeAll: "Tout voir", brandline: "EXPLOREZ. DÉCOUVREZ. RESSENTEZ." },
  es: { eyebrow: "EXPLORA CIUDADES", featured: "Ciudades destacadas", more: "Próximamente", seeAll: "Ver todas", brandline: "EXPLORA. DESCUBRE. SIENTE." },
  nl: { eyebrow: "ONTDEK STEDEN", featured: "Ontdek steden", more: "Binnenkort beschikbaar", seeAll: "Bekijk alles", brandline: "ONTDEK. BELEEF. GENIET." },
  da: { eyebrow: "UDFORSK BYER", featured: "Udvalgte byer", more: "Kommer snart", seeAll: "Se alle", brandline: "UDFORSK. OPDAG. OPLEV." },
  sv: { eyebrow: "UTFORSKA STÄDER", featured: "Utvalda städer", more: "Kommer snart", seeAll: "Visa alla", brandline: "UTFORSKA. UPPTÄCK. UPPLEV." },
  ar: { eyebrow: "اكتشف المدن", featured: "مدن تستحق الاكتشاف", more: "مدن قادمة قريباً", seeAll: "عرض الكل", brandline: "اكتشف. استمتع. عش التجربة." },
};

function HomeCityCard({
  city,
  locale,
  size,
  availableLabel,
  comingSoonLabel,
  exploreLabel,
}: {
  city: HomeCity;
  locale: string;
  size: "featured" | "small";
  availableLabel: string;
  comingSoonLabel: string;
  exploreLabel: string;
}) {
  const isFeatured = size === "featured";
  const cityName = nativeCityName(city.slug, city.name, locale);
  const fallback = cityLaunches[city.slug]?.heroImage;
  const card = (
    <View style={[styles.destinationCard, isFeatured ? styles.featuredCard : styles.smallCard]}>
      <NativeContentImage
        source={city.image ? { uri: citywalkApi.resolveUrl(city.image) } : undefined}
        fallbackSource={fallback ? { uri: citywalkApi.resolveUrl(fallback) } : undefined}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={motion.component}
        accessibilityLabel={cityName}
        style={styles.destinationImage}
      />
      <View pointerEvents="none" style={styles.imageTint} />
      {isFeatured ? (
        <View style={styles.statusPill}>
          <View style={[styles.pillDot, !city.available && styles.pillDotMuted]} />
          <AppText variant="metadata" style={styles.pillText}>
            {city.available ? availableLabel : comingSoonLabel}
          </AppText>
        </View>
      ) : null}
      <View style={isFeatured ? styles.featuredCopy : styles.smallCopy}>
        <AppText
          variant={isFeatured ? "heading" : "label"}
          numberOfLines={1}
          style={[styles.destinationName, isFeatured && styles.featuredName]}
        >
          {cityName}
        </AppText>
        {isFeatured && city.shortDescription ? (
          <AppText variant="caption" numberOfLines={1} style={styles.destinationDescription}>
            {city.shortDescription}
          </AppText>
        ) : !isFeatured ? (
          <AppText variant="metadata" style={styles.destinationDescription}>{comingSoonLabel}</AppText>
        ) : null}
      </View>
      {city.available && isFeatured ? (
        <View pointerEvents="none" style={styles.cardArrow}>
          <NativeIcon ios="arrow.right" android="arrow_forward" size={20} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={isFeatured ? styles.featuredItem : styles.smallItem}>
      {city.available ? (
        <Link href={{ pathname: "/city/[citySlug]", params: { citySlug: city.slug } }} asChild>
          <PressableSurface
            accessibilityRole="link"
            accessibilityLabel={String(exploreLabel) + ": " + cityName}
            onPress={() => void triggerCitywalkHaptic("medium")}
            onPressIn={() => void prefetchPublicCity(city.slug, locale).catch(() => undefined)}
          >
            {card}
          </PressableSurface>
        </Link>
      ) : card}
      <MediaAttribution attribution={city.attribution} />
    </View>
  );
}

export default function HomeScreen() {
  const { locale, direction, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const editorial = editorialLabels[locale] ?? editorialLabels.en;
  const cities = usePublicCities(locale);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (section === "cities") scroll.current?.scrollTo({ y: 0, animated: true });
  }, [section]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [locationHelp, setLocationHelp] = useState("");

  async function locate() {
    setLocating(true);
    try {
      const result = await requestForegroundLocation(expoForegroundLocationAdapter);
      if (result.status === "available") {
        setLocation({ lat: result.location.latitude, lng: result.location.longitude });
        setLocationHelp(t.nearest);
      } else {
        setLocationHelp(t.locationHelp);
      }
    } catch {
      setLocationHelp(t.locationHelp);
    } finally {
      setLocating(false);
    }
  }

  const available: HomeCity[] =
    cities.status === "available"
      ? cities.data.cities
          .filter(city => (cityLaunches[city.slug]?.status ?? "available") === "available")
          .map(city => ({
            slug: city.slug,
            name: city.name,
            available: true,
            image: selectImageUrl(
              selectPrimaryImageMedia(city.media),
              cityLaunches[city.slug]?.heroImage,
              undefined,
              "card",
            ),
            shortDescription: city.shortDescription,
            attribution: selectPrimaryImageMedia(city.media)?.attribution,
          }))
      : [];
  const upcoming: HomeCity[] = Object.entries(cityLaunches)
    .filter(([, city]) => city.status === "coming_soon")
    .map(([slug, city]) => ({
      slug,
      name: city.name,
      available: false,
      image: city.heroImage,
      shortDescription: getLaunchDescription(slug, locale),
      attribution: city.credit,
    }));

  const choices = [...available, ...upcoming]
    .filter(city =>
      (city.name + " " + nativeCityName(city.slug, city.name, locale))
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale)),
    )
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (!location) return 0;
      return (calculateDistanceMeters(location, cityLaunches[a.slug]?.coordinates) ?? Infinity)
        - (calculateDistanceMeters(location, cityLaunches[b.slug]?.coordinates) ?? Infinity);
    });

  const featured = choices.slice(0, 2);
  const remaining = choices.slice(2);

  return (
    <Screen scrollViewRef={scroll} scrollDiagnostics="home" brand={false}>
      <View style={styles.homeHero}>
        <NativeContentImage
          source={{ uri: citywalkApi.resolveUrl(cityLaunches.lubeck.heroImage!) }}
          fallbackSource={require("../../assets/images/citywalk-hero.png")}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={undefined}
          style={styles.heroImage}
        />
        <View pointerEvents="none" style={styles.heroScrim} />
        <View style={[styles.heroHeader, { direction }]}>
          <View style={styles.brandLockup}>
            <Image
              source={require("../../assets/images/citywalk-mark.svg")}
              contentFit="contain"
              style={styles.brandMark}
              accessible={false}
            />
            <View style={styles.brandCopy}>
              <AppText style={styles.brandName}>CITYWALK</AppText>
              <AppText variant="caption" numberOfLines={1} style={styles.brandline}>
                {editorial.brandline}
              </AppText>
            </View>
          </View>
          <View style={styles.headerControls}>
            <LocaleSelector showLabel />
            <Link href="/profile" asChild>
              <PressableSurface
                accessibilityRole="link"
                accessibilityLabel={t.profile}
                style={styles.profileControl}
              >
                <NativeIcon ios="person.crop.circle" android="person_outline" size={22} color="#0E2C44" />
              </PressableSurface>
            </Link>
          </View>
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="metadata" style={styles.heroEyebrow}>{editorial.eyebrow}</AppText>
          <AppText accessibilityRole="header" variant="hero" style={[styles.heroTitle, direction === "rtl" && { textAlign: "right" }]}>
            {t.homeTitle}
          </AppText>
          <AppText style={styles.heroSubtitle}>{t.homeSubtitle}</AppText>
        </View>
        <View style={styles.heroActions}>
          <View style={[styles.search, { direction }]}>
            <NativeIcon ios="magnifyingglass" android="search" color="#14344D" size={22} />
            <TextInput
              accessibilityLabel={t.search}
              placeholder={t.search}
              placeholderTextColor="#8796A5"
              value={query}
              onChangeText={setQuery}
              style={[styles.searchInput, nativeTextStyle(direction)]}
            />
          </View>
          <PrimaryButton
            style={styles.locationButton}
            label={t.location}
            busy={locating}
            onPress={() => void locate()}
            leadingIcon={<NativeIcon ios="location.fill" android="near_me" color="#FFFFFF" size={20} />}
          />
        </View>
      </View>

      {locationHelp ? (
        <AppText accessibilityLiveRegion="polite">{locationHelp}</AppText>
      ) : null}

      <View style={styles.sectionRow}>
        <SectionTitle>{editorial.featured}</SectionTitle>
        {remaining.length > 0 ? (
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel={editorial.seeAll}
            onPress={() => scroll.current?.scrollToEnd({ animated: true })}
            style={styles.seeAll}
          >
            <AppText variant="metadata" style={styles.seeAllText}>{editorial.seeAll}</AppText>
            <NativeIcon ios={direction === "rtl" ? "chevron.left" : "chevron.right"} android={direction === "rtl" ? "chevron_left" : "chevron_right"} size={16} color="#0E2C44" />
          </PressableSurface>
        ) : null}
      </View>

      {cities.status === "loading" ? <CitywalkLoading variant="home" /> : null}
      {cities.status === "error" ? <ContentRecovery retry={cities.retry} /> : null}
      {cities.status === "available" && !choices.length ? (
        <EmptyState
          title={t.noCities}
          description={t.search}
          icon={<NativeIcon ios="magnifyingglass" android="search" />}
        />
      ) : null}

      {featured.length > 0 ? (
        <View style={styles.featuredGrid}>
          {featured.map(city => (
            <HomeCityCard
              key={city.slug}
              city={city}
              locale={locale}
              size="featured"
              availableLabel={t.availableNow}
              comingSoonLabel={t.comingSoon}
              exploreLabel={messages.exploreCity}
            />
          ))}
        </View>
      ) : null}
      {remaining.length > 0 ? (
        <>
          <SectionTitle>{editorial.more}</SectionTitle>
          <View style={styles.smallGrid}>
            {remaining.map(city => (
              <HomeCityCard
                key={city.slug}
                city={city}
                locale={locale}
                size="small"
                availableLabel={t.availableNow}
                comingSoonLabel={t.comingSoon}
                exploreLabel={messages.exploreCity}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeHero: {
    minHeight: 485,
    marginHorizontal: -spacing.lg,
    marginTop: -14,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: "#8BB8D0",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 27, 38, 0.30)",
  },
  heroHeader: {
    minHeight: 60, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", gap: 6,
  },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  brandMark: { width: 32, height: 44 },
  brandCopy: { flex: 1, minWidth: 0, gap: 1 },
  brandName: { color: "#0E2C44", fontSize: 19, fontWeight: "700", letterSpacing: 1.8 },
  brandline: { color: "#39536B", fontSize: 8, lineHeight: 11, fontWeight: "700", letterSpacing: 1.1 },
  headerControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileControl: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.91)",
    justifyContent: "center", alignItems: "center",
  },
  heroCopy: { gap: 8, marginTop: 56, paddingBottom: spacing.sm },
  heroEyebrow: { color: "#F7FAFC", fontWeight: "700", letterSpacing: 2.8, fontSize: 12 },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Georgia",
    fontWeight: "700",
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.5,
    textShadowColor: "rgba(0,0,0,0.26)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
  heroSubtitle: { color: "#FFFFFF", fontSize: 17, lineHeight: 23 },
  heroActions: { gap: 10 },
  search: {
    minHeight: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { minHeight: 56, flex: 1, color: "#0E2C44", fontSize: 16 },
  locationButton: { minHeight: 54, backgroundColor: "#007C96", borderRadius: radius.lg },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  seeAll: { flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "flex-end", minHeight: 44 },
  seeAllText: { color: "#0E2C44", fontWeight: "700" },
  featuredGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "flex-start" },
  featuredItem: { width: "48%", flexGrow: 1, minWidth: 0 },
  destinationCard: { backgroundColor: "#D5E2E9", overflow: "hidden", borderRadius: radius.lg },
  featuredCard: { height: 256, justifyContent: "flex-end" },
  smallCard: { height: 180, justifyContent: "flex-end" },
  destinationImage: { ...StyleSheet.absoluteFillObject },
  imageTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 25, 37, 0.28)" },
  statusPill: {
    position: "absolute", top: 12, left: 12, maxWidth: "90%",
    backgroundColor: "rgba(255, 255, 255, 0.91)", borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: "row", alignItems: "center", gap: 5,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#238D5A" },
  pillDotMuted: { backgroundColor: "#66778B" },
  pillText: { color: "#154861", fontSize: 12, lineHeight: 16, flexShrink: 1 },
  featuredCopy: { padding: 16, paddingRight: 42, gap: 4 },
  smallCopy: { padding: 12, gap: 4 },
  destinationName: { color: "#FFFFFF", fontWeight: "700", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 4 },
  featuredName: { fontFamily: "Georgia", fontSize: 29, lineHeight: 34 },
  destinationDescription: { color: "#F0F4F5", fontSize: 11, lineHeight: 16 },
  cardArrow: {
    position: "absolute", bottom: 18, right: 12, width: 32, height: 32,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 16,
  },
  smallGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  smallItem: { width: "47%", flexGrow: 1, minWidth: 0 },
});
