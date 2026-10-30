import { Image as Artwork } from "expo-image";
import { Link } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import type { PublicCity } from "../lib/api/contracts";
import { citywalkApi } from "../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../lib/api/media";
import { nativeCityName } from "../lib/displayNames";
import { cityHubBundledPhoto } from "../lib/cityHubPhotography";
import { useNativeLocale } from "../localization/LocaleProvider";
import { CityPhotoCredits } from "./CityPhotoCredits";
import { NativeContentImage } from "./NativeContentImage";
import { NativeIcon } from "./NativeIcon";
import { AppText, PressableSurface } from "./ui";

export function CityHubHero({ city }: { city: PublicCity }) {
  const { locale, direction } = useNativeLocale();
  const { fontScale = 1 } = useWindowDimensions();
  const name = nativeCityName(city.slug, city.content.name, locale);
  // Use a short published phrase rather than inventing city marketing claims.
  const description = city.content.shortDescription?.split(/[,;]\s/)[0];
  const copy = {
    en: { switch: "Change city", explore: "Explore" },
    de: { switch: "Stadt wechseln", explore: "Entdecke" },
    es: { switch: "Cambiar ciudad", explore: "Explora" },
    nl: { switch: "Andere stad", explore: "Ontdek" },
    da: { switch: "Skift by", explore: "Udforsk" },
    sv: { switch: "Byt stad", explore: "Utforska" },
    ar: { switch: "تغيير المدينة", explore: "اكتشف" },
  }[locale];
  const media = selectPrimaryImageMedia(city.media ?? []);
  const uri = selectImageUrl(media, undefined, undefined, "hero");
  // This licensed bundled photo belongs only to Lübeck; future cities use their own published media.
  const bundled = !uri ? cityHubBundledPhoto(city.slug) : undefined;
  const source = uri ? { uri: citywalkApi.resolveUrl(uri) } : bundled?.source;
  return <View testID="city-hub-hero" style={styles.hero}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <NativeContentImage source={source} contentFit="cover" contentPosition="center" accessibilityLabel={name} style={{ position: "absolute", width: "125%", height: "100%", left: 0, top: 0 }} />
      <Artwork source={require("../../assets/images/city-hub-cinematic-wash.svg")} contentFit="fill" style={[StyleSheet.absoluteFill, direction === "rtl" && { transform: [{ scaleX: -1 }] }]} />
    </View>
    <View style={[styles.copy, { direction }, fontScale > 1.3 && { width: "100%", backgroundColor: "rgba(9,35,77,0.78)" }]}>
      <Link href="/?section=cities" asChild>
        <PressableSurface accessibilityRole="link" accessibilityLabel={`${name} · ${copy.switch}`} style={styles.switch}>
          <NativeIcon ios="mappin.and.ellipse" android="place" color="#FFFFFF" size={17} />
          <AppText style={styles.city}>{name}</AppText>
          <NativeIcon ios="chevron.down" android="expand_more" color="#FFFFFF" size={15} />
        </PressableSurface>
      </Link>
      <AppText accessibilityRole="header" style={[styles.heading, fontScale > 1.5 && { fontSize: 27, lineHeight: 32 }, fontScale > 2.5 && { fontSize: 17, lineHeight: 23 }]}>{copy.explore}{"\n"}{name}</AppText>
      {description ? <AppText accessibilityLabel={city.content.shortDescription} numberOfLines={fontScale > 1.3 ? undefined : 3} style={styles.description}>{description}</AppText> : null}
    </View>
    <CityPhotoCredits cityName={name} photo={bundled?.credit} attribution={bundled ? undefined : media?.attribution} />
  </View>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 166, backgroundColor: "#09234D", borderRadius: 22, overflow: "hidden" },
  copy: { width: "64%", paddingHorizontal: 18, paddingTop: 2, paddingBottom: 12, gap: 2 },
  switch: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  city: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "600", flexShrink: 1 },
  heading: { color: "#FFFFFF", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 32, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5 },
  description: { color: "#FFFFFF", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 12.5, lineHeight: 17, marginTop: 2 },
});
