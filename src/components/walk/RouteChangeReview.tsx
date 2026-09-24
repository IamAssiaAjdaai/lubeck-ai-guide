"use client";
import { useEffect, useRef } from "react";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Locale } from "@/lib/i18n";
import { walkCopy } from "@/lib/walk/copy";
import type { WalkRoute } from "@/lib/walk/planner";
import { Itinerary, RouteSummary } from "./RouteSummary";
export default function RouteChangeReview({
  route,
  locale,
  confirm,
  cancel,
}: {
  route: WalkRoute<DiscoveryPlace>;
  locale: Locale;
  confirm: () => void;
  cancel: () => void;
}) {
  const t = walkCopy(locale);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={t.confirm}
      className="walk-review my-5 rounded-2xl border border-primary bg-surface p-4"
    >
      <h3 className="font-bold">{t.remaining}</h3>
      <p className="mt-2 text-sm leading-6">{t.changeHelp}</p>
      <RouteSummary route={route} locale={locale} />
      <details className="my-3"><summary className="cursor-pointer text-sm font-semibold text-primary">{t.itinerary}</summary><div className="mt-3"><Itinerary places={route.places} /></div></details>
      <button className="button-primary mt-3 w-full" onClick={confirm}>
        {t.confirm}
      </button>
      <button className="button-secondary mt-2 w-full" onClick={cancel}>
        {t.keep}
      </button>
    </section>
  );
}
