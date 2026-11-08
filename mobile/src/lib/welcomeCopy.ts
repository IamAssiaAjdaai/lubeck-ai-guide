import type { NativeLocale } from "./api/contracts";

type WelcomeCopy = Readonly<{
  title: string; start: string; explore: string; photoCredits: string;
  close: string; source: string; license: string; inspiration: string;
  showPhoto: string; guestHint: string; creditError: string;
}>;
export const welcomeCopy: Record<NativeLocale, WelcomeCopy> = {
  en: { title: "Discover cities\ndeeper, your way.", start: "Get Started", explore: "Explore Cities", photoCredits: "Photo credits", close: "Close", source: "View source photo", license: "View license", inspiration: "Travel inspiration. Discover currently available cities after getting started.", showPhoto: "Show photo", guestHint: "Browse available cities without an account.", creditError: "The photo link could not be opened. Please try again." },
  de: { title: "Entdecke Städte\nauf deine Art.", start: "Los geht’s", explore: "Städte entdecken", photoCredits: "Bildnachweise", close: "Schließen", source: "Originalfoto ansehen", license: "Lizenz ansehen", inspiration: "Reiseinspiration. Nach dem Start siehst du die aktuell verfügbaren Städte.", showPhoto: "Foto anzeigen", guestHint: "Verfügbare Städte ohne Konto entdecken.", creditError: "Der Bildlink konnte nicht geöffnet werden. Bitte versuche es erneut." },
  es: { title: "Descubre ciudades\na tu manera.", start: "Empezar", explore: "Explorar ciudades", photoCredits: "Créditos de fotos", close: "Cerrar", source: "Ver foto original", license: "Ver licencia", inspiration: "Inspiración de viaje. Descubre las ciudades disponibles al empezar.", showPhoto: "Mostrar foto", guestHint: "Explora las ciudades disponibles sin cuenta.", creditError: "No se pudo abrir el enlace de la foto. Inténtalo de nuevo." },
  nl: { title: "Ontdek steden\nop jouw manier.", start: "Beginnen", explore: "Steden ontdekken", photoCredits: "Fotocredits", close: "Sluiten", source: "Originele foto bekijken", license: "Licentie bekijken", inspiration: "Reisinspiratie. Ontdek de beschikbare steden nadat je begint.", showPhoto: "Foto tonen", guestHint: "Ontdek beschikbare steden zonder account.", creditError: "De fotolink kon niet worden geopend. Probeer het opnieuw." },
  da: { title: "Oplev byer\npå din måde.", start: "Kom i gang", explore: "Udforsk byer", photoCredits: "Fotokreditering", close: "Luk", source: "Se originalfoto", license: "Se licens", inspiration: "Rejseinspiration. Se de tilgængelige byer, når du går i gang.", showPhoto: "Vis foto", guestHint: "Udforsk tilgængelige byer uden en konto.", creditError: "Fotolinket kunne ikke åbnes. Prøv igen." },
  sv: { title: "Upptäck städer\npå ditt sätt.", start: "Kom igång", explore: "Utforska städer", photoCredits: "Bildkreditering", close: "Stäng", source: "Visa originalfoto", license: "Visa licens", inspiration: "Reseinspiration. Se tillgängliga städer när du börjar.", showPhoto: "Visa foto", guestHint: "Upptäck tillgängliga städer utan konto.", creditError: "Fotolänken kunde inte öppnas. Försök igen." },
  ar: { title: "اكتشف المدن بعمق،\nعلى طريقتك.", start: "ابدأ رحلتك", explore: "اكتشف المدن", photoCredits: "حقوق الصور", close: "إغلاق", source: "عرض الصورة الأصلية", license: "عرض الترخيص", inspiration: "صور للإلهام بالسفر. اكتشف المدن المتاحة بعد البدء.", showPhoto: "عرض الصورة", guestHint: "اكتشف المدن المتاحة دون حساب.", creditError: "تعذر فتح رابط الصورة. حاول مرة أخرى." },
};

// Editorial imagery never confers city availability. Discovery still uses the API
// and the shared launch registry; this list supplies no destinations or routes.
export const welcomePhotos = [
  { id: "prague", city: "Prague", credit: "Jean Paul Montanaro · resized and cropped", source: "https://www.pexels.com/photo/historic-prague-skyline-with-tyn-church-35286105/", license: "https://www.pexels.com/license/", licenseName: "Pexels License" },
  { id: "hamburg", city: "Hamburg", credit: "Avda · resized and cropped", source: "https://commons.wikimedia.org/wiki/File:Hamburg_-_Elbphilharmonie_-_2016-2.jpg", license: "https://creativecommons.org/licenses/by-sa/3.0/", licenseName: "CC BY-SA 3.0" },
  { id: "duesseldorf", city: "Düsseldorf", credit: "Turmfalke · resized and cropped", source: "https://commons.wikimedia.org/wiki/File:Rheinturm,_Duesseldorf.jpg", license: "https://creativecommons.org/publicdomain/zero/1.0/", licenseName: "CC0 1.0" },
  { id: "lubeck", city: "Lübeck", credit: "Christian Wolf (c-w-design.de) · resized and cropped", source: "https://commons.wikimedia.org/wiki/File:Holstentor_in_L%C3%BCbeck_Frontseite.jpg", license: "https://creativecommons.org/licenses/by-sa/3.0/de/", licenseName: "CC BY-SA 3.0 DE" },
] as const;
