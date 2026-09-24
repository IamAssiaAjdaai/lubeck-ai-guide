"use client";
import { useState, useSyncExternalStore } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { getSavedWalksSnapshot, readSavedWalks, removeSavedWalk, subscribeSavedWalks } from "@/lib/walk/storage";
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
  const serialized = useSyncExternalStore(subscribeSavedWalks, getSavedWalksSnapshot, () => "[]");
  const saved = readSavedWalks(serialized);
  const [removeFailed, setRemoveFailed] = useState(false);
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
            <div key={`${walk.citySlug}:${walk.id}`} className="saved-walk-card surface-card flex items-center gap-2 p-5">
            <a
              href={`/${locale}/${walk.citySlug}?walk=${encodeURIComponent(walk.id)}#build-walk`}
              className="flex min-w-0 flex-1 items-center gap-4"
            >
              <Bookmark size={22} className="text-primary" />
              <span>
                <strong className="block">{walk.cityName}</strong>
                <span className="text-sm text-text-secondary">
                  {walk.placeSlugs.length} {t.stops} · {walk.minutes} min
                </span>
              </span>
            </a>
            <button type="button" className="button-tertiary shrink-0" aria-label={`${t.removeWalk}: ${walk.cityName}`}
              onClick={() => setRemoveFailed(!removeSavedWalk(walk.id, walk.citySlug))}>
              <Trash2 size={20} aria-hidden="true" />
            </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary">{t.emptySaved}</p>
      )}
      {removeFailed ? <p role="alert" className="mt-4 text-text-secondary">{t.removeFailed}</p> : null}
    </section>
  );
}
