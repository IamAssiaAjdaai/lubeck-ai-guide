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

const en: CommerceCopy = {
  title: "Purchases & access",
  description: "Review your CITYWALK purchases and premium access. Payments open in a secure hosted checkout.",
  availableProducts: "Available products",
  currentPurchases: "Purchase history",
  currentAccess: "Your access",
  continueCheckout: "Continue to secure checkout",
  startingCheckout: "Opening secure checkout…",
  checkoutError: "Checkout could not be started. Please try again.",
  noProducts: "No paid CITYWALK products are currently available.",
  noPurchases: "You have no purchases yet.",
  noAccess: "You do not currently have paid access.",
  checkoutPendingMessage: "Payment return received. Access appears only after CITYWALK verifies the payment provider event.",
  checkoutCanceledMessage: "Checkout was canceled. No paid access was granted.",
  secureCheckoutNote: "CITYWALK does not store your card number or CVC.",
  backToAccount: "Back to account",
  expires: "Expires",
};

const de: CommerceCopy = {
  ...en,
  title: "Käufe & Zugriff",
  description: "Prüfe deine CITYWALK-Käufe und Premium-Zugriffe. Zahlungen werden in einem sicheren gehosteten Checkout geöffnet.",
  availableProducts: "Verfügbare Produkte",
  currentPurchases: "Kaufverlauf",
  currentAccess: "Dein Zugriff",
  continueCheckout: "Zum sicheren Checkout",
  startingCheckout: "Sicherer Checkout wird geöffnet…",
  checkoutError: "Checkout konnte nicht gestartet werden. Bitte versuche es erneut.",
  noProducts: "Aktuell sind keine kostenpflichtigen CITYWALK-Produkte verfügbar.",
  noPurchases: "Du hast noch keine Käufe.",
  noAccess: "Du hast aktuell keinen kostenpflichtigen Zugriff.",
  checkoutPendingMessage: "Die Zahlungsrückkehr ist eingegangen. Zugriff erscheint erst nach verifiziertem Zahlungsereignis.",
  checkoutCanceledMessage: "Checkout wurde abgebrochen. Es wurde kein kostenpflichtiger Zugriff gewährt.",
  secureCheckoutNote: "CITYWALK speichert weder Kartennummer noch CVC.",
  backToAccount: "Zurück zum Konto",
  expires: "Läuft ab",
};

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

const ar: CommerceCopy = {
  ...en,
  title: "المشتريات والصلاحيات",
  description: "راجع مشترياتك وصلاحياتك المدفوعة في CITYWALK. يتم الدفع عبر صفحة دفع آمنة ومستضافة.",
  availableProducts: "المنتجات المتاحة",
  currentPurchases: "سجل المشتريات",
  currentAccess: "صلاحياتك",
  continueCheckout: "المتابعة إلى الدفع الآمن",
  startingCheckout: "جارٍ فتح صفحة الدفع الآمنة…",
  checkoutError: "تعذر بدء عملية الدفع. حاول مرة أخرى.",
  noProducts: "لا توجد حالياً منتجات CITYWALK مدفوعة متاحة.",
  noPurchases: "ليس لديك مشتريات بعد.",
  noAccess: "ليس لديك حالياً صلاحيات مدفوعة.",
  checkoutPendingMessage: "تم الرجوع من صفحة الدفع. لن تظهر الصلاحية إلا بعد تحقق CITYWALK من حدث مزود الدفع.",
  checkoutCanceledMessage: "تم إلغاء الدفع. لم يتم منح أي صلاحية مدفوعة.",
  secureCheckoutNote: "لا يخزن CITYWALK رقم بطاقتك أو رمز CVC.",
  backToAccount: "العودة إلى الحساب",
  expires: "تنتهي",
};

export function getCommerceCopy(locale: Locale): CommerceCopy {
  if (locale === "de") return de;
  if (locale === "fr") return fr;
  if (locale === "ar") return ar;
  return en;
}
