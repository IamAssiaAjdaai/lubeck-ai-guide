import { nativeTextStyle } from "../design/rtlPresentation";
import homeHolstentor from "../../assets/images/home-holstentor.jpg";
import homeHamburg from "../../assets/images/home-hamburg.webp";
import homeDuesseldorf from "../../assets/images/home-duesseldorf.webp";
import homeAppMark from "../../assets/images/citywalk-mark.svg";
import homeMulticityApproved from "../../assets/images/home-multicity-approved.webp";
import homeCardGradient from "../../assets/images/home-card-gradient.svg";
import homeHeroSkyGradient from "../../assets/images/home-hero-sky-gradient.svg";
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
  unavailable?: boolean;
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

function bundledCityImage(slug: string) {
  switch (slug) {
    case "lubeck": return homeHolstentor;
    case "hamburg": return homeHamburg;
    case "duesseldorf": return homeDuesseldorf;
    default: return undefined;
  }
}

// Compact, localized decks keep photo captions readable on smaller devices.
const featuredDeck: Record<string, Record<string, string>> = {
  en: { lubeck: "HANSEATIC · HISTORIC · COASTAL", hamburg: "HARBOR · CULTURE · MODERN" },
  de: { lubeck: "HANSESTADT · GESCHICHTE · MEER", hamburg: "HAFEN · KULTUR · MODERN" },
  fr: { lubeck: "HANSÉATIQUE · HISTOIRE · MER", hamburg: "PORT · CULTURE · MODERNE" },
  es: { lubeck: "HANSEÁTICA · HISTORIA · MAR", hamburg: "PUERTO · CULTURA · MODERNA" },
  nl: { lubeck: "HANZE · HISTORIE · KUST", hamburg: "HAVEN · CULTUUR · MODERN" },
  da: { lubeck: "HANSEBY · HISTORIE · KYST", hamburg: "HAVN · KULTUR · MODERNE" },
  sv: { lubeck: "HANSA · HISTORIA · KUST", hamburg: "HAMN · KULTUR · MODERNT" },
  ar: { lubeck: "تاريخ · ثقافة · بحر", hamburg: "ميناء · ثقافة · حداثة" },
};

function HomeCityCard({
  city,
  locale,
  size,
  availableLabel,
  comingSoonLabel,
  unavailableLabel,
  exploreLabel,
}: {
  city: HomeCity;
  locale: ReturnType<typeof useNativeLocale>["locale"];
  size: "featured" | "small";
  availableLabel: string;
  comingSoonLabel: string;
  unavailableLabel: string;
  exploreLabel: string;
}) {
  const isFeatured = size === "featured";
  const cityName = nativeCityName(city.slug, city.name, locale);
  const shortDeck = featuredDeck[locale]?.[city.slug] ?? city.shortDescription;
  const localImage = bundledCityImage(city.slug);
  const fallback = cityLaunches[city.slug]?.heroImage;
  const card = (
    <View style={[styles.destinationCard, isFeatured ? styles.featuredCard : styles.smallCard]}>
      <NativeContentImage
        source={city.image ? { uri: citywalkApi.resolveUrl(city.image) } : localImage ?? (fallback ? { uri: citywalkApi.resolveUrl(fallback) } : undefined)}
        fallbackSource={localImage ?? (fallback ? { uri: citywalkApi.resolveUrl(fallback) } : undefined)}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={motion.component}
        accessibilityLabel={cityName}
        style={styles.destinationImage}
      />
      <View pointerEvents="none" style={styles.imageTint} />
      <View pointerEvents="none" style={styles.imageGradientContainer}>
        <Image source={homeCardGradient} style={styles.imageGradient} contentFit="fill" accessible={false} />
      </View>
      {isFeatured ? (
        <View style={styles.statusPill}>
          <View style={[styles.pillDot, !city.available && styles.pillDotMuted]} />
          <AppText variant="metadata" style={styles.pillText}>
            {city.unavailable ? unavailableLabel : city.available ? availableLabel : comingSoonLabel}
          </AppText>
        </View>
      ) : null}
      <View style={[isFeatured ? styles.featuredCopy : styles.smallCopy, isFeatured && city.available && styles.featuredCopyWithArrow]}>
        <AppText
          variant={isFeatured ? "heading" : "label"}
          numberOfLines={isFeatured ? 2 : 1}
          style={[styles.destinationName, isFeatured && styles.featuredName]}
        >
          {cityName}
        </AppText>
        {isFeatured && shortDeck ? (
          <AppText variant="caption" numberOfLines={2} style={styles.destinationDescription}>
            {shortDeck}
          </AppText>
        ) : !isFeatured ? (
          <AppText variant="metadata" style={styles.destinationDescription}>{city.unavailable ? unavailableLabel : comingSoonLabel}</AppText>
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
      {city.attribution && city.available ? <MediaAttribution attribution={city.attribution} /> : null}
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

  // Keep destination photography visible on Home during a connection error, but never
  // make a CMS-unverified city card navigable or claim its content is available.
  const offlineLubeck: HomeCity[] = cities.status === "error"
    ? [{ slug: "lubeck", name: cityLaunches.lubeck.name, available: false, unavailable: true }]
    : [];
  const choices = [...available, ...offlineLubeck, ...upcoming]
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
          source={homeMulticityApproved}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          accessibilityLabel={undefined}
          style={styles.heroImage}
        />
        <View pointerEvents="none" style={styles.heroScrim} />
        <View pointerEvents="none" style={styles.heroSky}>
          <Image source={homeHeroSkyGradient} style={styles.heroSkyImage} contentFit="fill" accessible={false} />
        </View>
        <View style={[styles.heroHeader, { direction }]}>
          <View style={styles.brandLockup}>
            <Image
              source={homeAppMark}
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
            <LocaleSelector showLabel home />
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
              unavailableLabel={messages.unavailable}
              exploreLabel={messages.exploreCity}
            />
          ))}
        </View>
      ) : null}
      {cities.status === "error" ? (
        <View testID="home-cities-retry" style={styles.contentWarning}>
          <AppText variant="metadata" style={styles.warningText}>{messages.unavailable}</AppText>
          <PressableSurface accessibilityRole="button" accessibilityLabel={t.retry} onPress={cities.retry} style={styles.retryButton}>
            <NativeIcon ios="arrow.clockwise" android="refresh" color="#0E2C44" size={16} />
            <AppText variant="label" style={styles.retryLabel}>{t.retry}</AppText>
          </PressableSurface>
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
                unavailableLabel={messages.unavailable}
                exploreLabel={messages.exploreCity}
              />
            ))}
          </View>
        </>
      ) : null}
      <Link href="/photo-credits" asChild>
        <PressableSurface accessibilityRole="link" accessibilityLabel="Photo credits" style={styles.photoCreditsLink}>
          <AppText variant="metadata" style={styles.photoCreditsText}>Photo credits</AppText>
          <NativeIcon ios="chevron.right" android="chevron_right" size={14} color="#64748B" />
        </PressableSurface>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeHero: {
    minHeight: 418,
    marginHorizontal: -spacing.lg,
    marginTop: -14,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: "#8BB8D0",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  heroImage: { ...StyleSheet.absoluteFill },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 22, 32, 0.31)",
  },
  heroSky: { position: "absolute", top: 0, left: 0, right: 0, height: 140 },
  heroSkyImage: { width: "100%", height: "100%" },
  heroHeader: {
    minHeight: 60, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", gap: 6,
  },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  brandMark: { width: 32, height: 44 },
  brandCopy: { flex: 1, minWidth: 0, gap: 1 },
  brandName: { color: "#0E2C44", fontSize: 17, fontWeight: "700", letterSpacing: 1.3 },
  brandline: { color: "#39536B", fontSize: 7, lineHeight: 10, fontWeight: "600", letterSpacing: 0.7 },
  headerControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileControl: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.91)",
    justifyContent: "center", alignItems: "center",
  },
  heroCopy: { gap: 7, marginTop: 28, paddingBottom: spacing.sm },
  heroEyebrow: { color: "#F7FAFC", fontWeight: "700", letterSpacing: 2.8, fontSize: 12 },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Georgia",
    fontWeight: "500",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.26)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
  heroSubtitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 22, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4 },
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
  featuredCard: { height: 236, justifyContent: "flex-end" },
  smallCard: { height: 180, justifyContent: "flex-end" },
  destinationImage: { ...StyleSheet.absoluteFill },
  imageTint: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 25, 37, 0.08)" },
  imageGradientContainer: { position: "absolute", left: 0, bottom: 0, right: 0, height: "64%" },
  imageGradient: { height: "100%", width: "100%" },
  statusPill: {
    position: "absolute", top: 12, left: 12, maxWidth: "90%",
    backgroundColor: "rgba(255, 255, 255, 0.91)", borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: "row", alignItems: "center", gap: 5,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#238D5A" },
  pillDotMuted: { backgroundColor: "#66778B" },
  pillText: { color: "#154861", fontSize: 12, lineHeight: 16, flexShrink: 1 },
  featuredCopy: { paddingHorizontal: 13, paddingTop: 14, paddingBottom: 18, gap: 7 },
  featuredCopyWithArrow: { paddingRight: 43 },
  smallCopy: { padding: 12, gap: 4 },
  destinationName: { color: "#FFFFFF", fontWeight: "700", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 4 },
  featuredName: { fontFamily: "Georgia", fontSize: 24, lineHeight: 29 },
  destinationDescription: { color: "#F8FAFB", fontSize: 10, lineHeight: 15, letterSpacing: 0.1 },
  cardArrow: {
    position: "absolute", bottom: 31, right: 10, width: 30, height: 30,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 16,
  },
  smallGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  smallItem: { width: "47%", flexGrow: 0, minWidth: 0 },
  photoCreditsLink: { alignSelf: "flex-end", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  photoCreditsText: { color: "#64748B", fontSize: 12 },
  contentWarning: { minHeight: 48, borderRadius: 12, backgroundColor: "#F0F5F8", paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  warningText: { color: "#4F6677", flex: 1 },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 44, paddingHorizontal: 8 },
  retryLabel: { color: "#0E2C44" },
});
