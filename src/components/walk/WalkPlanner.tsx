"use client";
import { useState, useSyncExternalStore } from "react";
import {
  Check,
  Route,
  Clock3,
  Landmark,
  Building2,
  Diamond,
  Leaf,
  Utensils,
  Drama,
  Users,
  Footprints,
  Navigation,
} from "lucide-react";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { Locale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n";
import { useUserLocation } from "@/hooks/useUserLocation";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
import {
  buildWalk,
  deadlineForToday,
  interestTags,
  type Interest,
  type WalkRoute,
  type WalkSettings,
} from "@/lib/walk/planner";
import { LoadingProgress, WalkError } from "./WalkStates";
import BottomNavigation from "./BottomNavigation";
import WalkOverlay from "./WalkOverlay";
import WalkJourney from "./WalkJourney";
import { readJourney, restoredRoute, readSavedRoute } from "@/lib/walk/session";
type PlannerProps = {
  places: readonly DiscoveryPlace[];
  locale: Locale;
  citySlug: string;
  cityName: string;
};
const interestIcons = {
  history: Landmark,
  architecture: Building2,
  "hidden-gems": Diamond,
  nature: Leaf,
  food: Utensils,
  culture: Drama,
  family: Users,
};
const subscribe = () => () => {};
export default function WalkPlanner(props: PlannerProps) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return hydrated ? (
    <Planner {...props} />
  ) : (
    <div className="h-14 animate-pulse rounded-2xl bg-surface" />
  );
}
function Planner({ places, locale, citySlug, cityName }: PlannerProps) {
  const [restored, setRestored] = useState(() => readJourney(citySlug, places));
  const [saved] = useState(() => readSavedRoute(citySlug, places));
  const [requestedPlace] = useState(() =>
    new URLSearchParams(window.location.search).get("add"),
  );
  const t = walkCopy(locale);
  const [open, setOpen] = useState(
    Boolean(restored || saved || requestedPlace),
  );
  const [step, setStep] = useState(1);
  const [minutes, setMinutes] = useState(120);
  const [mode, setMode] = useState<"duration" | "deadline">("duration");
  const [time, setTime] = useState("");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [walking, setWalking] = useState<WalkSettings["walking"]>("balanced");
  const [start, setStart] = useState(requestedPlace ?? "");
  const [end, setEnd] = useState("anywhere");
  const [destination, setDestination] = useState("");
  const [state, setState] = useState<"form" | "loading" | "error" | "result">(
    restored || saved ? "result" : "form",
  );
  const [phase, setPhase] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [built, setBuilt] = useState<
    | {
        route: WalkRoute<DiscoveryPlace>;
        settings: WalkSettings;
        generatedAt: number;
      }
    | undefined
  >(() =>
    restored
      ? {
          route: restoredRoute(restored, places),
          settings: restored.settings,
          generatedAt: restored.generatedAt,
        }
      : saved,
  );
  const { location, status, requestLocation } = useUserLocation();
  const supported = (Object.keys(interestTags) as Interest[]).filter((key) =>
    places.some((place) =>
      interestTags[key].some((tag) => place.tags?.includes(tag)),
    ),
  );
  const options = places.map((place) => (
    <option key={place.slug} value={place.slug}>
      {place.name}
    </option>
  ));
  const build = async () => {
    const origin =
      start === "gps"
        ? location
        : places.find((place) => place.slug === start)?.coordinates;
    const finish =
      end === "loop"
        ? origin
        : end === "destination"
          ? places.find((place) => place.slug === destination)?.coordinates
          : undefined;
    const deadline = mode === "deadline" ? deadlineForToday(time) : undefined;
    if (
      !origin ||
      (end === "destination" && !finish) ||
      (mode === "deadline" && !deadline)
    ) {
      setInvalid(true);
      return;
    }
    const settings: WalkSettings = {
      minutes,
      deadline,
      start: origin,
      finish,
      interests,
      walking,
    };
    setInvalid(false);
    setState("loading");
    setPhase(0);
    try {
      // Yield between real processing stages so assistive technology and the
      // browser can render progress; no invented percentage or timed completion.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const eligible = places.filter((place) =>
        Number.isFinite(place.durationMinutes),
      );
      setPhase(1);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const route = buildWalk(eligible, settings);
      setPhase(2);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      setBuilt({ route, settings, generatedAt: Date.now() });
      setPhase(3);
      setState("result");
    } catch {
      setState("error");
    }
  };
  if (!open && state !== "result")
    return (
      <section id="build-walk" className="scroll-mt-6">
        <button onClick={() => setOpen(true)} className="button-primary w-full">
          <Route size={20} />
          <span lang={walkCopyLocale(locale)}>{t.build}</span>
        </button>
      </section>
    );
  return (
    <>
      {!open && (
        <button className="button-primary w-full" onClick={() => setOpen(true)}>
          {t.resume}
        </button>
      )}
      <WalkOverlay
        scrollKey={`${step}:${state}`}
        footer={
          state === "result" || state === "error" ? (
            <BottomNavigation
              locale={locale}
              citySlug={citySlug}
              active="trips"
            />
          ) : undefined
        }
        open={open}
        label={t.back}
        lang={walkCopyLocale(locale)}
        close={() => setOpen(false)}
      >
        <section id="build-walk">
          {state === "loading" ? (
            <LoadingProgress t={t} phase={phase} />
          ) : state === "error" ? (
            <WalkError
              t={t}
              retry={() => void build()}
              close={() => {
                setOpen(false);
                setState("form");
              }}
            />
          ) : state === "result" && built ? (
            built.route.places.length || restored ? (
              <WalkJourney
                restored={restored}
                {...built}
                places={places}
                locale={locale}
                citySlug={citySlug}
                cityName={cityName}
                customize={() => {
                  setRestored(undefined);
                  setBuilt(undefined);
                  setState("form");
                  setStep(1);
                }}
              />
            ) : (
              <WalkError
                t={t}
                empty
                retry={() => {
                  setState("form");
                  setStep(1);
                }}
                close={() => {
                  setOpen(false);
                  setState("form");
                }}
              />
            )
          ) : (
            <>
              <header className="walk-hero planner-hero">
                <div className="planner-step">
                  <span>{formatMessage(t.step, { step })}</span>
                  <span className="step-dots" aria-hidden="true">
                    {[1, 2, 3].map((value) => (
                      <i
                        key={value}
                        className={value <= step ? "is-current" : ""}
                      />
                    ))}
                  </span>
                </div>
                <h2 className="mt-5 text-3xl font-bold">{t.build}</h2>
                {step === 1 && (
                  <p className="mt-2 text-lg text-text-secondary">
                    {t.timeQuestion}
                  </p>
                )}
              </header>
              {step === 1 && (
                <div className="mt-7">
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {([60, 120, 180, 240] as const).map((value, index) => (
                      <button
                        key={value}
                        aria-pressed={mode === "duration" && minutes === value}
                        className="walk-choice walk-time-choice"
                        onClick={() => {
                          setMinutes(value);
                          setMode("duration");
                        }}
                      >
                        {index === 3 ? (
                          <Landmark aria-hidden="true" />
                        ) : (
                          <Clock3 aria-hidden="true" />
                        )}
                        <strong>
                          {[t.hour1, t.hour2, t.hour3, t.halfDay][index]}
                        </strong>
                        <small>
                          {
                            [
                              t.quickWalk,
                              t.deeperWalk,
                              t.moreWalk,
                              t.relaxedWalk,
                            ][index]
                          }
                        </small>
                        {mode === "duration" && minutes === value && (
                          <span className="sr-only">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="planner-deadline">
                    <h3 className="font-semibold">{t.deadlineQuestion}</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {t.deadlineHelp}
                    </p>
                    <label className="deadline-toggle">
                      <input
                        type="checkbox"
                        checked={mode === "deadline"}
                        onChange={(e) =>
                          setMode(e.target.checked ? "deadline" : "duration")
                        }
                      />
                      {t.returnBy}
                    </label>
                    {mode === "deadline" && (
                      <input
                        aria-label={t.returnBy}
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="walk-input deadline-input"
                        required
                      />
                    )}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="mt-7">
                  <fieldset>
                    <legend className="text-xl font-semibold">
                      {t.interests}
                    </legend>
                    <p className="mt-2 text-sm text-text-secondary">
                      {t.interestsHelp}
                    </p>
                    <div className="interest-options">
                      {supported.map((key) => {
                        const Icon = interestIcons[key];
                        return (
                          <button
                            type="button"
                            key={key}
                            className="walk-choice"
                            aria-pressed={interests.includes(key)}
                            onClick={() =>
                              setInterests((current) =>
                                current.includes(key)
                                  ? current.filter((item) => item !== key)
                                  : [...current, key],
                              )
                            }
                          >
                            <Icon size={23} aria-hidden="true" />
                            {t[key]}
                            {interests.includes(key) && <Check size={17} />}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="mt-7">
                    <legend className="mb-3 text-lg font-semibold">
                      {t.walking}
                    </legend>
                    <div className="walking-options">
                      {(["easy", "balanced", "long"] as const).map((value) => (
                        <button
                          key={value}
                          className="walk-choice"
                          aria-pressed={walking === value}
                          onClick={() => setWalking(value)}
                        >
                          <Footprints size={22} aria-hidden="true" />
                          {t[value]}
                          {walking === value && <Check size={18} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
              {step === 3 && (
                <div className="mt-7 grid gap-6">
                  <label className="font-semibold">
                    {t.start}
                    <select
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        if (e.target.value === "gps") void requestLocation();
                      }}
                      className="walk-input"
                    >
                      <option value="">{t.choosePlace}</option>
                      <option value="gps">{t.current}</option>
                      {options}
                    </select>
                  </label>
                  {start === "gps" && !location && (
                    <p role="status" className="text-sm text-text-secondary">
                      {status === "requesting" ? t.current + "…" : t.gpsHelp}
                    </p>
                  )}
                  <label className="font-semibold">
                    {t.end}
                    <select
                      className="walk-input"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    >
                      <option value="anywhere">{t.anywhere}</option>
                      <option value="loop">{t.loop}</option>
                      <option value="destination">{t.destination}</option>
                    </select>
                  </label>
                  {end === "destination" && (
                    <label>
                      {t.destination}
                      <select
                        className="walk-input"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      >
                        <option value="">{t.selectPlace}</option>
                        {options}
                      </select>
                    </label>
                  )}
                </div>
              )}
              {invalid && (
                <p role="alert" className="mt-4 text-sm text-text-secondary">
                  {t.invalid}
                </p>
              )}
              <button
                className="button-primary mt-7 w-full planner-continue"
                onClick={() => {
                  if (step < 3) {
                    if (
                      step === 1 &&
                      mode === "deadline" &&
                      !deadlineForToday(time)
                    ) {
                      setInvalid(true);
                      return;
                    }
                    setInvalid(false);
                    setStep(step + 1);
                  } else void build();
                }}
              >
                <Navigation size={20} aria-hidden="true" fill="currentColor" />
                {step === 3 ? t.buildAction : t.continue}
              </button>
              <button
                className="button-tertiary mt-2 w-full"
                onClick={() => (step > 1 ? setStep(step - 1) : setOpen(false))}
              >
                {t.back}
              </button>
            </>
          )}
        </section>
      </WalkOverlay>
    </>
  );
}
