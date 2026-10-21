export const messages: Record<string,string> = {
 SIGN_IN_REQUIRED:"Bitte erneut anmelden.", STALE_REVISION:"In einem anderen Tab wurde etwas geändert. Dein Entwurf bleibt hier. Bitte Projekt neu laden und Änderungen abgleichen.",
 READ_ONLY:"Du hast für dieses Projekt nur Leserechte.", PROJECT_NOT_FOUND:"Dieses Projekt ist nicht verfügbar.",
 INVALID_INPUT:"Bitte die Eingaben prüfen.", INVALID_EMAIL_OR_PASSWORD:"E-Mail oder Passwort ist nicht korrekt.",
 EMAIL_NOT_VERIFIED:"Bitte zuerst deine E-Mail-Adresse bestätigen.", TOO_MANY_REQUESTS:"Zu viele Versuche. Bitte kurz warten.",
 QUOTA_EXHAUSTED:"Dein monatliches Kontingent ist aufgebraucht. Vorhandene Inhalte kannst du weiterhin bearbeiten und exportieren.",
 PROVIDER_NOT_CONFIGURED:"KI ist noch nicht konfiguriert. Bitte den Betreiber kontaktieren.",
};
export async function api<T>(path:string,data?:unknown):Promise<T> {
 const response=await fetch(path,{method:data===undefined?"GET":"POST",credentials:"same-origin",headers:data===undefined?{}:{"Content-Type":"application/json"},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const body=await response.json();
 if(!response.ok) throw new Error(body.message??messages[body.error]??messages[body.code]??`Anfrage fehlgeschlagen (${response.status}). Bitte erneut versuchen.`);
 return body as T;
}
