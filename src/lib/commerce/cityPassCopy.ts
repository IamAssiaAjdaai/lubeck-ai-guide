import type { Locale } from "@/lib/i18n";

export type CityPassCopy = Readonly<{
  actualLocale: "en" | "de" | "fr" | "ar";
  premiumLabel: string;
  title: string;
  benefits: readonly string[];
  unlock: string;
  signInToUnlock: string;
  unavailable: string;
  continueFree: string;
  trust: string;
  activeUntil: string;
  continuePremium: string;
  premiumAudio: string;
  checkoutLoading: string;
  checkoutError: string;
  close: string;
}>;

const en: CityPassCopy = {
  actualLocale: "en",
  premiumLabel: "Premium narration",
  title: "Unlock Hidden Lübeck for 72 hours",
  benefits: [
    "Hidden Lübeck narrated audio experience",
    "Premium stories in available languages",
    "More verified AI Guide questions",
    "Cross-device access after sign-in",
    "One payment, no subscription",
  ],
  unlock: "Unlock for {price}",
  signInToUnlock: "Sign in to unlock",
  unavailable: "This pass is not available for purchase right now.",
  continueFree: "Continue with the free guide",
  trust: "Secure payment through Stripe Checkout. No subscription. Attraction admission and public transport are not included.",
  activeUntil: "Pass active until {date}",
  continuePremium: "Continue premium experience",
  premiumAudio: "Hidden Lübeck premium audio",
  checkoutLoading: "Opening secure checkout…",
  checkoutError: "Checkout could not be started. Please try again.",
  close: "Close",
};

const de: CityPassCopy = {
  ...en,
  actualLocale: "de",
  premiumLabel: "Premium-Erzählung",
  title: "Hidden Lübeck für 72 Stunden freischalten",
  benefits: [
    "Erzähltes Hidden-Lübeck-Audioerlebnis",
    "Premium-Geschichten in verfügbaren Sprachen",
    "Mehr verifizierte Fragen an den KI-Guide",
    "Geräteübergreifender Zugriff nach Anmeldung",
    "Einmalzahlung, kein Abonnement",
  ],
  unlock: "Für {price} freischalten",
  signInToUnlock: "Zum Freischalten anmelden",
  unavailable: "Dieser Pass kann derzeit nicht gekauft werden.",
  continueFree: "Mit dem kostenlosen Guide fortfahren",
  trust: "Sichere Zahlung über Stripe Checkout. Kein Abonnement. Eintritt und öffentlicher Nahverkehr sind nicht enthalten.",
  activeUntil: "Pass aktiv bis {date}",
  continuePremium: "Premium-Erlebnis fortsetzen",
  premiumAudio: "Hidden-Lübeck-Premium-Audio",
  checkoutLoading: "Sicherer Checkout wird geöffnet…",
  checkoutError: "Checkout konnte nicht gestartet werden. Bitte versuche es erneut.",
  close: "Schließen",
};

const fr: CityPassCopy = {
  ...en,
  actualLocale: "fr",
  premiumLabel: "Récit premium",
  title: "Débloquez Lübeck secrète pendant 72 heures",
  benefits: [
    "Expérience audio racontée de Lübeck secrète",
    "Histoires premium dans les langues disponibles",
    "Plus de questions vérifiées au guide IA",
    "Accès sur plusieurs appareils après connexion",
    "Paiement unique, sans abonnement",
  ],
  unlock: "Débloquer pour {price}",
  signInToUnlock: "Se connecter pour débloquer",
  unavailable: "Ce pass n’est pas disponible à l’achat actuellement.",
  continueFree: "Continuer avec le guide gratuit",
  trust: "Paiement sécurisé via Stripe Checkout. Sans abonnement. Les entrées et les transports publics ne sont pas inclus.",
  activeUntil: "Pass actif jusqu’au {date}",
  continuePremium: "Continuer l’expérience premium",
  premiumAudio: "Audio premium de Lübeck secrète",
  checkoutLoading: "Ouverture du paiement sécurisé…",
  checkoutError: "Impossible de démarrer le paiement. Réessayez.",
  close: "Fermer",
};

const ar: CityPassCopy = {
  ...en,
  actualLocale: "ar",
  premiumLabel: "رواية صوتية مميزة",
  title: "افتح تجربة لوبيك الخفية لمدة 72 ساعة",
  benefits: [
    "تجربة صوتية تحكي قصص لوبيك الخفية",
    "قصص مميزة باللغات المتاحة",
    "المزيد من الأسئلة الموثقة للدليل الذكي",
    "الوصول عبر الأجهزة بعد تسجيل الدخول",
    "دفعة واحدة، بلا اشتراك",
  ],
  unlock: "افتح مقابل {price}",
  signInToUnlock: "سجّل الدخول لفتح التجربة",
  unavailable: "هذا التصريح غير متاح للشراء حالياً.",
  continueFree: "المتابعة مع الدليل المجاني",
  trust: "دفع آمن عبر Stripe Checkout. بلا اشتراك. تذاكر الدخول والنقل العام غير مشمولة.",
  activeUntil: "التصريح فعّال حتى {date}",
  continuePremium: "متابعة التجربة المميزة",
  premiumAudio: "صوت لوبيك الخفية المميز",
  checkoutLoading: "جارٍ فتح صفحة الدفع الآمنة…",
  checkoutError: "تعذر بدء الدفع. حاول مرة أخرى.",
  close: "إغلاق",
};

export function getCityPassCopy(locale: Locale): CityPassCopy {
  if (locale === "de") return de;
  if (locale === "fr") return fr;
  if (locale === "ar") return ar;
  return en;
}
