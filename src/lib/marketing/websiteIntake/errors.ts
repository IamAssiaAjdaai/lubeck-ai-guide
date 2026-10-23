export class WebsiteIntakeError extends Error {
  constructor(readonly code: "INVALID_URL" | "UNSAFE_DESTINATION" | "NETWORK" | "TIMEOUT" | "TOO_LARGE" | "UNSUPPORTED_CONTENT" | "EMPTY_PAGE" | "POLICY" | "LIMIT", readonly status = 422) {
    super(code); this.name = "WebsiteIntakeError";
  }
}
export const intakeErrorMessages = {
  INVALID_URL: "Bitte eine öffentliche HTTPS-Adresse ohne Zugangsdaten eingeben.",
  UNSAFE_DESTINATION: "Diese Adresse ist für den Website-Import nicht erlaubt.",
  NETWORK: "Die Website ist nicht erreichbar. Bitte später erneut versuchen oder den Kurzbrief ausfüllen.",
  TIMEOUT: "Die Website antwortet zu langsam. Bitte den Kurzbrief verwenden.",
  TOO_LARGE: "Die Website ist zu groß für den Import. Bitte den Kurzbrief verwenden.",
  UNSUPPORTED_CONTENT: "Nur HTML-Seiten werden unterstützt. Bitte den Kurzbrief verwenden.",
  EMPTY_PAGE: "Keine ausreichenden sichtbaren Angaben gefunden. Bitte den Kurzbrief ergänzen.",
  POLICY: "Die Website erlaubt diesen Import nicht. Bitte den Kurzbrief verwenden.",
  LIMIT: "Zu viele Importversuche. Bitte in einer Minute erneut versuchen.",
} as const;
