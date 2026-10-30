import type { NativeLocale } from "./api/contracts";

type IntroductionCopy = Readonly<{
  title: string;
  description: string;
  featureDescriptions: readonly [string, string, string, string];
  features: readonly [string, string, string, string];
  next: string;
  back: string;
  availability: string;
}>;

export const introductionCopy: Record<NativeLocale, IntroductionCopy> = {
  en: { description: "Curated experiences, local stories\nand hidden gems – all in one app.", featureDescriptions: ["Explore the best of each city on foot.", "Hear the stories behind the places.", "Discover unique places off the beaten path.", "Get tips, recommendations and insights."], title: "More than\njust sightseeing", features: ["Curated walking routes", "Local stories & audio", "Hidden gems", "A personal city guide"], next: "Next", back: "Back", availability: "Features vary by city and language." },
  de: { description: "Kuratierte Erlebnisse, lokale Geschichten\nund verborgene Schätze – alles in einer App.", featureDescriptions: ["Entdecke die Stadt zu Fuß.", "Höre die Geschichten hinter den Orten.", "Entdecke besondere Orte abseits bekannter Wege.", "Erhalte Tipps, Empfehlungen und Einblicke."], title: "Mehr als nur\nSehenswürdigkeiten", features: ["Kuratierte Spaziergänge", "Lokale Geschichten & Audio", "Verborgene Schätze", "Dein persönlicher Stadtguide"], next: "Weiter", back: "Zurück", availability: "Funktionen variieren je nach Stadt und Sprache." },
  es: { description: "Experiencias seleccionadas, historias locales\ny joyas ocultas, todo en una app.", featureDescriptions: ["Explora lo mejor de cada ciudad a pie.", "Escucha las historias de cada lugar.", "Descubre lugares únicos fuera de lo habitual.", "Recibe consejos, recomendaciones e ideas."], title: "Mucho más\nque hacer turismo", features: ["Rutas a pie seleccionadas", "Historias locales y audio", "Joyas ocultas", "Tu guía personal de la ciudad"], next: "Siguiente", back: "Volver", availability: "Las funciones varían según la ciudad y el idioma." },
  nl: { description: "Bijzondere ervaringen, lokale verhalen\nen verborgen parels – alles in één app.", featureDescriptions: ["Ontdek het beste van elke stad te voet.", "Hoor de verhalen achter de plekken.", "Ontdek unieke plekken buiten de gebaande paden.", "Krijg tips, aanbevelingen en inzichten."], title: "Meer dan alleen\nbezienswaardigheden", features: ["Samengestelde wandelroutes", "Lokale verhalen en audio", "Verborgen parels", "Een persoonlijke stadsgids"], next: "Volgende", back: "Terug", availability: "Functies verschillen per stad en taal." },
  da: { description: "Udvalgte oplevelser, lokale historier\nog skjulte perler – alt i én app.", featureDescriptions: ["Oplev det bedste af hver by til fods.", "Hør historierne bag stederne.", "Find unikke steder væk fra de kendte stier.", "Få tips, anbefalinger og indsigt."], title: "Mere end\nseværdigheder", features: ["Udvalgte vandreruter", "Lokale historier og lyd", "Skjulte perler", "Din personlige byguide"], next: "Næste", back: "Tilbage", availability: "Funktioner varierer efter by og sprog." },
  sv: { description: "Utvalda upplevelser, lokala berättelser\noch dolda pärlor – allt i en app.", featureDescriptions: ["Upptäck det bästa av varje stad till fots.", "Hör berättelserna bakom platserna.", "Hitta unika platser bortom de vanliga stråken.", "Få tips, rekommendationer och insikter."], title: "Mer än bara\nsevärdheter", features: ["Utvalda promenadrutter", "Lokala berättelser och ljud", "Dolda pärlor", "En personlig stadsguide"], next: "Nästa", back: "Tillbaka", availability: "Funktionerna varierar mellan städer och språk." },
  ar: { description: "تجارب مختارة وحكايات محلية\nوكنوز خفية – كلها في تطبيق واحد.", featureDescriptions: ["اكتشف أجمل ما في كل مدينة سيرًا على الأقدام.", "استمع إلى الحكايات وراء الأماكن.", "اكتشف أماكن مميزة بعيدًا عن المسارات المعتادة.", "احصل على نصائح وتوصيات ورؤى."], title: "أكثر من مجرد\nمشاهدة المعالم", features: ["مسارات مشي مختارة", "حكايات محلية ومقاطع صوتية", "كنوز خفية", "دليلك الشخصي للمدينة"], next: "التالي", back: "رجوع", availability: "تختلف الميزات حسب المدينة واللغة." },
};
