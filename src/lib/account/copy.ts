import { isSharedLocale } from "@citywalk/i18n";
import { accountCopy } from "@citywalk/i18n/adapters";
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
  purchasesAndAccess: string;
  backToTrip: string;
}>;

const en: AccountCopy = accountCopy("en");

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
  purchasesAndAccess: "Achats et accès",
  backToTrip: "Retour au voyage",
};

export function getAccountCopy(locale: Locale): AccountCopy {
  if (isSharedLocale(locale)) return accountCopy(locale);
  if (locale === "fr") return fr;
  return en;
}
