"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Footprints,
  Headphones,
  BookOpen,
  MessageCircle,
  SkipForward,
  Split,
  Plus,
  Undo2,
  Navigation,
  Map,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
} from "lucide-react";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import {
  getDirection,
  getTranslations,
  formatMessage,
  type Locale,
} from "@/lib/i18n";
import {
  calculateDistanceMeters,
  estimateWalkingMinutes,
  formatDistance,
} from "@/lib/distance";
import { isEligibleTourPlace } from "@/lib/tourBuilder";
import {
  measureWalk,
  type WalkRoute,
  type WalkSettings,
  type Point,
} from "@/lib/walk/planner";
import { walkCopy } from "@/lib/walk/copy";
import { buildWalkGuideContext } from "@/lib/walk/guideContext";
import { proposeAddedStop, proposeShorterWalk, remainingWalkBudget } from "@citywalk/traveler-core/walkJourney";
import type { JourneySession } from "@/lib/walk/session";
import { saveWalk } from "@/lib/walk/storage";
import { useUserLocation } from "@/hooks/useUserLocation";
import AskGuide from "@/components/AskGuide";
import { RouteSummary, Itinerary } from "./RouteSummary";
import RouteChangeReview from "./RouteChangeReview";
import TripDestinationPicker from "./TripDestinationPicker";
import WalkMap from "./WalkMap";
import FinishWalkScreen from "./FinishWalkScreen";
export default function WalkJourney({
  route: initial,
  settings,
  generatedAt,
  places,
  locale,
  citySlug,
  cityName,
  customize,
  restored,
}: {
  restored?: JourneySession;
  route: WalkRoute<DiscoveryPlace>;
  settings: WalkSettings;
  generatedAt: number;
  places: readonly DiscoveryPlace[];
  locale: Locale;
  citySlug: string;
  cityName: string;
  customize: () => void;
}) {
  const t = walkCopy(locale),
    existing = getTranslations(locale);
  const [route, setRoute] = useState(initial);
  const [stage, setStage] = useState<"preview" | "active" | "finished">(
    restored ? "active" : "preview",
  );
  const [visited, setVisited] = useState<DiscoveryPlace[]>(() =>
    restored
      ? restored.visited.flatMap(
          (slug) => places.find((place) => place.slug === slug) ?? [],
        )
      : [],
  );
  const [historyDistance, setHistoryDistance] = useState(
    restored?.historyDistance ?? 0,
  );
  const [position, setPosition] = useState<Point>(
    restored?.position ?? settings.start,
  );
  const [startedAt, setStartedAt] = useState<number | undefined>(
    restored?.startedAt,
  );
  const [finishedAt, setFinishedAt] = useState<number>();
  const [now, setNow] = useState(generatedAt);
  const [map, setMap] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [panel, setPanel] = useState<"add" | "back" | undefined>(() =>
    restored && new URLSearchParams(window.location.search).has("add")
      ? "add"
      : undefined,
  );
  const [candidate, setCandidate] = useState(
    () => new URLSearchParams(window.location.search).get("add") ?? "",
  );
  const [proposed, setProposed] = useState<WalkRoute<DiscoveryPlace>>();
  const [message, setMessage] = useState("");
  const { location, requestLocation } = useUserLocation();
  useEffect(() => {
    if (stage !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    if (stage !== "active" || !startedAt) return;
    const value: JourneySession = {
      citySlug,
      cityName,
      generatedAt,
      settings,
      remaining: route.places.map((place) => place.slug),
      visited: visited.map((place) => place.slug),
      position,
      historyDistance,
      startedAt,
      finish: route.finish,
    };
    try {
      sessionStorage.setItem("citywalk:v2:active", JSON.stringify(value));
    } catch {
      /* Storage is optional for guest trips. */
    }
  }, [
    stage,
    startedAt,
    citySlug,
    cityName,
    generatedAt,
    settings,
    route,
    visited,
    position,
    historyDistance,
  ]);
  const current = route.places[0];
  const origin = location ?? position;
  const remaining = measureWalk(route.places, origin, route.finish);
  const eta =
    (stage === "preview" ? generatedAt : now) + remaining.minutes * 60000;
  const clock = (value: number) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  const save = () =>
    setMessage(
      saveWalk({
        id: `${citySlug}-${generatedAt}`,
        citySlug,
        cityName,
        placeSlugs: [...visited, ...route.places].map((place) => place.slug),
        minutes: measureWalk(
          [...visited, ...route.places],
          settings.start,
          route.finish,
        ).minutes,
        distance: measureWalk(
          [...visited, ...route.places],
          settings.start,
          route.finish,
        ).distance,
        savedAt: Date.now(),
        settings: { ...settings, finish: route.finish },
      })
        ? t.savedDone
        : t.storageError,
    );
  const proposeShorter = () => {
    try {
      setProposed(proposeShorterWalk(route.places, settings, origin, route.finish));
    } catch {
      setMessage(t.noEligible);
    }
  };
  const finish = () => {
    setFinishedAt(Date.now());
    setStage("finished");
    try {
      sessionStorage.removeItem("citywalk:v2:active");
    } catch {}
  };
  const advance = (mark: boolean) => {
    if (!current) return;
    const nextPosition = mark ? current.coordinates : origin;
    if (mark) {
      setVisited([...visited, current]);
      setHistoryDistance(
        historyDistance +
          (calculateDistanceMeters(position, current.coordinates) ?? 0),
      );
      setPosition(current.coordinates);
    }
    setRoute(measureWalk(route.places.slice(1), nextPosition, route.finish));
    setNow(Date.now());
  };
  const proposeAdd = () => {
    const place = places.find(
      (item) =>
        item.slug === candidate &&
        isEligibleTourPlace(item) &&
        ![...visited, ...route.places].some(
          (existing) => existing.slug === item.slug,
        ),
    );
    if (!place) return;
    const next = proposeAddedStop(route.places, place, visited.map(p => p.slug), settings, origin, route.finish, startedAt ?? Date.now());
    if (!next) {
      setMessage(t.noEligible);
      return;
    }
    setProposed(next);
    setPanel(undefined);
  };
  const returnTo = (point: Point) => {
    setProposed(measureWalk([], origin, point));
    setPanel(undefined);
  };
  const navigate = (point: Point) =>
    `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`;
  const feedback = (key: string, value: string) => {
    try {
      localStorage.setItem(`citywalk:feedback:${generatedAt}:${key}`, value);
      setMessage(t.thanks);
    } catch {
      setMessage(t.storageError);
    }
  };
  return (
    <div className={`walk-journey walk-${stage}`}>
      {stage === "finished" ? (
        <FinishWalkScreen
          locale={locale}
          citySlug={citySlug}
          cityName={cityName}
          visited={visited}
          historyDistance={historyDistance}
          elapsedMinutes={Math.max(
            0,
            Math.round(((finishedAt ?? now) - (startedAt ?? now)) / 60000),
          )}
          save={save}
          setMessage={setMessage}
          feedback={feedback}
          customize={customize}
        />
      ) : (
        <>
          <header
            className={
              stage === "preview" ? "walk-hero preview-hero" : "active-heading"
            }
          >
            <p className="text-sm text-primary">
              {stage === "preview"
                ? t.preview
                : !current ? t.remaining : formatMessage(t.stop, {
                    number: visited.length + 1,
                    total: visited.length + route.places.length,
                  })}
            </p>
            <h2 id="walk-title" className="mt-2 break-words text-3xl font-bold">
              {stage === "preview" ? cityName : (current?.name ?? t.takeBack)}
            </h2>
            {stage === "active" && current && (
              <p
                lang={current.actualLocale}
                dir={current.contentDirection}
                className="mt-2 text-sm leading-6 text-text-secondary"
              >
                {current.shortDescription}
              </p>
            )}
          </header>
          {stage === "preview" && (
            <RouteSummary route={remaining} locale={locale} />
          )}
          {settings.deadline && (
            <div className="return-estimate mb-5 rounded-2xl border bg-success-soft p-4">
              <p className="font-semibold">
                {formatMessage(t.eta, { time: clock(eta) })}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatMessage(t.buffer, {
                  time: clock(settings.deadline),
                  minutes: Math.floor((settings.deadline - eta) / 60000),
                })}
              </p>
              {eta > settings.deadline && stage === "active" && (
                <>
                  <p className="mt-3 text-sm">{t.late}</p>
                  <button
                    className="button-secondary mt-3"
                    onClick={proposeShorter}
                  >
                    {t.shorten}
                  </button>
                </>
              )}
            </div>
          )}
          {(map || stage === "active") && (
            <WalkMap
              places={route.places}
              locale={locale}
              citySlug={citySlug}
              start={origin}
              finish={route.finish}
            />
          )}
          {stage === "preview" ? (
            <>
              <div className="itinerary-heading">
                <h3 className="text-xl font-bold">{t.itinerary}</h3>
                <button
                  className="button-tertiary"
                  onClick={() => setMap(!map)}
                >
                  <Map size={20} aria-hidden="true" />
                  {t.map}
                </button>
              </div>
              <Itinerary places={route.places} />
              {route.finish && (
                <p className="mt-3 text-sm text-text-secondary">
                  {t.returnLeg}
                </p>
              )}
              <button
                className="button-primary mt-5 w-full"
                onClick={() => {
                  setStage("active");
                  setStartedAt(Date.now());
                  setNow(Date.now());
                  void requestLocation();
                }}
              >
                <Navigation size={20} fill="currentColor" aria-hidden="true" />
                {t.startWalk}
              </button>
              <div className="mt-3 flex gap-3">
                <button className="button-secondary flex-1" onClick={customize}>
                  <SlidersHorizontal size={20} aria-hidden="true" />
                  {t.customize}
                </button>
                <button className="button-secondary flex-1" onClick={save}>
                  <Bookmark size={20} aria-hidden="true" />
                  {t.save}
                </button>
              </div>
            </>
          ) : (
            <>
              {(current || route.finish) && (
                <>
                  <div className="walk-navigation-bar">
                    <p className="text-sm font-medium">
                      <Footprints size={22} aria-hidden="true" />
                      {formatMessage(t.minutes, {
                        minutes:
                          estimateWalkingMinutes(
                            calculateDistanceMeters(
                              origin,
                              current?.coordinates ?? route.finish!,
                            ) ?? 0,
                          ) ?? 0,
                      })}{" "}
                      ·{" "}
                      {formatDistance(
                        calculateDistanceMeters(
                          origin,
                          current?.coordinates ?? route.finish!,
                        ) ?? 0,
                        locale,
                      )}
                    </p>
                    <a
                      className="button-primary w-full"
                      href={navigate(current?.coordinates ?? route.finish!)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation
                        size={20}
                        fill="currentColor"
                        aria-hidden="true"
                      />
                      {t.navigate}
                    </a>
                  </div>
                </>
              )}
              {current && (
                <div className="walk-content-actions my-4 grid grid-cols-3 gap-2">
                  <Link
                    className="button-secondary flex-col px-2 py-3 text-xs"
                    href={`${current.detailHref}#audio-guide`}
                  >
                    <Headphones size={19} />
                    {t.listen}
                  </Link>
                  <Link
                    className="button-secondary flex-col px-2 py-3 text-xs"
                    href={current.detailHref ?? `/${locale}/${citySlug}`}
                  >
                    <BookOpen size={19} />
                    {t.read}
                  </Link>
                  <button
                    className="button-secondary flex-col px-2 py-3 text-xs"
                    onClick={() => setAssistant(!assistant)}
                  >
                    <MessageCircle size={19} />
                    {t.ask}
                  </button>
                </div>
              )}
              <h3 className="mt-5 font-bold">{t.tripControls}</h3>
              <div className="trip-controls my-3 grid grid-cols-4 gap-2">
                <button
                  className="button-secondary"
                  disabled={!current}
                  onClick={() =>
                    setProposed(
                      measureWalk(route.places.slice(1), origin, route.finish),
                    )
                  }
                >
                  <SkipForward size={24} aria-hidden="true" />
                  {t.skip}
                </button>
                <button
                  className="button-secondary"
                  disabled={!current}
                  onClick={proposeShorter}
                >
                  <Split size={24} aria-hidden="true" />
                  {t.shorten}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => setPanel("add")}
                >
                  <Plus size={24} aria-hidden="true" />
                  {t.add}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => setPanel("back")}
                >
                  <Undo2 size={24} aria-hidden="true" />
                  {t.takeBack}
                </button>
              </div>
              {assistant && (
                <section className="walk-assistant surface-card my-4 p-4">
                  <h3 className="assistant-heading">
                    <Sparkles size={22} aria-hidden="true" />
                    {t.assistant}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {cityName} · {visited.length} {t.placesVisited} ·{" "}
                    {formatMessage(t.minutes, { minutes: remaining.minutes })}
                  </p>
                  <button
                    className="button-secondary mt-3 w-full"
                    onClick={proposeShorter}
                  >
                    {t.tired}
                  </button>
                  <button
                    className="button-secondary mt-2 w-full"
                    onClick={() => {
                      const food = places.find(
                        (place) =>
                          place.category === "eat" &&
                          isEligibleTourPlace(place) &&
                          ![...visited, ...route.places].some(
                            (item) => item.slug === place.slug,
                          ),
                      );
                      if (food) {
                        setCandidate(food.slug);
                        setPanel("add");
                      } else setMessage(t.noEligible);
                    }}
                  >
                    {t.coffee}
                  </button>
                  {current && (
                    <AskGuide
                      walkContext={buildWalkGuideContext({
                        visited, remaining: route.places, settings,
                        minutesRemaining: remainingWalkBudget(settings, startedAt ?? generatedAt, now), finish: route.finish,
                      })}
                      citySlug={citySlug}
                      placeSlug={current.slug}
                      placeName={current.name}
                      locale={locale}
                      direction={getDirection(locale)}
                      buttonLabel={t.ask}
                      closeLabel={t.back}
                      labels={existing.ai}
                      suggestions={[]}
                    />
                  )}
                </section>
              )}
              {panel && (
                <TripDestinationPicker
                  mode={panel}
                  places={places.filter(
                    (place) =>
                      isEligibleTourPlace(place) &&
                      (panel === "back" ||
                        ![...visited, ...route.places].some(
                          (item) => item.slug === place.slug,
                        )),
                  )}
                  candidate={candidate}
                  select={setCandidate}
                  locale={locale}
                  onStart={() => returnTo(settings.start)}
                  cancel={() => setPanel(undefined)}
                  onContinue={() => {
                    if (panel === "add") proposeAdd();
                    else {
                      const place = places.find(
                        (place) => place.slug === candidate,
                      );
                      if (place) returnTo(place.coordinates);
                    }
                  }}
                />
              )}
              {proposed && (
                <RouteChangeReview
                  route={proposed}
                  locale={locale}
                  confirm={() => {
                    setRoute(proposed);
                    setPosition(origin);
                    setNow(Date.now());
                    setProposed(undefined);
                  }}
                  cancel={() => setProposed(undefined)}
                />
              )}
              {current && (
                <button
                  className="button-primary mt-3 w-full"
                  onClick={() => advance(true)}
                >
                  <Check size={18} />
                  {t.visited}
                </button>
              )}
              <button className="button-tertiary mt-3 w-full" onClick={finish}>
                {t.finish}
              </button>
            </>
          )}
          <p className="mt-5 text-xs leading-5 text-text-secondary">
            {t.estimated}
          </p>
        </>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-xl bg-surface p-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
