import type { NativeLocale } from "./api/contracts";

export const NATIVE_LOCALES = ["en", "de", "ar"] as const;

export type NativeDirection = "ltr" | "rtl";

export type NativeMessages = Readonly<{
  appTagline: string;
  discoverCities: string;
  availableCities: string;
  exploreCity: string;
  tours: string;
  stops: string;
  minutes: string;
  estimatedDuration: string;
  startTour: string;
  fallbackContent: string;
  places: string;
  map: string;
  useLocation: string;
  locationRequesting: string;
  locationDenied: string;
  locationUnavailable: string;
  locationServicesDisabled: string;
  locationProviderUnavailable: string;
  locationFixFailed: string;
  retry: string;
  loading: string;
  unavailable: string;
  visitMinutes: string;
  story: string;
  facts: string;
  visitorNote: string;
  audioGuide: string;
  playAudio: string;
  pauseAudio: string;
  replayAudio: string;
  loadingAudio: string;
  audioUnavailable: string;
  askCitywalk: string;
  askGuideTitle: string;
  questionPlaceholder: string;
  sendQuestion: string;
  answer: string;
  sources: string;
  guideUnavailable: string;
  guideError: string;
  guideRateLimited: string;
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
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  discoverCity: string;
  noSignUpRequired: string;
}>;

const messages: Record<NativeLocale, NativeMessages> = {
  en: {
    appTagline: "Walk. Discover. Hear every city.", discoverCities: "Discover a city",
    availableCities: "Available cities", exploreCity: "Explore city", tours: "Tours", stops: "stops",
    minutes: "min", estimatedDuration: "Estimated duration", startTour: "Start tour",
    fallbackContent: "This content is shown in its available language.", places: "Places", map: "City map",
    useLocation: "Use my location", locationRequesting: "Finding your location…",
    locationDenied: "Location permission was denied. The map remains available.",
    locationUnavailable: "Your location is currently unavailable.",
    locationServicesDisabled: "Location services are turned off. Turn them on and try again.",
    locationProviderUnavailable: "No location provider is available. Check your device settings and try again.",
    locationFixFailed: "CITYWALK could not get a location fix. Move outdoors or try again.",
    retry: "Try again", loading: "Loading…",
    unavailable: "This content is temporarily unavailable.", visitMinutes: "min visit", story: "Story", facts: "Facts",
    visitorNote: "Visitor note", audioGuide: "Audio guide", playAudio: "Play", pauseAudio: "Pause",
    replayAudio: "Replay", loadingAudio: "Loading audio…", audioUnavailable: "Audio is currently unavailable.",
    askCitywalk: "Ask CITYWALK", askGuideTitle: "Ask CITYWALK", questionPlaceholder: "What would you like to know?",
    sendQuestion: "Send question", answer: "Answer", sources: "Sources",
    guideUnavailable: "The verified AI guide is not available for this place.",
    guideError: "CITYWALK could not answer right now. Please try again.",
    guideRateLimited: "Your AI Guide allowance has been reached. Please try again later.",
    account: "Account", guestMode: "CITYWALK works without an account.",
    continueAsGuest: "Continue as guest", signIn: "Sign in", signUp: "Create account", email: "Email",
    password: "Password", signedIn: "Signed in", signOut: "Sign out", authError: "Authentication could not be completed.",
    homeHeroTitle: "Discover cities one step at a time.",
    homeHeroSubtitle: "Explore local stories, audio guides and hidden places in your language.",
    discoverCity: "Discover a city", noSignUpRequired: "No sign-up required",
  },
  de: {
    appTagline: "Gehen. Entdecken. Städte hören.", discoverCities: "Stadt entdecken",
    availableCities: "Verfügbare Städte", exploreCity: "Stadt erkunden", tours: "Touren", stops: "Stopps",
    minutes: "Min.", estimatedDuration: "Geschätzte Dauer", startTour: "Tour starten",
    fallbackContent: "Dieser Inhalt wird in der verfügbaren Sprache angezeigt.", places: "Orte", map: "Stadtplan",
    useLocation: "Meinen Standort verwenden", locationRequesting: "Standort wird ermittelt…",
    locationDenied: "Der Standortzugriff wurde abgelehnt. Die Karte bleibt verfügbar.",
    locationUnavailable: "Dein Standort ist derzeit nicht verfügbar.",
    locationServicesDisabled: "Die Standortdienste sind ausgeschaltet. Schalte sie ein und versuche es erneut.",
    locationProviderUnavailable: "Kein Standortanbieter ist verfügbar. Prüfe deine Geräteeinstellungen und versuche es erneut.",
    locationFixFailed: "CITYWALK konnte deinen Standort nicht ermitteln. Gehe ins Freie oder versuche es erneut.",
    retry: "Erneut versuchen", loading: "Wird geladen…",
    unavailable: "Dieser Inhalt ist vorübergehend nicht verfügbar.", visitMinutes: "Min. Besuch", story: "Geschichte", facts: "Fakten",
    visitorNote: "Besuchshinweis", audioGuide: "Audioguide", playAudio: "Abspielen", pauseAudio: "Pause",
    replayAudio: "Erneut abspielen", loadingAudio: "Audio wird geladen…", audioUnavailable: "Audio ist derzeit nicht verfügbar.",
    askCitywalk: "CITYWALK fragen", askGuideTitle: "CITYWALK fragen", questionPlaceholder: "Was möchtest du wissen?",
    sendQuestion: "Frage senden", answer: "Antwort", sources: "Quellen",
    guideUnavailable: "Der verifizierte KI-Guide ist für diesen Ort nicht verfügbar.",
    guideError: "CITYWALK kann gerade nicht antworten. Bitte versuche es erneut.",
    guideRateLimited: "Dein Kontingent für den KI-Guide ist erreicht. Bitte versuche es später erneut.",
    account: "Konto", guestMode: "CITYWALK funktioniert ohne Konto.",
    continueAsGuest: "Als Gast fortfahren", signIn: "Anmelden", signUp: "Konto erstellen", email: "E-Mail",
    password: "Passwort", signedIn: "Angemeldet", signOut: "Abmelden", authError: "Anmeldung konnte nicht abgeschlossen werden.",
    homeHeroTitle: "Städte entdecken, Schritt für Schritt.",
    homeHeroSubtitle: "Entdecke lokale Geschichten, Audioguides und verborgene Orte in deiner Sprache.",
    discoverCity: "Entdecke eine Stadt", noSignUpRequired: "Keine Anmeldung erforderlich",
  },
  ar: {
    appTagline: "امشِ. اكتشف. واستمع إلى كل مدينة.", discoverCities: "اكتشف مدينة",
    availableCities: "المدن المتاحة", exploreCity: "استكشف المدينة", tours: "الجولات", stops: "محطات",
    minutes: "دقيقة", estimatedDuration: "المدة التقديرية", startTour: "ابدأ الجولة",
    fallbackContent: "يُعرض هذا المحتوى باللغة المتاحة.", places: "الأماكن", map: "خريطة المدينة",
    useLocation: "استخدام موقعي", locationRequesting: "جارٍ تحديد موقعك…",
    locationDenied: "تم رفض إذن الموقع. تظل الخريطة متاحة.",
    locationUnavailable: "موقعك غير متاح حاليًا.",
    locationServicesDisabled: "خدمات الموقع متوقفة. فعّلها ثم حاول مجددًا.",
    locationProviderUnavailable: "لا يتوفر مزود للموقع. تحقق من إعدادات جهازك وحاول مجددًا.",
    locationFixFailed: "تعذر على CITYWALK تحديد موقعك. انتقل إلى مكان مفتوح أو حاول مجددًا.",
    retry: "حاول مجددًا", loading: "جارٍ التحميل…",
    unavailable: "هذا المحتوى غير متاح مؤقتًا.", visitMinutes: "دقيقة للزيارة", story: "القصة", facts: "حقائق",
    visitorNote: "ملاحظة للزيارة", audioGuide: "الدليل الصوتي", playAudio: "تشغيل", pauseAudio: "إيقاف مؤقت",
    replayAudio: "إعادة التشغيل", loadingAudio: "جارٍ تحميل الصوت…", audioUnavailable: "الصوت غير متاح حاليًا.",
    askCitywalk: "اسأل CITYWALK", askGuideTitle: "اسأل CITYWALK", questionPlaceholder: "ماذا تريد أن تعرف؟",
    sendQuestion: "إرسال السؤال", answer: "الإجابة", sources: "المصادر",
    guideUnavailable: "دليل الذكاء الاصطناعي الموثق غير متاح لهذا المكان.",
    guideError: "يتعذر على CITYWALK الإجابة الآن. حاول مرة أخرى.",
    guideRateLimited: "لقد وصلت إلى الحد المسموح به لدليل الذكاء الاصطناعي. حاول لاحقًا.",
    account: "الحساب", guestMode: "يعمل CITYWALK دون حساب.",
    continueAsGuest: "المتابعة كضيف", signIn: "تسجيل الدخول", signUp: "إنشاء حساب", email: "البريد الإلكتروني",
    password: "كلمة المرور", signedIn: "تم تسجيل الدخول", signOut: "تسجيل الخروج", authError: "تعذّر إكمال المصادقة.",
    homeHeroTitle: "اكتشف المدن خطوة بخطوة.",
    homeHeroSubtitle: "استكشف القصص المحلية والأدلة الصوتية والأماكن الخفية بلغتك.",
    discoverCity: "اكتشف مدينة", noSignUpRequired: "لا يلزم التسجيل",
  },
};

export function getNativeMessages(locale: NativeLocale): NativeMessages {
  return messages[locale];
}

export function getNativeDirection(locale: string): NativeDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getNativeTextAlignment(locale: string): "left" | "right" {
  return getNativeDirection(locale) === "rtl" ? "right" : "left";
}
