import { Linking } from "react-native";

export const CITYWALK_LEGAL_DESTINATIONS = Object.freeze({
  privacy: "https://getcitywalk.com/privacy",
  terms: "https://getcitywalk.com/terms",
  imprint: "https://getcitywalk.com/imprint",
  accountDeletion: "https://getcitywalk.com/account-deletion",
  support: "https://getcitywalk.com/support",
} as const);

export type CitywalkLegalDestination = keyof typeof CITYWALK_LEGAL_DESTINATIONS;

export async function openCitywalkLegalDestination(
  destination: CitywalkLegalDestination,
): Promise<void> {
  await Linking.openURL(CITYWALK_LEGAL_DESTINATIONS[destination]);
}
