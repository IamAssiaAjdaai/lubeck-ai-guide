"use client";
import { useSyncExternalStore } from "react";
import { Bookmark } from "lucide-react";
import { readSavedWalks } from "@/lib/walk/storage";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
import type { Locale } from "@/lib/i18n";
// Restore session/query state on a fresh document; a cached city page may
// otherwise retain the previous planner when entering a saved or active walk.
const subscribe = () => () => {};
export default function SavedWalks({
  locale,
  trips,
}: {
  locale: Locale;
  trips: boolean;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const saved = hydrated ? readSavedWalks() : [];
  const t = walkCopy(locale);
  let active: { citySlug: string; cityName: string } | undefined;
  if (hydrated)
    try {
      const value = JSON.parse(
        sessionStorage.getItem("citywalk:v2:active") ?? "null",
      );
      if (
        value &&
        typeof value.cityName === "string" &&
        typeof value.citySlug === "string" &&
        /^[a-z0-9-]+$/.test(value.citySlug)
      )
        active = value;
    } catch {}
  return (
    <section lang={walkCopyLocale(locale)}>
      <h1 className="mb-7 text-3xl font-bold">{trips ? t.trips : t.saved}</h1>
      {trips ? (
        active ? (
          <a
            className="saved-walk-card surface-card block p-5"
            href={`/${locale}/${active.citySlug}#build-walk`}
          >
            {active.cityName} · {t.resume}
          </a>
        ) : (
          <p className="text-text-secondary">{t.emptyTrips}</p>
        )
      ) : saved.length ? (
        <div className="grid gap-3">
          {saved.map((walk) => (
            <a
              key={walk.id}
              href={`/${locale}/${walk.citySlug}?walk=${encodeURIComponent(walk.id)}#build-walk`}
              className="saved-walk-card surface-card flex items-center gap-4 p-5"
            >
              <Bookmark size={22} className="text-primary" />
              <span>
                <strong className="block">{walk.cityName}</strong>
                <span className="text-sm text-text-secondary">
                  {walk.placeSlugs.length} {t.stops} · {walk.minutes} min
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary">{t.emptySaved}</p>
      )}
    </section>
  );
}
