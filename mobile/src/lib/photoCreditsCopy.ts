import type { NativeLocale } from "./api/contracts";

// Presentation translations only. Rights, creator names and source/license URLs
// remain in the verified photoCredits / welcomePhotos inventory.
const copy = {
  en: ["Image Credits", "Legal & Information", "Creators, sources, licenses and modifications for verified CITYWALK photographs. Featured cities do not imply destination availability.", "Creator", "Usage and modifications", "Image files", "Original source", "License", "The link could not be opened. Please try again."],
  de: ["Bildnachweise", "Rechtliches & Informationen", "Urheber, Quellen, Lizenzen und Bearbeitungen der verifizierten CITYWALK-Fotos. Abgebildete Städte sind keine Zusage ihrer Verfügbarkeit.", "Urheber", "Verwendung und Bearbeitungen", "Bilddateien", "Originalquelle", "Lizenz", "Der Link konnte nicht geöffnet werden. Bitte erneut versuchen."],
  es: ["Créditos de imágenes", "Información legal", "Autores, fuentes, licencias y modificaciones de las fotografías verificadas de CITYWALK. Las ciudades mostradas no implican disponibilidad del destino.", "Autor", "Uso y modificaciones", "Archivos de imagen", "Fuente original", "Licencia", "No se pudo abrir el enlace. Inténtalo de nuevo."],
  nl: ["Beeldverantwoording", "Juridisch & informatie", "Makers, bronnen, licenties en bewerkingen van geverifieerde CITYWALK-foto’s. Afgebeelde steden zijn geen toezegging van beschikbaarheid.", "Maker", "Gebruik en bewerkingen", "Afbeeldingsbestanden", "Oorspronkelijke bron", "Licentie", "De link kon niet worden geopend. Probeer het opnieuw."],
  da: ["Billedkreditering", "Juridisk & information", "Ophavspersoner, kilder, licenser og ændringer for verificerede CITYWALK-fotos. De viste byer er ikke et løfte om tilgængelighed.", "Ophavsperson", "Brug og ændringer", "Billedfiler", "Oprindelig kilde", "Licens", "Linket kunne ikke åbnes. Prøv igen."],
  sv: ["Bildkreditering", "Juridik & information", "Upphovspersoner, källor, licenser och ändringar för verifierade CITYWALK-foton. Visade städer innebär inte att resmålet är tillgängligt.", "Upphovsperson", "Användning och ändringar", "Bildfiler", "Ursprunglig källa", "Licens", "Länken kunde inte öppnas. Försök igen."],
  ar: ["حقوق الصور", "المعلومات القانونية", "المصورون والمصادر والتراخيص والتعديلات لصور CITYWALK المتحقق منها. عرض المدن لا يعني توفرها كوجهات.", "المصور أو صاحب الحقوق", "الاستخدام والتعديلات", "ملفات الصور", "المصدر الأصلي", "الترخيص", "تعذر فتح الرابط. يرجى المحاولة مرة أخرى."],
} as const satisfies Record<NativeLocale, readonly string[]>;

export function photoCreditsCopy(locale: NativeLocale) {
  const [title, legalTitle, description, creator, usage, assets, source, license, failed] = copy[locale];
  return { title, legalTitle, description, creator, usage, assets, source, license, failed };
}

// Exact translations of the existing usage/modification records, keyed by the
// same reviewed image identities. Original EN/DE records remain unchanged.
export const translatedPhotoUsage = {
 es: {
  prague: "Bienvenida y presentación del producto. Redimensionada y recortada de 1954 × 3474 a 1200 × 2600; convertida a WebP; encuadre adaptable.",
  hamburg: "Bienvenida, presentación y vistas previas de ciudades. Inicio/ciudad: derivado WebP redimensionado. Bienvenida: recorte vertical a 1200 × 2600. Encuadre adaptable; los derivados conservan CC BY-SA 3.0.",
  duesseldorf: "Bienvenida y vistas previas de ciudades. Derivados WebP redimensionados; recorte vertical de bienvenida: 1200 × 2600. Encuadre adaptable. Publicada originalmente en Pixabay bajo CC0; el registro de origen enlaza esa publicación.",
  lubeck: "Holstentor, Lübeck: bienvenida, presentación, selección/entrada de ciudad, City Hub, paseos sugeridos con esta foto, Explorar y detalles del lugar. Píxeles del JPEG original sin cambios; la visualización escala/recorta. Bienvenida: miniatura de 3840 × 3226 redimensionada y recortada a 1200 × 2600, convertida a WebP. Los derivados conservan CC BY-SA 3.0 DE.",
 },
 nl: {
  prague: "Welkom en productintroductie. Verkleind en bijgesneden van 1954 × 3474 naar 1200 × 2600; omgezet naar WebP; responsieve uitsnede.",
  hamburg: "Welkom, productintroductie en stadsvoorbeelden. Start/stad: verkleinde WebP-versie. Welkom: verkleind en staand bijgesneden tot 1200 × 2600. Responsieve uitsnede; afgeleiden behouden CC BY-SA 3.0.",
  duesseldorf: "Welkom en stadsvoorbeelden. Verkleinde WebP-versies; staande welkomuitsnede: 1200 × 2600. Responsieve uitsnede. Oorspronkelijk op Pixabay gepubliceerd onder CC0; de bron verwijst naar die publicatie.",
  lubeck: "Holstentor, Lübeck: welkom, productintroductie, stadskeuze/-toegang, City Hub, voorgestelde wandelingen met deze foto, Ontdekken en plaatsdetails. Oorspronkelijke JPEG-pixels ongewijzigd; weergave schaalt/snijdt bij. Welkom: miniatuur van 3840 × 3226 verkleind en staand bijgesneden tot 1200 × 2600, omgezet naar WebP. Afgeleiden behouden CC BY-SA 3.0 DE.",
 },
 da: {
  prague: "Velkomst og produktintroduktion. Skaleret og beskåret fra 1954 × 3474 til 1200 × 2600; konverteret til WebP; responsiv beskæring.",
  hamburg: "Velkomst, produktintroduktion og byvisninger. Start/by: skaleret WebP-version. Velkomst: skaleret og beskåret til højformat på 1200 × 2600. Responsiv beskæring; afledte billeder beholder CC BY-SA 3.0.",
  duesseldorf: "Velkomst og byvisninger. Skalerede WebP-versioner; velkomst i højformat: 1200 × 2600. Responsiv beskæring. Oprindeligt udgivet på Pixabay under CC0; kilden linker til udgivelsen.",
  lubeck: "Holstentor, Lübeck: velkomst, produktintroduktion, byvalg/-indgang, City Hub, foreslåede ture med dette foto, Udforsk og steddetaljer. Originale JPEG-pixels uændrede; visningen skalerer/beskærer. Velkomst: miniature på 3840 × 3226 skaleret og beskåret til 1200 × 2600, konverteret til WebP. Afledte billeder beholder CC BY-SA 3.0 DE.",
 },
 sv: {
  prague: "Välkomstskärm och produktintroduktion. Skalad och beskuren från 1954 × 3474 till 1200 × 2600; konverterad till WebP; responsiv beskärning.",
  hamburg: "Välkomstskärm, produktintroduktion och stadsförhandsvisningar. Start/stad: skalad WebP-version. Välkomstskärm: skalad och beskuren till stående 1200 × 2600. Responsiv beskärning; bearbetningar behåller CC BY-SA 3.0.",
  duesseldorf: "Välkomstskärm och stadsförhandsvisningar. Skalade WebP-versioner; stående välkomstbeskärning: 1200 × 2600. Responsiv beskärning. Ursprungligen publicerad på Pixabay under CC0; källan länkar till publiceringen.",
  lubeck: "Holstentor, Lübeck: välkomstskärm, produktintroduktion, stadsval/-ingång, City Hub, föreslagna promenader med fotot, Utforska och platsdetaljer. Ursprungliga JPEG-pixlar oförändrade; visningen skalar/beskär. Välkomstskärm: miniatyr på 3840 × 3226 skalad och beskuren till 1200 × 2600, konverterad till WebP. Bearbetningar behåller CC BY-SA 3.0 DE.",
 },
 ar: {
  prague: "الترحيب والتعريف بالمنتج. تغيير الحجم والاقتصاص من 1954 × 3474 إلى 1200 × 2600؛ التحويل إلى WebP؛ اقتصاص متجاوب عند العرض.",
  hamburg: "الترحيب والتعريف بالمنتج ومعاينات المدن. الرئيسية/المدينة: نسخة WebP مع تغيير الحجم. الترحيب: تغيير الحجم واقتصاص عمودي إلى 1200 × 2600. اقتصاص متجاوب؛ تحتفظ النسخ المعدلة بترخيص CC BY-SA 3.0.",
  duesseldorf: "الترحيب ومعاينات المدن. نسخ WebP مع تغيير الحجم؛ اقتصاص الترحيب العمودي: 1200 × 2600. اقتصاص متجاوب. نُشرت أصلاً على Pixabay بترخيص CC0؛ يتضمن سجل المصدر رابط ذلك المنشور.",
  lubeck: "هولشتنتور، لوبيك: الترحيب والتعريف بالمنتج واختيار/دخول المدينة وCity Hub والمشي المقترح الذي يستخدم الصورة والاستكشاف وتفاصيل المكان. بكسلات JPEG الأصلية دون تعديل؛ العرض يغير الحجم ويقتص. الترحيب: صورة مصغرة من 3840 × 3226 إلى 1200 × 2600 مع اقتصاص عمودي وتحويل إلى WebP. تحتفظ النسخ المعدلة بترخيص CC BY-SA 3.0 DE.",
 },
} as const;
