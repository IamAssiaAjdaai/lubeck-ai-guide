import { isolateBidiName } from "./bidi";

// Native presentation only. API identities, stored names, source-language
// metadata, guide context and exact-locale audio remain untouched.
const arabicCities: Readonly<Record<string, string>> = {
  lubeck: "لوبيك",
  hamburg: "هامبورغ",
  duesseldorf: "دوسلدورف",
};
const arabicLubeckPlaces: Readonly<Record<string, string>> = {
  holstentor: "هولستنتور",
  marienkirche: "كنيسة مريم",
  rathaus: "مبنى بلدية لوبيك",
  "heiligen-geist-hospital": "مستشفى الروح القدس",
  buddenbrookhaus: "بيت بودنبروك",
  "lubecker-altstadt": "البلدة القديمة في لوبيك",
  "europaeisches-hansemuseum": "المتحف الهانزي الأوروبي",
  "st-petri-zu-luebeck": "كنيسة القديس بطرس في لوبيك",
  "luebecker-dom": "كاتدرائية لوبيك",
  "willy-brandt-haus": "بيت فيلي برانت",
  "an-der-obertrave": "ضفاف أوبرترابه",
  salzspeicher: "مخازن الملح",
  fuechtingshof: "فناء فوختينغ",
  "dunkelgruener-gang": "ممر دونكلغرونر",
  kalandsgang: "ممر كالاندس",
  malerwinkel: "ركن الرسامين",
  buergergaerten: "حدائق المواطنين",
  "cafe-niederegger": "مقهى نيدريغر",
  schiffergesellschaft: "شيفرغيزيلشافت",
  fangfrisch: "فانغفريش",
  "restaurant-vai": "مطعم فاي",
  "brauberger-zu-luebeck": "براوبرغر في لوبيك",
  "zaubertheater-luebeck": "مسرح السحر في لوبيك",
  "kolk-17": "كولك ١٧ — مسرح الدمى والمتحف",
  "final-escape-luebeck": "فاينل إسكيب لوبيك",
};

function displayName(name: string, translated: string | undefined, locale: string): string {
  if (locale !== "ar") return name;
  // Prefer authored Arabic to a local transliteration. Isolate remaining
  // Latin names so adjacent Arabic punctuation cannot reorder them.
  if (/\p{Script=Arabic}/u.test(name)) return name;
  return translated ?? isolateBidiName(name, "rtl");
}
export function nativeCityName(slug: string, name: string, locale: string): string {
  return displayName(name, arabicCities[slug], locale);
}
export function nativePlaceName(citySlug: string, slug: string, name: string, locale: string): string {
  return displayName(name, citySlug === "lubeck" ? arabicLubeckPlaces[slug] : undefined, locale);
}
