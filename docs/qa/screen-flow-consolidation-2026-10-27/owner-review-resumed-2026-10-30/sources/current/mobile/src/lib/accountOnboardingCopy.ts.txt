import type { NativeLocale } from "./api/contracts";
type Copy = { title: string; description: string; email: string; existing: string; ready: string };
export const accountOnboardingCopy: Record<NativeLocale, Copy> = {
  en: { title: "Create\nyour account", description: "Save your walks and personalize\nyour city experience.", email: "Sign up with email", existing: "Already have an account?", ready: "Ready to explore" },
  de: { title: "Erstelle\ndein Konto", description: "Speichere deine Spaziergänge und gestalte dein Stadterlebnis persönlich.", email: "Mit E-Mail registrieren", existing: "Du hast schon ein Konto?", ready: "Bereit zum Entdecken" },
  es: { title: "Crea\ntu cuenta", description: "Guarda tus paseos y personaliza tu experiencia en la ciudad.", email: "Registrarse con email", existing: "¿Ya tienes una cuenta?", ready: "Todo listo para explorar" },
  nl: { title: "Maak\nje account aan", description: "Bewaar je wandelingen en maak je stadservaring persoonlijk.", email: "Aanmelden met e-mail", existing: "Heb je al een account?", ready: "Klaar om te ontdekken" },
  da: { title: "Opret\ndin konto", description: "Gem dine gåture og tilpas din oplevelse af byen.", email: "Tilmeld med e-mail", existing: "Har du allerede en konto?", ready: "Klar til at udforske" },
  sv: { title: "Skapa\nditt konto", description: "Spara dina promenader och anpassa din stadsupplevelse.", email: "Registrera med e-post", existing: "Har du redan ett konto?", ready: "Redo att upptäcka" },
  ar: { title: "أنشئ حسابك", description: "احفظ جولاتك وخصص تجربتك في المدينة.", email: "التسجيل بالبريد الإلكتروني", existing: "لديك حساب بالفعل؟", ready: "جاهز للاستكشاف" },
};
