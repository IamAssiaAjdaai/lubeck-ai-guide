import en from "./copy/en.json";
import de from "./copy/de.json";
import ar from "./copy/ar.json";
export type WalkCopy = typeof en;
export function walkCopy(locale: string): WalkCopy {
  return locale === "ar" ? ar : locale === "de" ? de : en;
}
export function walkCopyLocale(locale: string) {
  return locale === "ar" ? "ar" : locale === "de" ? "de" : "en";
}

// Public taxonomy identifiers remain stable in planner settings and API context.
// Labels are presentation only; new editorial tags retain a readable fallback.
const categoryLabels: Record<string, readonly [string, string, string]> = {
  "must-see": ["Must-see sights", "Sehenswürdigkeiten", "أهم المعالم"],
  unesco: ["UNESCO", "UNESCO", "اليونسكو"],
  outdoor: ["Outdoors", "Im Freien", "في الهواء الطلق"],
  "photo-spot": ["Photo spots", "Fotomotive", "أماكن للتصوير"],
  "brick-gothic": ["Brick Gothic", "Backsteingotik", "القوطية بالطوب"],
  "city-gate": ["City gates", "Stadttore", "بوابات المدينة"],
  church: ["Churches", "Kirchen", "الكنائس"],
  indoor: ["Indoors", "Drinnen", "أماكن داخلية"],
  viewpoint: ["Viewpoints", "Aussichtspunkte", "نقاط الإطلالة"],
  "social-history": ["Social history", "Sozialgeschichte", "التاريخ الاجتماعي"],
  medieval: ["Medieval", "Mittelalter", "العصور الوسطى"],
  hospital: ["Historic hospitals", "Historische Hospitäler", "المستشفيات التاريخية"],
  renaissance: ["Renaissance", "Renaissance", "عصر النهضة"],
  "town-hall": ["Town halls", "Rathäuser", "دور البلدية"],
  politics: ["Politics", "Politik", "السياسة"],
  waterfront: ["Waterfront", "Am Wasser", "الواجهة المائية"],
  walk: ["Walking", "Spazieren", "المشي"],
  courtyard: ["Courtyards", "Innenhöfe", "الأفنية"],
  alley: ["Alleys", "Gassen", "الأزقة"],
  quiet: ["Quiet places", "Ruhige Orte", "أماكن هادئة"],
  literature: ["Literature", "Literatur", "الأدب"],
  "thomas-mann": ["Thomas Mann", "Thomas Mann", "توماس مان"],
  marzipan: ["Marzipan", "Marzipan", "المرصبان"],
  seafood: ["Seafood", "Fisch und Meeresfrüchte", "المأكولات البحرية"],
  mediterranean: ["Mediterranean food", "Mediterrane Küche", "مأكولات متوسطية"],
  wine: ["Wine", "Wein", "النبيذ"],
  brewery: ["Breweries", "Brauereien", "مصانع الجعة"],
  entertainment: ["Entertainment", "Unterhaltung", "الترفيه"],
  theatre: ["Theatre", "Theater", "المسرح"],
  magic: ["Magic", "Zauberei", "السحر"],
  "puppet-theatre": ["Puppet theatre", "Figurentheater", "مسرح العرائس"],
  "escape-room": ["Escape rooms", "Escape-Räume", "غرف الهروب"],
  team: ["Team activities", "Teamaktivitäten", "أنشطة جماعية"],
};
export function walkCategoryLabel(tag: string, locale: string): string {
  return categoryLabels[tag]?.[locale === "ar" ? 2 : locale === "de" ? 1 : 0] ?? tag.replaceAll("-", " ");
}
