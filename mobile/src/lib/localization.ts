import type { NativeLocale } from "./api/contracts";

export const NATIVE_LOCALES = ["en", "de", "ar"] as const;

export type NativeDirection = "ltr" | "rtl";

export type NativeMessages = Readonly<{
  appTagline: string;
  discoverCities: string;
  availableCities: string;
  exploreCity: string;
  tours: string;
  stops: string;
  minutes: string;
  estimatedDuration: string;
  startTour: string;
  startTrip: string;
  stopProgress: string;
  nextStop: string;
  previousStop: string;
  finishTrip: string;
  tripComplete: string;
  tripCompleteDescription: string;
  returnToCity: string;
  fallbackContent: string;
  places: string;
  map: string;
  useLocation: string;
  locationRequesting: string;
  locationDenied: string;
  locationUnavailable: string;
  locationServicesDisabled: string;
  locationProviderUnavailable: string;
  locationFixFailed: string;
  turnOnLocationServices: string;
  retry: string;
  language: string;
  close: string;
  loading: string;
  unavailable: string;
  visitMinutes: string;
  story: string;
  facts: string;
  visitorNote: string;
  audioGuide: string;
  playAudio: string;
  pauseAudio: string;
  replayAudio: string;
  loadingAudio: string;
  audioUnavailable: string;
  askCitywalk: string;
  askGuideTitle: string;
  questionPlaceholder: string;
  sendQuestion: string;
  answer: string;
  sources: string;
  sourceCount: string;
  guideUnavailable: string;
  guideError: string;
  guideRateLimited: string;
  guideAbuseLimited: string;
  guideWelcome: string;
  guideThinking: string;
  guideQuestionRemaining: string;
  guideQuestionsRemaining: string;
  account: string;
  guestMode: string;
  continueAsGuest: string;
  signIn: string;
  signUp: string;
  email: string;
  password: string;
  signedIn: string;
  signOut: string;
  authError: string;
  invalidEmail: string;
  passwordTooShort: string;
  accountExists: string;
  accountCreated: string;
  invalidCredentials: string;
  authNetworkError: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  discoverCity: string;
  noSignUpRequired: string;
  buildYourTrip: string;
  plannerDescription: string;
  interests: string;
  history: string;
  architecture: string;
  hiddenGems: string;
  family: string;
  walkingPreference: string;
  standardWalking: string;
  lessWalking: string;
  recommendedForYou: string;
  availableTime: string;
  minutes60: string;
  minutes90: string;
  hours2: string;
  hours3: string;
  buildTrip: string;
  rebuildTrip: string;
  yourRoute: string;
  totalTime: string;
  walkingTime: string;
  approximateDistance: string;
  distanceDisclaimer: string;
  noRoute: string;
  noRouteTitle: string;
  saveTrip: string;
  tripSavedLocally: string;
  tripSaveFailed: string;
  savedTrips: string;
  resumeTrip: string;
  noSavedTrips: string;
  noSavedTripsDescription: string;
}>;

const messages: Record<NativeLocale, NativeMessages> = {
  en: {
    appTagline: "Walk. Discover. Hear every city.", discoverCities: "Discover a city",
    availableCities: "Available cities", exploreCity: "Explore city", tours: "Tours", stops: "stops",
    minutes: "min", estimatedDuration: "Estimated duration", startTour: "Start tour", startTrip: "Start trip",
    stopProgress: "Stop {current} of {total}", nextStop: "Next stop", previousStop: "Previous stop", finishTrip: "Finish trip",
    tripComplete: "Trip complete", tripCompleteDescription: "You explored {count} stops. Ready for another walk?", returnToCity: "Return to city",
    fallbackContent: "This content is shown in its available language.", places: "Places", map: "City map",
    useLocation: "Use my location", locationRequesting: "Finding your location…",
    locationDenied: "Location permission was denied. The map remains available.",
    locationUnavailable: "Your location is currently unavailable.",
    locationServicesDisabled: "Location services are turned off. Turn them on and try again.",
    locationProviderUnavailable: "No location provider is available. Check your device settings and try again.",
    locationFixFailed: "CITYWALK could not get a location fix. Move outdoors or try again.",
    turnOnLocationServices: "Turn on location services",
    retry: "Try again", language: "Language", close: "Close", loading: "Loading…",
    unavailable: "This content is temporarily unavailable.", visitMinutes: "min visit", story: "Story", facts: "Facts",
    visitorNote: "Visitor note", audioGuide: "Audio guide", playAudio: "Play", pauseAudio: "Pause",
    replayAudio: "Replay", loadingAudio: "Loading audio…", audioUnavailable: "Audio is currently unavailable.",
    askCitywalk: "Ask CITYWALK", askGuideTitle: "Ask CITYWALK", questionPlaceholder: "What would you like to know?",
    sendQuestion: "Send question", answer: "Answer", sources: "Sources", sourceCount: "{count} verified sources",
    guideUnavailable: "The verified AI guide is not available for this place.",
    guideError: "CITYWALK could not answer right now. Please try again.",
    guideRateLimited: "Your AI Guide allowance has been reached. Please try again later.",
    guideAbuseLimited: "CITYWALK is receiving too many questions right now. Please try again shortly.",
    guideWelcome: "I’m your verified CITYWALK guide. Ask me anything about this place.",
    guideThinking: "CITYWALK is checking verified sources…",
    guideQuestionRemaining: "1 free question remaining today",
    guideQuestionsRemaining: "{count} free questions remaining today",
    account: "Account", guestMode: "CITYWALK works without an account.",
    continueAsGuest: "Continue as guest", signIn: "Sign in", signUp: "Create account", email: "Email",
    password: "Password", signedIn: "Signed in", signOut: "Sign out", authError: "Authentication could not be completed.",
    invalidEmail: "Enter a valid email address.", passwordTooShort: "Password must be at least 12 characters.",
    accountExists: "An account already exists for this email. Try signing in.",
    accountCreated: "Account created. You can now sign in.",
    invalidCredentials: "Email or password is incorrect.", authNetworkError: "CITYWALK could not reach the account service. Try again.",
    homeHeroTitle: "Discover cities one step at a time.",
    homeHeroSubtitle: "Explore local stories, audio guides and hidden places in your language.",
    discoverCity: "Discover a city", noSignUpRequired: "No sign-up required",
    buildYourTrip: "Build your own trip", plannerDescription: "Choose what interests you and build a route that fits your time.",
    interests: "Interests", history: "History", architecture: "Architecture", hiddenGems: "Hidden gems", family: "Family",
    walkingPreference: "Walking preference", standardWalking: "Standard", lessWalking: "Less walking",
    recommendedForYou: "Recommended for you", availableTime: "Available time", minutes60: "60 min", minutes90: "90 min",
    hours2: "2 hours", hours3: "3 hours", buildTrip: "Build my trip", rebuildTrip: "Rebuild trip", yourRoute: "Your route",
    totalTime: "Total time", walkingTime: "Walking time", approximateDistance: "Approx. distance",
    distanceDisclaimer: "Distance is estimated between stops and may differ from the actual walking route.",
    noRoute: "No suitable route fits this time and your current preferences.", noRouteTitle: "No route just yet", saveTrip: "Save your trip",
    tripSavedLocally: "Saved on this device. Account sync is not available yet.", tripSaveFailed: "This trip could not be saved on this device.",
    savedTrips: "Saved trips", resumeTrip: "Resume trip", noSavedTrips: "No saved trips yet",
    noSavedTripsDescription: "Build a trip in a city and save it here for your next walk.",
  },
  de: {
    appTagline: "Gehen. Entdecken. Städte hören.", discoverCities: "Stadt entdecken",
    availableCities: "Verfügbare Städte", exploreCity: "Stadt erkunden", tours: "Touren", stops: "Stopps",
    minutes: "Min.", estimatedDuration: "Geschätzte Dauer", startTour: "Tour starten", startTrip: "Tour starten",
    stopProgress: "Stopp {current} von {total}", nextStop: "Nächster Stopp", previousStop: "Vorheriger Stopp", finishTrip: "Tour beenden",
    tripComplete: "Tour abgeschlossen", tripCompleteDescription: "Du hast {count} Stopps erkundet. Lust auf einen weiteren Spaziergang?", returnToCity: "Zurück zur Stadt",
    fallbackContent: "Dieser Inhalt wird in der verfügbaren Sprache angezeigt.", places: "Orte", map: "Stadtplan",
    useLocation: "Meinen Standort verwenden", locationRequesting: "Standort wird ermittelt…",
    locationDenied: "Der Standortzugriff wurde abgelehnt. Die Karte bleibt verfügbar.",
    locationUnavailable: "Dein Standort ist derzeit nicht verfügbar.",
    locationServicesDisabled: "Die Standortdienste sind ausgeschaltet. Schalte sie ein und versuche es erneut.",
    locationProviderUnavailable: "Kein Standortanbieter ist verfügbar. Prüfe deine Geräteeinstellungen und versuche es erneut.",
    locationFixFailed: "CITYWALK konnte deinen Standort nicht ermitteln. Gehe ins Freie oder versuche es erneut.",
    turnOnLocationServices: "Standortdienste einschalten",
    retry: "Erneut versuchen", language: "Sprache", close: "Schließen", loading: "Wird geladen…",
    unavailable: "Dieser Inhalt ist vorübergehend nicht verfügbar.", visitMinutes: "Min. Besuch", story: "Geschichte", facts: "Fakten",
    visitorNote: "Besuchshinweis", audioGuide: "Audioguide", playAudio: "Abspielen", pauseAudio: "Pause",
    replayAudio: "Erneut abspielen", loadingAudio: "Audio wird geladen…", audioUnavailable: "Audio ist derzeit nicht verfügbar.",
    askCitywalk: "CITYWALK fragen", askGuideTitle: "CITYWALK fragen", questionPlaceholder: "Was möchtest du wissen?",
    sendQuestion: "Frage senden", answer: "Antwort", sources: "Quellen", sourceCount: "{count} verifizierte Quellen",
    guideUnavailable: "Der verifizierte KI-Guide ist für diesen Ort nicht verfügbar.",
    guideError: "CITYWALK kann gerade nicht antworten. Bitte versuche es erneut.",
    guideRateLimited: "Dein Kontingent für den KI-Guide ist erreicht. Bitte versuche es später erneut.",
    guideAbuseLimited: "CITYWALK erhält gerade zu viele Fragen. Bitte versuche es gleich noch einmal.",
    guideWelcome: "Ich bin dein verifizierter CITYWALK-Guide. Frag mich etwas über diesen Ort.",
    guideThinking: "CITYWALK prüft verifizierte Quellen…",
    guideQuestionRemaining: "Heute noch 1 kostenlose Frage",
    guideQuestionsRemaining: "Heute noch {count} kostenlose Fragen",
    account: "Konto", guestMode: "CITYWALK funktioniert ohne Konto.",
    continueAsGuest: "Als Gast fortfahren", signIn: "Anmelden", signUp: "Konto erstellen", email: "E-Mail",
    password: "Passwort", signedIn: "Angemeldet", signOut: "Abmelden", authError: "Anmeldung konnte nicht abgeschlossen werden.",
    invalidEmail: "Gib eine gültige E-Mail-Adresse ein.", passwordTooShort: "Das Passwort muss mindestens 12 Zeichen lang sein.",
    accountExists: "Für diese E-Mail-Adresse gibt es bereits ein Konto. Versuche dich anzumelden.",
    accountCreated: "Konto erstellt. Du kannst dich jetzt anmelden.",
    invalidCredentials: "E-Mail-Adresse oder Passwort ist falsch.", authNetworkError: "CITYWALK konnte den Kontodienst nicht erreichen. Versuche es erneut.",
    homeHeroTitle: "Städte entdecken, Schritt für Schritt.",
    homeHeroSubtitle: "Entdecke lokale Geschichten, Audioguides und verborgene Orte in deiner Sprache.",
    discoverCity: "Entdecke eine Stadt", noSignUpRequired: "Keine Anmeldung erforderlich",
    buildYourTrip: "Eigene Tour planen", plannerDescription: "Wähle deine Interessen und plane eine Route passend zu deiner Zeit.",
    interests: "Interessen", history: "Geschichte", architecture: "Architektur", hiddenGems: "Geheimtipps", family: "Familie",
    walkingPreference: "Gehpräferenz", standardWalking: "Standard", lessWalking: "Weniger gehen",
    recommendedForYou: "Für dich empfohlen", availableTime: "Verfügbare Zeit", minutes60: "60 Min.", minutes90: "90 Min.",
    hours2: "2 Stunden", hours3: "3 Stunden", buildTrip: "Meine Tour planen", rebuildTrip: "Tour neu planen", yourRoute: "Deine Route",
    totalTime: "Gesamtzeit", walkingTime: "Gehzeit", approximateDistance: "Ca. Entfernung",
    distanceDisclaimer: "Die Entfernung wird zwischen den Stopps geschätzt und kann vom tatsächlichen Fußweg abweichen.",
    noRoute: "Für diese Zeit und deine aktuellen Wünsche passt keine geeignete Route.", noRouteTitle: "Noch keine passende Route", saveTrip: "Tour speichern",
    tripSavedLocally: "Auf diesem Gerät gespeichert. Kontosynchronisierung ist noch nicht verfügbar.", tripSaveFailed: "Diese Tour konnte auf dem Gerät nicht gespeichert werden.",
    savedTrips: "Gespeicherte Touren", resumeTrip: "Tour fortsetzen", noSavedTrips: "Noch keine gespeicherten Touren",
    noSavedTripsDescription: "Plane eine Tour in einer Stadt und speichere sie hier für deinen nächsten Spaziergang.",
  },
  ar: {
    appTagline: "امشِ. اكتشف. واستمع إلى كل مدينة.", discoverCities: "اكتشف مدينة",
    availableCities: "المدن المتاحة", exploreCity: "استكشف المدينة", tours: "الجولات", stops: "محطات",
    minutes: "دقيقة", estimatedDuration: "المدة التقديرية", startTour: "ابدأ الجولة", startTrip: "ابدأ الرحلة",
    stopProgress: "المحطة {current} من {total}", nextStop: "المحطة التالية", previousStop: "المحطة السابقة", finishTrip: "إنهاء الرحلة",
    tripComplete: "اكتملت الرحلة", tripCompleteDescription: "استكشفت {count} محطات. هل أنت مستعد لجولة أخرى؟", returnToCity: "العودة إلى المدينة",
    fallbackContent: "يُعرض هذا المحتوى باللغة المتاحة.", places: "الأماكن", map: "خريطة المدينة",
    useLocation: "استخدام موقعي", locationRequesting: "جارٍ تحديد موقعك…",
    locationDenied: "تم رفض إذن الموقع. تظل الخريطة متاحة.",
    locationUnavailable: "موقعك غير متاح حاليًا.",
    locationServicesDisabled: "خدمات الموقع متوقفة. فعّلها ثم حاول مجددًا.",
    locationProviderUnavailable: "لا يتوفر مزود للموقع. تحقق من إعدادات جهازك وحاول مجددًا.",
    locationFixFailed: "تعذر على CITYWALK تحديد موقعك. انتقل إلى مكان مفتوح أو حاول مجددًا.",
    turnOnLocationServices: "شغّل خدمات الموقع",
    retry: "حاول مجددًا", language: "اللغة", close: "إغلاق", loading: "جارٍ التحميل…",
    unavailable: "هذا المحتوى غير متاح مؤقتًا.", visitMinutes: "دقيقة للزيارة", story: "القصة", facts: "حقائق",
    visitorNote: "ملاحظة للزيارة", audioGuide: "الدليل الصوتي", playAudio: "تشغيل", pauseAudio: "إيقاف مؤقت",
    replayAudio: "إعادة التشغيل", loadingAudio: "جارٍ تحميل الصوت…", audioUnavailable: "الصوت غير متاح حاليًا.",
    askCitywalk: "اسأل CITYWALK", askGuideTitle: "اسأل CITYWALK", questionPlaceholder: "ماذا تريد أن تعرف؟",
    sendQuestion: "إرسال السؤال", answer: "الإجابة", sources: "المصادر", sourceCount: "{count} مصادر موثقة",
    guideUnavailable: "دليل الذكاء الاصطناعي الموثق غير متاح لهذا المكان.",
    guideError: "يتعذر على CITYWALK الإجابة الآن. حاول مرة أخرى.",
    guideRateLimited: "لقد وصلت إلى الحد المسموح به لدليل الذكاء الاصطناعي. حاول لاحقًا.",
    guideAbuseLimited: "يتلقى CITYWALK عددًا كبيرًا من الأسئلة الآن. حاول مرة أخرى بعد قليل.",
    guideWelcome: "أنا دليلك الموثق من CITYWALK. اسألني عن هذا المكان.",
    guideThinking: "يتحقق CITYWALK من المصادر الموثقة…",
    guideQuestionRemaining: "متبقي سؤال مجاني واحد اليوم",
    guideQuestionsRemaining: "متبقي {count} من الأسئلة المجانية اليوم",
    account: "الحساب", guestMode: "يعمل CITYWALK دون حساب.",
    continueAsGuest: "المتابعة كضيف", signIn: "تسجيل الدخول", signUp: "إنشاء حساب", email: "البريد الإلكتروني",
    password: "كلمة المرور", signedIn: "تم تسجيل الدخول", signOut: "تسجيل الخروج", authError: "تعذّر إكمال المصادقة.",
    invalidEmail: "أدخل عنوان بريد إلكتروني صالحًا.", passwordTooShort: "يجب ألا تقل كلمة المرور عن 12 حرفًا.",
    accountExists: "يوجد حساب لهذا البريد الإلكتروني بالفعل. حاول تسجيل الدخول.",
    accountCreated: "تم إنشاء الحساب. يمكنك الآن تسجيل الدخول.",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", authNetworkError: "تعذر على CITYWALK الوصول إلى خدمة الحساب. حاول مرة أخرى.",
    homeHeroTitle: "اكتشف المدن خطوة بخطوة.",
    homeHeroSubtitle: "استكشف القصص المحلية والأدلة الصوتية والأماكن الخفية بلغتك.",
    discoverCity: "اكتشف مدينة", noSignUpRequired: "لا يلزم التسجيل",
    buildYourTrip: "خطط رحلتك", plannerDescription: "اختر اهتماماتك وأنشئ مسارًا يناسب وقتك.",
    interests: "الاهتمامات", history: "التاريخ", architecture: "العمارة", hiddenGems: "الجواهر الخفية", family: "العائلة",
    walkingPreference: "تفضيل المشي", standardWalking: "عادي", lessWalking: "مشي أقل",
    recommendedForYou: "مقترح لك", availableTime: "الوقت المتاح", minutes60: "60 دقيقة", minutes90: "90 دقيقة",
    hours2: "ساعتان", hours3: "3 ساعات", buildTrip: "أنشئ رحلتي", rebuildTrip: "أعد بناء الرحلة", yourRoute: "مسارك",
    totalTime: "الوقت الإجمالي", walkingTime: "وقت المشي", approximateDistance: "المسافة التقريبية",
    distanceDisclaimer: "المسافة تقديرية بين المحطات وقد تختلف عن مسار المشي الفعلي.",
    noRoute: "لا يوجد مسار مناسب لهذا الوقت والتفضيلات الحالية.", noRouteTitle: "لا يوجد مسار مناسب بعد", saveTrip: "احفظ رحلتك",
    tripSavedLocally: "حُفظت على هذا الجهاز. مزامنة الحساب غير متاحة بعد.", tripSaveFailed: "تعذر حفظ الرحلة على هذا الجهاز.",
    savedTrips: "الرحلات المحفوظة", resumeTrip: "متابعة الرحلة", noSavedTrips: "لا توجد رحلات محفوظة بعد",
    noSavedTripsDescription: "خطط لرحلة في إحدى المدن واحفظها هنا لجولتك القادمة.",
  },
};

export function getNativeMessages(locale: NativeLocale): NativeMessages {
  return messages[locale];
}

export function getNativeDirection(locale: string): NativeDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getNativeTextAlignment(locale: string): "left" | "right" {
  return getNativeDirection(locale) === "rtl" ? "right" : "left";
}
