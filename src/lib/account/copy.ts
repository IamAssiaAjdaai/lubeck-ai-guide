import type { Locale } from "@/lib/i18n";

export type AccountCopy = Readonly<{
  saveTrip: string;
  title: string;
  description: string;
  displayName: string;
  email: string;
  password: string;
  signIn: string;
  signUp: string;
  createAccount: string;
  signingIn: string;
  creatingAccount: string;
  signOut: string;
  signingOut: string;
  accountCreated: string;
  genericSignInError: string;
  genericSignUpError: string;
  guestLinkError: string;
  signedInAs: string;
  preferredLanguage: string;
  backToTrip: string;
}>;

const en: AccountCopy = {
  saveTrip: "Save your trip",
  title: "Your CITYWALK account",
  description: "Create an account after exploring to keep your trip connected across visits and devices.",
  displayName: "Display name",
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signUp: "Create account",
  createAccount: "Create account",
  signingIn: "Signing in…",
  creatingAccount: "Creating account…",
  signOut: "Sign out",
  signingOut: "Signing out…",
  accountCreated: "Account created. Sign in to connect this trip.",
  genericSignInError: "Sign-in failed. Check your details and try again.",
  genericSignUpError: "Account creation failed. Check your details and try again.",
  guestLinkError: "You are signed in, but this guest trip could not be linked automatically.",
  signedInAs: "Signed in as",
  preferredLanguage: "Preferred language",
  backToTrip: "Back to trip",
};

const de: AccountCopy = {
  ...en,
  saveTrip: "Reise speichern",
  title: "Dein CITYWALK-Konto",
  description: "Erstelle nach dem Erkunden ein Konto, damit deine Reise über Besuche und Geräte hinweg verbunden bleibt.",
  displayName: "Anzeigename",
  password: "Passwort",
  signIn: "Anmelden",
  signUp: "Konto erstellen",
  createAccount: "Konto erstellen",
  signingIn: "Anmeldung läuft…",
  creatingAccount: "Konto wird erstellt…",
  signOut: "Abmelden",
  signingOut: "Abmeldung läuft…",
  accountCreated: "Konto erstellt. Melde dich an, um diese Reise zu verbinden.",
  genericSignInError: "Anmeldung fehlgeschlagen. Prüfe deine Angaben und versuche es erneut.",
  genericSignUpError: "Konto konnte nicht erstellt werden. Prüfe deine Angaben und versuche es erneut.",
  guestLinkError: "Du bist angemeldet, aber diese Gast-Reise konnte nicht automatisch verbunden werden.",
  signedInAs: "Angemeldet als",
  preferredLanguage: "Bevorzugte Sprache",
  backToTrip: "Zurück zur Reise",
};

const fr: AccountCopy = {
  ...en,
  saveTrip: "Enregistrer le voyage",
  title: "Votre compte CITYWALK",
  description: "Créez un compte après avoir exploré afin de conserver votre voyage entre vos visites et vos appareils.",
  displayName: "Nom affiché",
  password: "Mot de passe",
  signIn: "Se connecter",
  signUp: "Créer un compte",
  createAccount: "Créer un compte",
  signingIn: "Connexion…",
  creatingAccount: "Création du compte…",
  signOut: "Se déconnecter",
  signingOut: "Déconnexion…",
  accountCreated: "Compte créé. Connectez-vous pour associer ce voyage.",
  genericSignInError: "Échec de la connexion. Vérifiez vos informations et réessayez.",
  genericSignUpError: "Impossible de créer le compte. Vérifiez vos informations et réessayez.",
  guestLinkError: "Vous êtes connecté, mais ce voyage invité n’a pas pu être associé automatiquement.",
  signedInAs: "Connecté en tant que",
  preferredLanguage: "Langue préférée",
  backToTrip: "Retour au voyage",
};

const ar: AccountCopy = {
  ...en,
  saveTrip: "احفظ رحلتك",
  title: "حسابك في CITYWALK",
  description: "أنشئ حساباً بعد الاستكشاف للاحتفاظ برحلتك بين الزيارات وعلى أجهزتك المختلفة.",
  displayName: "الاسم الظاهر",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  signIn: "تسجيل الدخول",
  signUp: "إنشاء حساب",
  createAccount: "إنشاء حساب",
  signingIn: "جارٍ تسجيل الدخول…",
  creatingAccount: "جارٍ إنشاء الحساب…",
  signOut: "تسجيل الخروج",
  signingOut: "جارٍ تسجيل الخروج…",
  accountCreated: "تم إنشاء الحساب. سجّل الدخول لربط هذه الرحلة.",
  genericSignInError: "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.",
  genericSignUpError: "تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.",
  guestLinkError: "تم تسجيل دخولك، لكن تعذر ربط رحلة الضيف هذه تلقائياً.",
  signedInAs: "تم تسجيل الدخول باسم",
  preferredLanguage: "اللغة المفضلة",
  backToTrip: "العودة إلى الرحلة",
};

export function getAccountCopy(locale: Locale): AccountCopy {
  if (locale === "de") return de;
  if (locale === "fr") return fr;
  if (locale === "ar") return ar;
  return en;
}
