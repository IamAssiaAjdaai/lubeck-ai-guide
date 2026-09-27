import { isSharedLocale } from "@citywalk/i18n";
import { commerceCopy } from "@citywalk/i18n/adapters";
import type { Locale } from "@/lib/i18n";

export type CommerceCopy = Readonly<{
  title: string;
  description: string;
  availableProducts: string;
  currentPurchases: string;
  currentAccess: string;
  continueCheckout: string;
  startingCheckout: string;
  checkoutError: string;
  noProducts: string;
  noPurchases: string;
  noAccess: string;
  checkoutPendingMessage: string;
  checkoutCanceledMessage: string;
  secureCheckoutNote: string;
  backToAccount: string;
  expires: string;
}>;

const en: CommerceCopy = commerceCopy("en");

const fr: CommerceCopy = {
  ...en,
  title: "Achats et accès",
  description: "Consultez vos achats CITYWALK et vos accès premium. Le paiement s’ouvre dans une page sécurisée hébergée.",
  availableProducts: "Produits disponibles",
  currentPurchases: "Historique des achats",
  currentAccess: "Vos accès",
  continueCheckout: "Continuer vers le paiement sécurisé",
  startingCheckout: "Ouverture du paiement sécurisé…",
  checkoutError: "Impossible de démarrer le paiement. Réessayez.",
  noProducts: "Aucun produit CITYWALK payant n’est disponible actuellement.",
  noPurchases: "Vous n’avez encore aucun achat.",
  noAccess: "Vous n’avez actuellement aucun accès payant.",
  checkoutPendingMessage: "Retour de paiement reçu. L’accès n’apparaît qu’après vérification de l’événement du prestataire de paiement.",
  checkoutCanceledMessage: "Le paiement a été annulé. Aucun accès payant n’a été accordé.",
  secureCheckoutNote: "CITYWALK ne stocke ni votre numéro de carte ni votre CVC.",
  backToAccount: "Retour au compte",
  expires: "Expire",
};

export function getCommerceCopy(locale: Locale): CommerceCopy {
  if (isSharedLocale(locale)) return commerceCopy(locale);
  if (locale === "fr") return fr;
  return en;
}
