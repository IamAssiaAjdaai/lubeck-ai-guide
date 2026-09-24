"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronRight, MapPin, Clock3, Navigation } from "lucide-react";
import { useUserLocation } from "@/hooks/useUserLocation";
import { calculateDistanceMeters } from "@/lib/distance";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
import { getDirection, type Locale } from "@/lib/i18n";
import type { CityAvailability } from "@/data/cityAvailability";
import { isApplicationMediaPath } from "@/lib/media/imageDelivery";
export type CityChoice = {
  slug: string;
  name: string;
  description?: string;
  image?: string;
  credit?: { text: string; href: string; license: string };
  status: CityAvailability;
  contentLocale: Locale;
  coordinates?: { lat: number; lng: number };
};
export default function CitySelector({
  locale,
  cities,
}: {
  locale: Locale;
  cities: CityChoice[];
}) {
  const t = walkCopy(locale);
  const [query, setQuery] = useState("");
  const { status, location, requestLocation } = useUserLocation();
  const filtered = cities
    .filter(
      (city) =>
        city.status !== "unpublished" &&
        city.name
          .toLocaleLowerCase(locale)
          .includes(query.toLocaleLowerCase(locale)),
    )
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "available" ? -1 : 1;
      if (!location) return 0;
      return (
        (a.coordinates
          ? (calculateDistanceMeters(location, a.coordinates) ?? Infinity)
          : Infinity) -
        (b.coordinates
          ? (calculateDistanceMeters(location, b.coordinates) ?? Infinity)
          : Infinity)
      );
    });
  return (
    <div lang={walkCopyLocale(locale)}>
      <header className="walk-hero walk-home-hero">
        <h1 className="relative z-10 max-w-[85%] text-[2rem] font-bold leading-[1.15] tracking-tight">
          {t.homeTitle}
        </h1>
        <p className="relative z-10 mt-3 text-text-secondary">
          {t.homeSubtitle}
        </p>
      </header>
      <button
        className="button-primary w-full"
        onClick={() => void requestLocation()}
        disabled={status === "requesting"}
      >
        <Navigation size={20} fill="currentColor" />
        {t.location}
      </button>
      {status !== "idle" && (
        <p role="status" className="mt-3 text-sm text-text-secondary">
          {location ? t.nearest : t.locationHelp}
        </p>
      )}
      <label className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border bg-surface px-4">
        <Search size={20} className="text-text-secondary" />
        <span className="sr-only">{t.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
        />
      </label>
      <section id="available-cities" className="mt-8 scroll-mt-5">
        <h2 className="mb-4 text-lg font-semibold">{t.available}</h2>
        <div className="grid gap-4">
          {filtered.map((city) => {
            const content = (
              <>
                <div className="city-choice-image relative shrink-0 overflow-hidden bg-accent-soft">
                  {city.image ? (
                    <Image
                      src={city.image}
                      alt=""
                      fill
                      sizes="(max-width: 480px) 40vw, 180px"
                      unoptimized={isApplicationMediaPath(city.image)}
                      className="object-cover"
                    />
                  ) : (
                    <MapPin className="m-auto h-full text-primary" size={28} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    lang={city.contentLocale}
                    dir={getDirection(city.contentLocale)}
                    className="break-words text-xl font-bold"
                  >
                    {city.name}
                  </h3>
                  <p
                    className={`city-status mt-1 text-xs font-medium ${city.status === "available" ? "text-success" : "text-text-secondary"}`}
                  >
                    {city.status === "available" ? (
                      <span aria-hidden="true" className="status-dot" />
                    ) : (
                      <Clock3 size={14} aria-hidden="true" />
                    )}
                    {city.status === "available"
                      ? t.availableNow
                      : t.comingSoon}
                  </p>
                  {city.description && (
                    <p
                      lang={city.contentLocale}
                      dir={getDirection(city.contentLocale)}
                      className="mt-2 text-sm leading-5 text-text-secondary"
                    >
                      {city.description}
                    </p>
                  )}
                </div>
                <ChevronRight
                  className="shrink-0 text-text-secondary rtl:rotate-180"
                  size={18}
                />
              </>
            );
            return city.status === "available" ? (
              <Link
                data-testid={`available-city-${city.slug}`}
                key={city.slug}
                href={`/${locale}/${city.slug}`}
                className="city-choice surface-card flex items-center gap-4 pe-3"
              >
                {content}
              </Link>
            ) : (
              <article
                key={city.slug}
                className="city-choice surface-card flex items-center gap-4 pe-3"
              >
                {content}
              </article>
            );
          })}
          {!filtered.length && (
            <p role="status" className="surface-card p-6 text-text-secondary">
              {t.noCities}
            </p>
          )}
        </div>
        <div className="mt-5 text-[10px] text-text-secondary">
          {filtered
            .filter((city) => city.credit)
            .map((city) => (
              <p key={city.slug}>
                <a
                  href={city.credit!.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {city.name}: {city.credit!.text}
                </a>{" "}
                ·{" "}
                <a
                  href={city.credit!.license}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {city.slug === "hamburg" ? "CC BY-SA 3.0" : "CC0"}
                </a>
              </p>
            ))}
        </div>
      </section>
    </div>
  );
}
