import { isSharedLocale } from "@citywalk/i18n";
import productEditorial from "@/data/cityPassEditorial.json";
import { cityPassCopy } from "@citywalk/i18n/adapters";
import type { Locale } from "@/lib/i18n";
import type { CityPassConfiguration } from "@/lib/commerce/cityPassConfig";

export type CityPassCopy = Readonly<{
  actualLocale: Locale;
  editorialLocale?: Locale;
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

const en: CityPassCopy = { ...cityPassCopy("en"), actualLocale: "en", ...productEditorial.en };

const de: CityPassCopy = { ...cityPassCopy("de"), actualLocale: "de", ...productEditorial.de };

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

const ar: CityPassCopy = { ...cityPassCopy("ar"), actualLocale: "ar", ...productEditorial.ar };

export function getCityPassCopy(
  configuration: Pick<CityPassConfiguration, "copyKey">,
  locale: Locale,
): CityPassCopy {
  if (configuration.copyKey !== "hidden-lubeck") {
    throw new Error("CITY_PASS_COPY_NOT_CONFIGURED");
  }
  if (locale === "de") return de;
  if (locale === "fr") return fr;
  if (locale === "ar") return ar;
  if (isSharedLocale(locale)) return { ...en, ...cityPassCopy(locale), actualLocale: locale, editorialLocale: "en" };
  return en;
}
