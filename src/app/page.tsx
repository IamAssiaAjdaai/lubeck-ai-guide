import Link from "next/link";
import { cookies } from "next/headers";

import LanguageSelector from "@/components/LanguageSelector";
import { getDirection, getTranslations, isLocale, languages, locales } from "@/lib/i18n";

export default async function Home() {
  const savedLocale = (await cookies()).get("preferred_locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "de";
  const t = getTranslations(locale);
  const languageOptions = locales.map((item) => ({
    locale: item,
    nativeName: languages[item].nativeName,
  }));

  return (
    <main lang={locale} dir={getDirection(locale)} className="min-h-screen bg-white text-black">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-12">
        <div className="flex flex-1 flex-col justify-center">
          <div className="text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">{t.common.appName}</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">{t.home.title}</h1>
            <p className="mx-auto mt-5 max-w-sm text-lg leading-7 text-zinc-600">{t.home.subtitle}</p>
          </div>

          <div className="mt-12">
            <LanguageSelector currentLocale={locale} label={t.home.chooseLanguage} closeLabel={t.common.back} options={languageOptions} />
          </div>

          <Link href={`/${locale}/lubeck`} className="mt-4 flex h-14 items-center justify-center rounded-xl bg-black px-5 font-semibold text-white transition hover:bg-zinc-800">
            {t.explore.startTour}
          </Link>

          <p className="mt-6 text-center text-sm text-zinc-500">{t.common.noAccount}</p>
        </div>
      </section>
    </main>
  );
}
