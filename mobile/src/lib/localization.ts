import type { NativeLocale } from "./api/contracts";

export const NATIVE_LOCALES = ["en", "de", "ar"] as const;

export type NativeDirection = "ltr" | "rtl";

export type NativeMessages = Readonly<{
  appTagline: string;
  discoverCities: string;
  availableCities: string;
  exploreCity: string;
  places: string;
  map: string;
  useLocation: string;
  locationRequesting: string;
  locationDenied: string;
  locationUnavailable: string;
  retry: string;
  loading: string;
  unavailable: string;
  visitMinutes: string;
  story: string;
  facts: string;
  visitorNote: string;
  account: string;
  guestMode: string;
  continueAsGuest: string;
  signIn: string;
  signUp: string;
  email: string;
  password: string;
  signedIn: string;
  signOut: string;
  authError: string;
}>;

const messages: Record<NativeLocale, NativeMessages> = {
  en: {
    appTagline: "Walk. Discover. Hear every city.", discoverCities: "Discover a city",
    availableCities: "Available cities", exploreCity: "Explore city", places: "Places", map: "City map",
    useLocation: "Use my location", locationRequesting: "Finding your location…",
    locationDenied: "Location permission was denied. The map remains available.",
    locationUnavailable: "Your location is currently unavailable.", retry: "Try again", loading: "Loading…",
    unavailable: "This content is temporarily unavailable.", visitMinutes: "min visit", story: "Story", facts: "Facts",
    visitorNote: "Visitor note", account: "Account", guestMode: "CITYWALK works without an account.",
    continueAsGuest: "Continue as guest", signIn: "Sign in", signUp: "Create account", email: "Email",
    password: "Password", signedIn: "Signed in", signOut: "Sign out", authError: "Authentication could not be completed.",
  },
  de: {
    appTagline: "Gehen. Entdecken. Städte hören.", discoverCities: "Stadt entdecken",
    availableCities: "Verfügbare Städte", exploreCity: "Stadt erkunden", places: "Orte", map: "Stadtplan",
    useLocation: "Meinen Standort verwenden", locationRequesting: "Standort wird ermittelt…",
    locationDenied: "Der Standortzugriff wurde abgelehnt. Die Karte bleibt verfügbar.",
    locationUnavailable: "Dein Standort ist derzeit nicht verfügbar.", retry: "Erneut versuchen", loading: "Wird geladen…",
    unavailable: "Dieser Inhalt ist vorübergehend nicht verfügbar.", visitMinutes: "Min. Besuch", story: "Geschichte", facts: "Fakten",
    visitorNote: "Besuchshinweis", account: "Konto", guestMode: "CITYWALK funktioniert ohne Konto.",
    continueAsGuest: "Als Gast fortfahren", signIn: "Anmelden", signUp: "Konto erstellen", email: "E-Mail",
    password: "Passwort", signedIn: "Angemeldet", signOut: "Abmelden", authError: "Anmeldung konnte nicht abgeschlossen werden.",
  },
  ar: {
    appTagline: "امشِ. اكتشف. واستمع إلى كل مدينة.", discoverCities: "اكتشف مدينة",
    availableCities: "المدن المتاحة", exploreCity: "استكشف المدينة", places: "الأماكن", map: "خريطة المدينة",
    useLocation: "استخدام موقعي", locationRequesting: "جارٍ تحديد موقعك…",
    locationDenied: "تم رفض إذن الموقع. تظل الخريطة متاحة.",
    locationUnavailable: "موقعك غير متاح حاليًا.", retry: "حاول مجددًا", loading: "جارٍ التحميل…",
    unavailable: "هذا المحتوى غير متاح مؤقتًا.", visitMinutes: "دقيقة للزيارة", story: "القصة", facts: "حقائق",
    visitorNote: "ملاحظة للزيارة", account: "الحساب", guestMode: "يعمل CITYWALK دون حساب.",
    continueAsGuest: "المتابعة كضيف", signIn: "تسجيل الدخول", signUp: "إنشاء حساب", email: "البريد الإلكتروني",
    password: "كلمة المرور", signedIn: "تم تسجيل الدخول", signOut: "تسجيل الخروج", authError: "تعذّر إكمال المصادقة.",
  },
};

export function getNativeMessages(locale: NativeLocale): NativeMessages {
  return messages[locale];
}

export function getNativeDirection(locale: string): NativeDirection {
  return locale === "ar" ? "rtl" : "ltr";
}
