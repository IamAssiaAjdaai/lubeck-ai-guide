"use client";

import { useState } from "react";
import type { SavedRoute } from "@citywalk/traveler-core";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Locale } from "@/lib/i18n";
import { measureWalk } from "@/lib/walk/planner";
import { toPublicWalk } from "@/lib/sharing/publicWalk";
import WalkJourney from "./WalkJourney";
import WalkMap from "./WalkMap";
import { RouteSummary } from "./RouteSummary";

export default function StartSharedWalk({ route, places, cityName, locale, shareId }: {
  route: SavedRoute;
  places: readonly DiscoveryPlace[];
  cityName: string;
  locale: Locale;
  shareId: string;
}) {
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preparedAt, setPreparedAt] = useState<number>();
  const [error, setError] = useState("");

  // Select by snapshot order, never by catalog ranking, and never re-run the planner.
  const indexed = new Map(places.map(place => [place.slug, place] as const));
  const ordered = route.stopSlugs.flatMap(slug => {
    const place = indexed.get(slug);
    return place ? [place] : [];
  });
  if (ordered.length !== route.stopSlugs.length) {
    return <p role="alert">This shared route is no longer available in full.</p>;
  }
  const measured = measureWalk(ordered, route.settings.start, route.finish);

  const prepare = async () => {
    if (checking) return;
    setChecking(true);
    setError("");
    try {
      // A link can be revoked after the page was opened. Recheck without cookies.
      const response = await fetch("/api/shared-walks/" + encodeURIComponent(shareId), {
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) throw new Error("unavailable");
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("version" in payload) || payload.version !== 1 ||
          !("route" in payload)) throw new Error("invalid");
      const received = toPublicWalk(payload.route);
      const expected = toPublicWalk(route);
      if (!received || !expected || JSON.stringify(received) !== JSON.stringify(expected))
        throw new Error("stale");

      // The shared journey uses the existing active session key only after
      // its own Start walk action. Never overwrite another trip implicitly.
      if (sessionStorage.getItem("citywalk:v2:active") !== null) {
        setConfirming(true);
      } else {
        setPreparedAt(Date.now());
      }
    } catch {
      setError("This link is unavailable or could not be verified. Refresh the page and try again.");
    } finally {
      setChecking(false);
    }
  };

  if (preparedAt !== undefined) {
    return (
      <section className="mt-8">
        <WalkJourney
          route={measured}
          settings={{ ...route.settings, finish: route.finish, deadline: undefined }}
          generatedAt={preparedAt}
          places={places}
          locale={locale}
          citySlug={route.citySlug}
          cityName={cityName}
          customize={() => setPreparedAt(undefined)}
        />
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 id="walk-title" className="sr-only">Shared route map</h2>
      <RouteSummary route={measured} locale={locale} />
      <WalkMap
        places={ordered}
        locale={locale}
        citySlug={route.citySlug}
        start={route.settings.start}
        finish={route.finish}
      />
      <button type="button" className="button-primary w-full" disabled={checking || confirming}
        onClick={() => void prepare()}>
        {checking ? "Verifying shared walk…" : "Start this walk"}
      </button>
      <p className="mt-2 text-sm opacity-70">
        No account needed. You will preview the exact ordered route before starting.
        Your visits and skips will be yours alone.
      </p>
      {confirming ? (
        <section role="alertdialog" aria-label="Replace active walk?" className="mt-4 rounded-xl border p-4">
          <h3 className="font-semibold">You already have an active walk</h3>
          <p className="mt-2 text-sm">Starting this shared route will replace your current active walk. The shared route has no copied progress.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="button-secondary" onClick={() => setConfirming(false)}>
              Keep current walk
            </button>
            <button type="button" className="button-primary" onClick={() => {
              setConfirming(false);
              setPreparedAt(Date.now());
            }}>
              Replace and preview
            </button>
          </div>
        </section>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
    </section>
  );
}
