import { notFound } from "next/navigation";
import { getDirection, isLocale } from "@/lib/i18n";
import BottomNavigation from "@/components/walk/BottomNavigation";
import AppHeader from "@/components/walk/AppHeader";
import SavedWalks from "@/components/walk/SavedWalks";
export default async function WalksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ locale }, { view }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  return (
    <main className="app-shell" lang={locale} dir={getDirection(locale)}>
      <div className="content-container pt-6">
        <AppHeader />
        <div className="pt-6"><SavedWalks locale={locale} trips={view === "trips"} /></div>
      </div>
      <BottomNavigation
        locale={locale}
        active={view === "trips" ? "trips" : "saved"}
      />
    </main>
  );
}
