import { welcomePhotos, welcomeCopy } from "./welcomeCopy";
import type { NativeLocale } from "./api/contracts";

// Individually reviewed bundled images only. CMS attribution is never silently
// moved based on a recognizable license name or a photographer-name substring.
const details = {
  prague: {
    title: "Historic Prague Skyline with Tyn Church",
    creator: "Jean Paul Montanaro",
    assets: "welcome-prague.webp",
    en: "Welcome and Product Value Story. Resized and cropped from 1954 × 3474 to 1200 × 2600; converted to WebP; responsive cover framing.",
    de: "Willkommen und Produktvorstellung. Von 1954 × 3474 auf 1200 × 2600 skaliert und zugeschnitten; in WebP umgewandelt; responsiver Bildausschnitt.",
  },
  hamburg: {
    title: "Hamburg - Elbphilharmonie - 2016-2.jpg",
    creator: "Avda",
    assets: "home-hamburg.webp, welcome-hamburg.webp; /images/city-hamburg.webp",
    en: "Welcome, Product Value Story and city previews. Home/city preview: resized WebP derivative. Welcome: resized and portrait-cropped to 1200 × 2600. Responsive cover framing; derivatives retain CC BY-SA 3.0.",
    de: "Willkommen, Produktvorstellung und Städtevorschauen. Startseite/Städtevorschau: skalierte WebP-Fassung. Willkommen: skaliert und auf 1200 × 2600 im Hochformat zugeschnitten. Responsiver Bildausschnitt; Bearbeitungen behalten CC BY-SA 3.0 bei.",
  },
  duesseldorf: {
    title: "Rheinturm, Duesseldorf.jpg",
    creator: "Turmfalke",
    assets: "home-duesseldorf.webp, welcome-duesseldorf.webp; /images/city-duesseldorf.webp",
    en: "Welcome and city previews. Resized WebP derivatives; Welcome portrait crop: 1200 × 2600. Responsive cover framing. Originally published on Pixabay as CC0; source record links to that publication.",
    de: "Willkommen und Städtevorschauen. Skalierte WebP-Fassungen; Hochformat-Zuschnitt für Willkommen: 1200 × 2600. Responsiver Bildausschnitt. Ursprünglich auf Pixabay unter CC0 veröffentlicht; der Quellnachweis verlinkt diese Veröffentlichung.",
  },
  lubeck: {
    title: "Holstentor in Lübeck Frontseite.jpg",
    creator: "Christian Wolf (www.c-w-design.de)",
    assets: "introduction-holstentor.jpg, welcome-holstentor.webp",
    en: "Holstentor, Lübeck — Welcome, Product Value Story, city selection/entry, City Hub, suggested walks using this photo, Explore and Place Detail. Original introduction JPEG pixels unchanged; native display resizes/crops it. Welcome: 3840 × 3226 thumbnail resized and portrait-cropped to 1200 × 2600, converted to WebP. Photo derivatives retain CC BY-SA 3.0 DE.",
    de: "Holstentor, Lübeck — Willkommen, Produktvorstellung, Stadtauswahl/-einstieg, Stadtübersicht, Spaziergangsvorschläge mit diesem Foto, Entdecken und Ortsdetails. Pixel der ursprünglichen Introduction-JPEG unverändert; für die Anzeige skaliert/zugeschnitten. Willkommen: 3840 × 3226 auf 1200 × 2600 skaliert und im Hochformat zugeschnitten, in WebP umgewandelt. Fotobearbeitungen behalten CC BY-SA 3.0 DE bei.",
  },
} as const;

export const photoCreditEntries = welcomePhotos.map(photo => ({
  id: photo.id,
  source: photo.source,
  license: photo.license,
  licenseName: photo.licenseName,
  location: photo.city,
  ...details[photo.id],
}));

export function photoCreditsCopy(locale: NativeLocale) {
  const german = locale === "de";
  return {
    title: welcomeCopy[locale].photoCredits,
    description: german ? "Urheber, Quellen, Lizenzen und Bearbeitungen der verifizierten CITYWALK-Fotos. Abgebildete Städte sind keine Zusage ihrer Verfügbarkeit." : "Creators, sources, licenses and modifications for verified CITYWALK photographs. Featured cities do not imply destination availability.",
    creator: german ? "Urheber" : "Creator",
    usage: german ? "Verwendung und Bearbeitungen" : "Usage and modifications",
    assets: german ? "Bilddateien" : "Image files",
    source: german ? "Originalquelle" : "Original source",
    license: german ? "Lizenz" : "License",
    failed: german ? "Der Link konnte nicht geöffnet werden. Bitte erneut versuchen." : "The link could not be opened. Please try again.",
  };
}
