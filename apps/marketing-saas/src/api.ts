export const messages: Record<string, string> = {
  THREE_THEMES_REQUIRED: "Uns fehlen noch ein paar Angaben für drei unterschiedliche Beiträge. Bitte bestätigte Fakten ergänzen. Es wurde kein Kontingent reserviert.",
  THEMES_REVIEW_REQUIRED: "Bitte die drei Themen für den aktuellen Faktenstand prüfen und bestätigen.",
  WORKSPACE_OFFLINE_ONLY: "Diese lokale Workspace-Funktion ist derzeit nicht freigegeben.",
  WORKSPACE_CONTEXT_STALE: "Deine Unternehmensangaben haben sich geändert. Dieser alte Entwurf kann nicht erneut freigegeben werden. Bitte einen neuen Entwurf aus dem aktuellen Faktenstand erstellen.",
  POST_REVIEW_REQUIRED: "Bitte alle drei gespeicherten Beiträge für diesen Stand prüfen und freigeben.",
  CREATIVE_ERASED: "Die Creative-Daten dieses Projekts wurden gelöscht.",
  CREATIVE_BRIEF_REVIEW_REQUIRED:
    "Die Bildgrundlage hat sich geändert. Bitte den Bildbrief erneut prüfen.",
  CREATIVE_KILL_SWITCH:
    "Bildaufträge sind derzeit global gesperrt. Es wurde kein neuer Auftrag gestartet.",
  CREATIVE_GLOBAL_LIMIT:
    "Das globale QA-Bildlimit ist erreicht. Bitte später erneut prüfen.",
  EDIT_REFERENCE_REQUIRED:
    "Bitte mindestens eine freigegebene Referenz auswählen.",
  OWNER_REQUIRED:
    "Diese Löschung kann nur die Inhaberin oder der Inhaber der Organisation durchführen.",
  CREATIVE_REVISION_STALE:
    "Die Creative-Daten wurden geändert. Bitte neu laden und die Löschung erneut bestätigen.",
  ASSET_INTEGRITY_FAILED:
    "Diese Bildquelle fehlt oder wurde verändert. Sie ist gesperrt. Bitte unveränderte Originaldatei wiederherstellen oder eine neue Quelle hochladen und prüfen.",
  CREATIVE_OUTPUT_INTEGRITY_FAILED:
    "Der Bildentwurf fehlt oder wurde verändert. Bitte einen neuen Mock-Entwurf erstellen.",
  MOCK_DISCLOSURE_REGENERATION_REQUIRED:
    "Dieser ältere Mock hat nicht die aktuelle Kennzeichnung. Bitte einen neuen Entwurf erstellen und prüfen.",

  CREATIVE_SNAPSHOT_STALE:
    "Text, Fakten oder Brand Kit haben sich geändert. Bitte den aktuellen Stand neu laden und einen neuen Bildentwurf erstellen.",
  CREATIVE_REVIEW_STALE:
    "Diese Bildversion stimmt nicht mehr mit der Prüfung überein. Bitte neu laden und erneut prüfen.",
  CREATIVE_REVIEW_REQUIRED:
    "Bitte dieses Bild und den zugehörigen gespeicherten Text zuerst gemeinsam prüfen.",
  CREATIVE_ATTACHMENT_REQUIRED:
    "Bitte den geprüften Bildentwurf zuerst an diesen Post anhängen.",
  CREATIVE_UNAVAILABLE:
    "Dieser Entwurf ist abgelaufen oder nicht verfügbar. Bitte einen neuen Mock-Entwurf erstellen.",
  CREATIVE_QUOTA_EXCEEDED:
    "Das Bild-/Video-QA-Limit ist erreicht oder eine Kostenreservierung noch offen. Bitte den Verlauf prüfen; es wird kein weiterer Auftrag gestartet.",
  BRAND_KIT_STALE:
    "Das Brand Kit wurde geändert. Bitte neu laden und die Angaben abgleichen.",
  ASSET_REVISION_STALE:
    "Die Bildangaben wurden geändert. Bitte neu laden und diese Version erneut prüfen.",
  APPROVED_ASSET_REQUIRED:
    "Eine Bildquelle ist nicht mehr freigegeben. Bitte die Mediathek und das Brand Kit prüfen.",
  APPROVED_LOGO_REQUIRED:
    "Bitte zuerst ein eigenes Logo in der Mediathek prüfen und freigeben.",
  APPROVED_PHOTO_REQUIRED:
    "Bitte zuerst die ausgewählten Aufnahmen in der Mediathek prüfen und freigeben.",
  IMAGE_UPLOAD_REJECTED:
    "Bild abgelehnt. Bitte PNG, JPEG oder WebP bis 3 MiB und 4096 × 4096 Pixel ohne Animation verwenden.",
  MEDIA_LIBRARY_LIMIT:
    "Die lokale QA-Mediathek ist voll (50 Bilder pro Projekt). Bitte nicht benötigte Dateien löschen.",

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
