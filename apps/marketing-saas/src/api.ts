export const messages: Record<string, string> = {
  CONFIRMED_FACTS_REQUIRED:
    "Bitte zuerst mindestens eine Unternehmensangabe bestätigen.",
  SHORTER_FACTS_REQUIRED:
    "Bitte höchstens 24 bestätigte Aussagen mit jeweils bis zu 500 Zeichen verwenden.",
  RATE_LIMITED:
    "Zu viele Generierungen. Bitte in einer Minute erneut versuchen.",
  CONCURRENT_LIMIT: "Es laufen bereits zwei Aufträge. Bitte kurz warten.",
  GLOBAL_BUDGET_EXHAUSTED:
    "Das gemeinsame KI-Budget ist aufgebraucht. Bitte den Betreiber kontaktieren.",
  PER_PACK_COST_LIMIT:
    "Die Kostengrenze für diesen Auftrag würde überschritten. Bitte den Betreiber kontaktieren.",
  STALE_VERSION:
    "Diese Version wurde bereits bearbeitet. Bitte den Verlauf neu laden; dein Entwurf bleibt hier.",
  PASSWORD_TOO_SHORT: "Bitte ein Passwort mit mindestens 12 Zeichen wählen.",
  INVALID_EMAIL: "Bitte eine gültige E-Mail-Adresse eingeben.",
  INVALID_TOKEN:
    "Dieser Link ist ungültig oder abgelaufen. Bitte einen neuen anfordern.",
  SIGN_IN_REQUIRED: "Bitte erneut anmelden.",
  STALE_REVISION:
    "In einem anderen Tab wurde etwas geändert. Dein Entwurf bleibt hier. Bitte Projekt neu laden und Änderungen abgleichen.",
  READ_ONLY: "Du hast für dieses Projekt nur Leserechte.",
  PROJECT_NOT_FOUND: "Dieses Projekt ist nicht verfügbar.",
  INVALID_INPUT: "Bitte die Eingaben prüfen.",
  INVALID_EMAIL_OR_PASSWORD: "E-Mail oder Passwort ist nicht korrekt.",
  EMAIL_NOT_VERIFIED: "Bitte zuerst deine E-Mail-Adresse bestätigen.",
  TOO_MANY_REQUESTS: "Zu viele Versuche. Bitte kurz warten.",
  QUOTA_EXHAUSTED:
    "Dein monatliches Kontingent ist aufgebraucht. Vorhandene Inhalte kannst du weiterhin bearbeiten und exportieren.",
  PROVIDER_NOT_CONFIGURED:
    "KI ist noch nicht konfiguriert. Bitte den Betreiber kontaktieren.",
};
export async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: data === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      messages[body.code] ??
        messages[body.error] ??
        body.message ??
        `Anfrage fehlgeschlagen (${response.status}). Bitte erneut versuchen.`,
    );
  return body as T;
}
