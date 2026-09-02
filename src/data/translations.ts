export const translations = {
  en: {
    discover: "Discover Lübeck",
    places: "5 historic places to explore",
    startTour: "Start Walking Tour",
    back: "Back",
    audioGuide: "Audio guide",
    listenStory: "Listen to the story",
    story: "The Story",
    quickFacts: "Quick Facts",
    askAI: "Ask your AI Guide",
    nextStop: "Next Stop",
    finishTour: "Finish Tour",
  },

  de: {
    discover: "Entdecke Lübeck",
    places: "5 historische Orte entdecken",
    startTour: "Stadtrundgang starten",
    back: "Zurück",
    audioGuide: "Audioguide",
    listenStory: "Geschichte anhören",
    story: "Die Geschichte",
    quickFacts: "Kurzinfos",
    askAI: "Frag deinen AI Guide",
    nextStop: "Nächster Stopp",
    finishTour: "Tour beenden",
  },

  fr: {
    discover: "Découvrez Lübeck",
    places: "5 lieux historiques à découvrir",
    startTour: "Commencer la visite",
    back: "Retour",
    audioGuide: "Guide audio",
    listenStory: "Écouter l’histoire",
    story: "L’histoire",
    quickFacts: "Infos rapides",
    askAI: "Demandez à votre guide IA",
    nextStop: "Étape suivante",
    finishTour: "Terminer la visite",
  },

  ar: {
    discover: "اكتشف لوبيك",
    places: "اكتشف 5 أماكن تاريخية",
    startTour: "ابدأ الجولة",
    back: "رجوع",
    audioGuide: "الدليل الصوتي",
    listenStory: "استمع إلى القصة",
    story: "القصة",
    quickFacts: "معلومات سريعة",
    askAI: "اسأل دليلك الذكي",
    nextStop: "المحطة التالية",
    finishTour: "إنهاء الجولة",
  },
} as const;

export type Locale = keyof typeof translations;

export const locales: Locale[] = ["en", "de", "fr", "ar"];