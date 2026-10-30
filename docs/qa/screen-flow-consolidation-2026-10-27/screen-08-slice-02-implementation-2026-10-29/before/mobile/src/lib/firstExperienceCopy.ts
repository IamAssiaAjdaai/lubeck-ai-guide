import type { NativeLocale } from "./api/contracts";
export const firstExperienceCopy: Record<NativeLocale, { title: string; description: string; explore: string }> = {
  en: { title: "You're all set!", description: "Start exploring {city} at your own pace. Your choices are ready when you build a walk.", explore: "Explore {city}" },
  de: { title: "Du bist startklar!", description: "Entdecke {city} in deinem Tempo. Deine Auswahl bleibt für die Planung erhalten.", explore: "{city} entdecken" },
  es: { title: "¡Todo listo!", description: "Explora {city} a tu ritmo. Tus preferencias estarán listas al planificar un paseo.", explore: "Explorar {city}" },
  nl: { title: "Je bent er klaar voor!", description: "Ontdek {city} op jouw tempo. Je keuzes blijven klaarstaan voor je wandeling.", explore: "Ontdek {city}" },
  da: { title: "Du er klar!", description: "Udforsk {city} i dit eget tempo. Dine valg er klar, når du planlægger en gåtur.", explore: "Udforsk {city}" },
  sv: { title: "Allt är klart!", description: "Utforska {city} i din egen takt. Dina val är redo när du planerar en promenad.", explore: "Utforska {city}" },
  ar: { title: "أنت جاهز!", description: "استكشف {city} بالوتيرة التي تناسبك. تفضيلاتك جاهزة عندما تخطط لجولة.", explore: "استكشف {city}" },
};
