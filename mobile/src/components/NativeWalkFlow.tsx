import { useAccountWalks } from "../hooks/useAccountWalks";
import { usePremiumAccess } from "../hooks/usePremiumAccess";
import { accountWalkState, saveAccountWalk, loadAccountWalkForOpen } from "../lib/accountWalks";
import { SaveAccountGate } from "./SaveAccountGate";
import { PublicStoreReview } from "./PublicStoreReview";
import { t as translate, type TranslationKey } from "@citywalk/i18n";
import { nativeCategoryLabel } from "../lib/contentLabels";
import { uxCopy } from "../design/uxCopy";
import { CitywalkLoading } from "./CitywalkLoading";
import { nativeCityName, nativePlaceName } from "../lib/displayNames";
import { discoveryCopy } from "../design/discoveryCopy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  BackHandler,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  View,
} from "react-native";
import {
  buildWalkSteps,
  type WalkBuildStage,
  deadlineForToday,
  interestTags,
  measureWalk,
  type Interest,
  type Point,
  type WalkRoute,
  type WalkSettings,
} from "@citywalk/traveler-core/walkPlanner";
import {
  advanceWalk,
  proposeAddedStop,
  proposeShorterWalk,
  type WalkJourney,
} from "@citywalk/traveler-core/walkJourney";
import {
  calculateDistanceMeters,
  isEligibleTourPlace,
} from "@citywalk/traveler-core";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import type { PublicPlaceCard } from "../lib/api/contracts";
import {
  loadCurrentWalk,
  changeCurrentWalk,
  subscribeCurrentWalk,
  persistCurrentWalk,
  loadSavedWalks,
  reopenSavedWalk,
  saveWalkFeedback,
  startCurrentWalk,
  walkStartStatus,
  walkSaveStatus,
  clearCurrentWalk,
  type CurrentWalk,
} from "../lib/walkStorage";
import { loadLocalTrips } from "../lib/tripStorage";
import { createMobileTripId } from "../lib/tripNavigation";
import { loadTravelerStyle } from "../lib/travelerStyle";
import { nativeAuthClient } from "../lib/auth/client";
import { requestForegroundLocation } from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import {
  completeCitywalkLiveWalk,
  disableCitywalkLiveWalk,
  enableCitywalkLiveWalk,
  getLiveWalkRuntimeStatus,
  publishForegroundLiveWalkLocation,
  refreshCitywalkLiveActivity,
} from "../lib/backgroundWalk";
import {
  loadLiveWalkSession,
  markLiveWalkRouteUpdated,
  subscribeLiveWalkSession,
  syncLiveWalkSession,
  type LiveWalkSession,
} from "../lib/liveWalkStorage";
import {
  buildLiveWalkDiagnostics,
  buildLiveWalkPresentation,
} from "../lib/liveWalkPresentation";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeCityMap } from "./NativeCityMap";
import { NativeLiveWalkCard } from "./NativeLiveWalkCard";
import {
  AppText,
  PressableSurface,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusMessage,
} from "./ui";
import { WalkChoices, WalkInput, WalkPlacePicker } from "./WalkControls";
import {
  MetricSummary,
  StepProgress,
  V2Hero,
  V2Itinerary,
  V2Loading,
  V2WalkError,
} from "./V2Presentation";
import { NativeIcon } from "./NativeIcon";
import { colors } from "../design/tokens";
import { walkStyles as styles } from "../design/walkStyles";

type ActiveWalkMode = "basic" | "live";

export function NativeWalkFlow({
  citySlug,
  cityName,
  places,
  savedId,
  addSlug,
  accountSaved = false,
  contentStatus = "available",
  authorizeStart,
}: {
  citySlug: string;
  cityName: string;
  places: readonly PublicPlaceCard[];
  savedId?: string;
  accountSaved?: boolean;
  addSlug?: string;
  contentStatus?: "available" | "loading" | "error";
  authorizeStart?: () => Promise<boolean>;
}) {
  const { locale, messages } = useNativeLocale(),
    t = walkCopy(locale),
    router = useRouter();
  const [stage, setStage] = useState<
    "hydrate" | "plan" | "building" | "preview" | "active" | "finished"
  >("hydrate");
  const account = useAccountWalks();
  const premium = usePremiumAccess();
  const savedMessage = translate(locale, "saved.accountDone");
  const [saveGate, setSaveGate] = useState(false);

  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [updating, setUpdating] = useState(false);
  const [rebuildConfirmation, setRebuildConfirmation] = useState<{ current: CurrentWalk | undefined }>();
  const updateLock = useRef(false);
  const feedbackLock = useRef(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [reviewSettled, setReviewSettled] = useState<string>();
  const [showPrivateFeedback, setShowPrivateFeedback] = useState<string>();
  const reviewDidSettle = useCallback((id: string) => setReviewSettled(id), []);
  const scroll = useRef<ScrollView>(null);
  const buildLayoutReady = useRef<(() => void) | undefined>(undefined);
  const buildPresented = useRef<(() => void) | undefined>(undefined);
  const handleBuildPresented = useCallback(() => {
    buildPresented.current?.();
    buildPresented.current = undefined;
  }, []);
  const [liveSession, setLiveSession] = useState<LiveWalkSession>();
  const [foregroundPoint, setForegroundPoint] = useState<Point>();
  const [liveBusy, setLiveBusy] = useState(false);
  const [requestedActiveMode, setActiveMode] = useState<ActiveWalkMode>("basic");
  const [showManageWalk, setShowManageWalk] = useState(false);
  const [showLiveItinerary, setShowLiveItinerary] = useState(false);
  const [showLiveInspect, setShowLiveInspect] = useState(false);
  const [liveInspect, setLiveInspect] = useState("");
  const [journey, setJourney] = useState<WalkJourney>(),
    [proposed, setProposed] = useState<WalkRoute<PublicPlaceCard>>();
  const activeMode: ActiveWalkMode =
    stage === "active" &&
    journey &&
    premium.active &&
    liveSession?.journeyId === journey.id
      ? "live"
      : requestedActiveMode;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; buildLayoutReady.current?.(); buildPresented.current?.(); };
  }, []);
  useEffect(() => {
    let alive = true;
    void loadLiveWalkSession().then((session) => {
      if (alive) setLiveSession(session);
    });
    const unsubscribe = subscribeLiveWalkSession((session) => {
      if (alive) setLiveSession(session);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  const [step, setStep] = useState(1),
    [minutes, setMinutes] = useState(120),
    [returnBy, setReturnBy] = useState("");
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [stage, step]);
  const [interests, setInterests] = useState<Interest[]>([
      "history",
      "architecture",
    ]),
    [categories, setCategories] = useState<string[]>([]);
  const [walking, setWalking] = useState<WalkSettings["walking"]>("balanced");
  const [startSlug, setStartSlug] = useState(addSlug ?? places[0]?.slug ?? ""),
    [gps, setGps] = useState<Point>();
  const [startMode, setStartMode] = useState<"place" | "gps">("place"),
    [locating, setLocating] = useState(false);
  const [endMode, setEndMode] = useState<"anywhere" | "loop" | "destination">(
      "loop",
    ),
    [endSlug, setEndSlug] = useState(places[0]?.slug ?? "");
  const [panel, setPanel] = useState<"add" | "back">(),
    [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now()),
    [generatedAt, setGeneratedAt] = useState(() => Date.now());
  const [showMap, setShowMap] = useState(false);
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [buildError, setBuildError] = useState<"empty" | "error">();
  const [buildStage, setBuildStage] = useState<WalkBuildStage>("matching");
  const [rating, setRating] = useState<string[]>([]),
    [fit, setFit] = useState<string[]>([]);
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalKind, setProposalKind] = useState<"adaptation" | "take_back">(
    "adaptation",
  );
  const eligible = places.filter(isEligibleTourPlace);
  const named = (slugs: string[]) =>
    slugs.flatMap((slug) => places.find((p) => p.slug === slug) ?? []);

  const samePoint = (left: Point | undefined, right: Point | undefined) =>
    Boolean(
      left &&
        right &&
        Math.abs(left.lat - right.lat) < 0.000001 &&
        Math.abs(left.lng - right.lng) < 0.000001,
    );
  const finishNameFor = (walk: WalkJourney) => {
    if (!walk.finish) return undefined;
    if (samePoint(walk.finish, walk.settings.start)) return t.tripStart;
    const place = places.find((candidate) =>
      samePoint(candidate.coordinates, walk.finish),
    );
    return place
      ? nativePlaceName(citySlug, place.slug, place.content.name, locale)
      : t.destination;
  };
  const liveStopsFor = (walk: WalkJourney) =>
    walk.remaining.flatMap((slug) => {
      const place = places.find((candidate) => candidate.slug === slug);
      if (!place) return [];
      return [{
        slug,
        name: nativePlaceName(citySlug, slug, place.content.name, locale),
        point: place.coordinates,
        durationMinutes: place.durationMinutes,
        storyReady: place.media.some(
          (media) =>
            media.kind === "audio" &&
            media.purpose === "audio" &&
            media.locale === locale,
        ),
      }];
    });
  async function syncLiveCompanion(
    walk: WalkJourney,
    routeUpdated = false,
  ) {
    const finishName = finishNameFor(walk);
    const session = await syncLiveWalkSession({
      journeyId: walk.id,
      citySlug,
      cityName: nativeCityName(citySlug, cityName, locale),
      locale,
      plannedMinutes: walk.settings.minutes,
      startedAt: walk.startedAt,
      ...(walk.settings.deadline === undefined
        ? {}
        : { deadline: walk.settings.deadline }),
      visitedCount: walk.visited.length,
      totalStops: walk.visited.length + walk.remaining.length,
      stops: liveStopsFor(walk),
      ...(walk.finish && finishName
        ? { finish: { name: finishName, point: walk.finish } }
        : {}),
      takeBack: walk.takeBack === true,
    });
    const nextSession = routeUpdated
      ? await markLiveWalkRouteUpdated() ?? session
      : session;
    if (nextSession.enabled) {
      await refreshCitywalkLiveActivity(walk.position);
    }
    return nextSession;
  }
  const liveSyncKey = journey
    ? JSON.stringify([
        journey.id,
        journey.remaining,
        journey.visited,
        journey.finish,
        journey.takeBack === true,
        journey.settings.minutes,
        journey.settings.deadline,
        locale,
      ])
    : "";
  useEffect(() => {
    if (
      stage !== "active" ||
      !journey ||
      activeMode !== "live" ||
      !premium.active
    ) return;
    void syncLiveCompanion(journey);
    // Sync only execution identity/route changes; raw GPS publishes separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, activeMode, premium.active, liveSyncKey]);
  const dynamicTags = [
    ...new Set(eligible.flatMap((p) => p.tags ?? [])),
  ].filter(
    (tag) =>
      !Object.values(interestTags)
        .flat()
        .includes(tag as never),
  );
  const options = eligible.map((p) => ({
    value: p.slug,
    label: nativePlaceName(citySlug, p.slug, p.content.name, locale),
  }));
  const clock = (time: number) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(time);
  const duration = (n: number) =>
    t.minutes.replace("{minutes}", String(Math.round(n)));
  const distance = (n: number) => `${(n / 1000).toFixed(1)} km`;

  useEffect(() => {
    let alive = true;
    void (async () => {
      let restored: WalkJourney | undefined;
      let restoredPhase: "preview" | "active" = "active";
      if (savedId) {
        restored = accountSaved ? await loadAccountWalkForOpen(savedId, citySlug) : (await loadSavedWalks()).find(
          (w) => w.id === savedId && w.citySlug === citySlug,
        );
        if (!restored && !accountSaved) {
          const legacy = (await loadLocalTrips()).find(
            (w) => w.id === savedId && w.citySlug === citySlug,
          );
          const start = places.find(
            (p) => p.slug === legacy?.stopSlugs[0],
          )?.coordinates;
          if (legacy && start)
            restored = {
              id: legacy.id,
              citySlug,
              remaining: [...legacy.stopSlugs],
              visited: [],
              position: start,
              historyDistance: 0,
              startedAt: Date.now(),
              settings: {
                minutes: legacy.timeBudgetMinutes,
                interests: [...legacy.preferences.interests],
                walking:
                  legacy.preferences.walkingPreference === "less-walking"
                    ? "easy"
                    : "balanced",
                start,
              },
            };
        }
        if (restored) {
          restored = reopenSavedWalk(restored, createMobileTripId("walk"));
        }
      } else {
        const current = await loadCurrentWalk(citySlug);
        restored = current?.journey;
        restoredPhase = current?.phase ?? "active";
      }
      if (!alive) return;
      if (restored) {
        const allKnown = [...restored.remaining, ...restored.visited].every(
          (slug) => places.some((p) => p.slug === slug),
        );
        const allEligible = restored.remaining.every((slug) =>
          eligible.some((p) => p.slug === slug),
        );
        if (savedId || restoredPhase === "preview" || (allKnown && allEligible)) {
          if (savedId) await persistCurrentWalk(restored, "preview");
          if (!alive) return;
          setJourney(restored);
          setStage(savedId ? "preview" : restoredPhase);
          if (addSlug && ![...restored.visited, ...restored.remaining].includes(addSlug)) {
            const candidate = places.find((place) => place.slug === addSlug);
            const proposal = candidate
              ? proposeAddedStop(
                  restored.remaining.flatMap(
                    (slug) => places.find((place) => place.slug === slug) ?? [],
                  ),
                  candidate,
                  restored.visited,
                  restored.settings,
                  restored.position,
                  restored.finish,
                  restored.startedAt,
                )
              : undefined;
            if (proposal) setProposed(proposal);
            else {
              setPanel("add");
              setProposalMessage(t.noEligible);
            }
          }
          return;
        }
        setMessage(t.noEligible);
      }
      const auth = await nativeAuthClient.getSession().catch(() => ({ data: null }));
      const style = await loadTravelerStyle(auth.data?.user.id);
      if (!alive) return;
      setMinutes(style.minutes);
      setInterests([...style.interests]);
      setWalking(style.walking);
      setStage("plan");
    })().catch(() => {
      if (alive) {
        setMessage(messages.tripSaveFailed);
        setStage("plan");
      }
    });
    return () => {
      alive = false;
    };
    // Hydrate once per city/saved route; locale refresh must not reset an active walk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySlug, savedId, accountSaved]);
  useEffect(() => {
    if (stage !== "preview" && stage !== "active") return;
    return subscribeCurrentWalk(citySlug, current => {
      setMessage(previous => previous === savedMessage ? "" : previous);
      setJourney(current?.journey);
      setStage(current?.phase ?? "plan");
      // A proposal belongs to the route it was computed from.
      setProposed(undefined);
      setProposalMessage("");
    });
  }, [citySlug, stage, savedMessage]);
  useEffect(() => {
    if (stage !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (rebuildConfirmation) {
          if (!updateLock.current) setRebuildConfirmation(undefined);
          return true;
        }
        if (proposed) {
          setProposed(undefined);
          return true;
        }
        if (panel) {
          setPanel(undefined);
          return true;
        }
        if (stage === "plan" && step > 1) {
          setStep((value) => value - 1);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [proposed, panel, stage, step, rebuildConfirmation]);
  async function locate() {
    setLocating(true);
    const result = await requestForegroundLocation(
      expoForegroundLocationAdapter,
    );
    setLocating(false);
    if (result.status === "available") {
      setGps({ lat: result.location.latitude, lng: result.location.longitude });
      setStartMode("gps");
      setMessage("");
    } else setMessage(t.gpsHelp);
  }
  async function build() {
    const start =
      startMode === "gps"
        ? gps
        : places.find((p) => p.slug === startSlug)?.coordinates;
    const finish =
      endMode === "loop"
        ? start
        : endMode === "destination"
          ? places.find((p) => p.slug === endSlug)?.coordinates
          : undefined;
    const deadline = returnBy ? deadlineForToday(returnBy) : undefined;
    if (
      !start ||
      (returnBy && !deadline) ||
      (endMode === "destination" && !finish)
    ) {
      setMessage(t.invalid);
      return;
    }
    setMessage("");
    setBuildStage("matching");
    const presented = new Promise<void>((resolve) => { buildPresented.current = resolve; });
    setStage("building");
    // Wait for this native view's real layout, not a synthetic display timer.
    // A fast local plan must not finish before its progress screen is attached.
    await new Promise<void>((resolve) => { buildLayoutReady.current = resolve; });
    if (!mounted.current) return;
    try {
      const settings: WalkSettings = {
        minutes,
        deadline,
        start,
        finish,
        interests,
        categories,
        walking,
      };
      const steps = buildWalkSteps(places, settings);
      let result = steps.next();
      while (!result.done) {
        setBuildStage(result.value);
        // Render before the next synchronous work unit; no decorative delay.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!mounted.current) return;
        result = steps.next();
      }
      // Local planning can finish during the native entrance transition. Keep
      // its real progress mounted until that transition has actually completed.
      await presented;
      if (!mounted.current) return;
      const route = result.value;
      if (!route.places.length) {
        setBuildError("empty");
        setStage("plan");
        return;
      }
      const time = Date.now();
      setGeneratedAt(time);
      setNow(time);
      const generated: WalkJourney = {
        id: createMobileTripId("walk"),
        citySlug,
        settings,
        remaining: route.places.map((p) => p.slug),
        visited: [],
        position: start,
        finish,
        historyDistance: 0,
        startedAt: time,
      };
      await persistCurrentWalk(generated, "preview");
      if (!mounted.current) return;
      setJourney(generated);
      setStage("preview");
    } catch {
      setBuildError("error");
      setStage("plan");
    }
  }
  async function update(
    next: WalkJourney,
    phase: "preview" | "active" = stage === "preview" ? "preview" : "active",
    liveRouteUpdated = false,
  ) {
    if (updateLock.current) return false;
    updateLock.current = true; setUpdating(true);
    try {
      const result = await changeCurrentWalk(citySlug, current => {
        if (!current || current.journey.id !== next.id) throw new Error("Walk changed");
        const changesStops = next.remaining !== journey?.remaining || next.visited !== journey?.visited;
        if (changesStops && JSON.stringify([current.journey.remaining, current.journey.visited]) !== JSON.stringify([journey?.remaining, journey?.visited])) throw new Error("Walk changed");
        return { phase, journey: changesStops ? next : { ...next, remaining: current.journey.remaining, visited: current.journey.visited } };
      });
      setJourney(result.journey);
      setNow(Date.now());
      if (phase === "active" && activeMode === "live" && premium.active) {
        await syncLiveCompanion(result.journey, liveRouteUpdated);
      }
      return true;
    } catch { setMessage(messages.tripSaveFailed); return false; }
    finally { updateLock.current = false; setUpdating(false); }
  }
  async function save() {
    if (!journey || saveLock.current || account.loading) return;
    if (!account.userId) { setSaveGate(true); return; }
    saveLock.current = true; setSaving(true); setMessage("");
    try {
      const linked = await saveAccountWalk(journey, places, contentStatus === "available", account.userId);
      // Another screen may have edited membership while storage was settling.
      setJourney(current => current?.id === linked.id
        ? { ...current, accountSavedWalkId: linked.accountSavedWalkId, accountSavedUserId: linked.accountSavedUserId } : current);
      setMessage(translate(locale, "saved.accountDone"));
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(code === "walk-save-empty" ? t.saveEmpty
        : code === "walk-save-loading" || code === "walk-save-unresolved" ? t.saveContentUnavailable : messages.tripSaveFailed);
    }
    finally { saveLock.current = false; setSaving(false); }
  }
  async function start(mode: ActiveWalkMode = "basic") {
    if (!journey || updateLock.current) return;
    if (mode === "live" && !premium.active) {
      unlockPremium();
      return;
    }
    updateLock.current = true; setUpdating(true);
    try {
      if (walkStartStatus(journey, places, contentStatus === "available") !== "ready") return;
      if (authorizeStart && !await authorizeStart()) return;
      const next = await startCurrentWalk(citySlug, journey.id, places, contentStatus === "available");
      setActiveMode(mode);
      setJourney(next.journey);
      setNow(Date.now());
      setStage("active");
      if (mode === "live") {
        try {
          const session = await syncLiveCompanion(next.journey);
          setLiveSession(session);
          const result = await enableCitywalkLiveWalk();
          setLiveSession(await loadLiveWalkSession());
          if (result === "enabled") {
            await refreshCitywalkLiveActivity(next.journey.position);
            setMessage(translate(locale, "liveWalk.enabled"));
          } else if (result === "denied") {
            setMessage(translate(locale, "liveWalk.locationNeeded"));
          } else {
            setMessage(translate(locale, "liveWalk.unavailable"));
          }
        } catch {
          setMessage(translate(locale, "liveWalk.unavailable"));
        }
      } else {
        setForegroundPoint(undefined);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(code === "walk-start-empty" ? t.emptyHelp
        : code === "walk-start-unresolved" || code === "walk-start-loading" ? t.planContentUnavailable : messages.tripSaveFailed);
    } finally { updateLock.current = false; setUpdating(false); }
  }
  async function requestRebuild() {
    if (updateLock.current) return;
    try {
      const current = await loadCurrentWalk(citySlug);
      if (journey && current?.journey.id !== journey.id) throw new Error("walk-changed");
      setMessage(""); setRebuildConfirmation({ current });
    }
    catch { setMessage(messages.tripSaveFailed); }
  }
  async function rebuild() {
    if (!rebuildConfirmation || updateLock.current) return;
    updateLock.current = true; setUpdating(true);
    try {
      await completeCitywalkLiveWalk();
      await clearCurrentWalk(citySlug, rebuildConfirmation.current);
      setJourney(undefined); setProposed(undefined); setPanel(undefined);
      setLiveSession(undefined); setForegroundPoint(undefined); setActiveMode("basic");
      setShowManageWalk(false); setShowLiveItinerary(false); setShowLiveInspect(false);
      setProposalMessage(""); setMessage(""); setBuildError(undefined);
      setStep(1); setMinutes(120); setReturnBy("");
      setInterests(["history", "architecture"]); setCategories([]); setWalking("balanced");
      setStartSlug(places[0]?.slug ?? ""); setEndSlug(places[0]?.slug ?? "");
      setGps(undefined); setStartMode("place"); setEndMode("loop");
      setShowMap(false); setBuildStage("matching");
      setNow(Date.now()); setGeneratedAt(Date.now()); setRating([]); setFit([]);
      setReviewSettled(undefined); setShowPrivateFeedback(undefined);
      setRebuildConfirmation(undefined); setStage("plan");
    } catch { setMessage(messages.tripSaveFailed); }
    finally { updateLock.current = false; setUpdating(false); }
  }
  function unlockPremium() {
    router.push("/premium");
  }
  function shorten() {
    if (!premium.active) {
      unlockPremium();
      return;
    }
    if (!journey) return;
    try {
      setProposalKind("adaptation");
      setProposed(
        proposeShorterWalk(
          named(journey.remaining),
          journey.settings,
          journey.position,
          journey.finish,
        ),
      );
      setProposalMessage("");
    } catch {
      setMessage(t.noEligible);
    }
  }
  function add(slug: string) {
    if (!premium.active) {
      unlockPremium();
      return;
    }
    if (!journey) return;
    const place = places.find((p) => p.slug === slug);
    if (!place) return;
    const next = proposeAddedStop(
      named(journey.remaining),
      place,
      journey.visited,
      journey.settings,
      journey.position,
      journey.finish,
      journey.startedAt,
    );
    if (next) {
      setProposalKind("adaptation");
      setProposed(next);
      setPanel(undefined);
      setProposalMessage("");
    } else setProposalMessage(t.noEligible);
  }
  function back(point: Point) {
    if (!premium.active) {
      unlockPremium();
      return;
    }
    if (journey) {
      setProposalKind("take_back");
      setProposed(measureWalk([], journey.position, point));
      setPanel(undefined);
    }
  }
  async function navigate(point: Point) {
    try {
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`,
      );
    } catch {
      setMessage(messages.unavailable);
    }
  }
  async function toggleLiveWalk() {
    if (!journey || liveBusy) return;
    if (!premium.active) {
      unlockPremium();
      return;
    }
    setLiveBusy(true);
    setMessage("");
    try {
      if (liveSession?.enabled && liveSession.journeyId === journey.id) {
        await disableCitywalkLiveWalk();
        setLiveSession(await loadLiveWalkSession());
        return;
      }
      setActiveMode("live");
      await syncLiveCompanion(journey);
      const result = await enableCitywalkLiveWalk();
      setLiveSession(await loadLiveWalkSession());
      if (result === "enabled") {
        await refreshCitywalkLiveActivity(journey.position);
        setMessage(translate(locale, "liveWalk.enabled"));
      } else if (result === "denied") {
        setMessage(translate(locale, "liveWalk.locationNeeded"));
      } else {
        setMessage(translate(locale, "liveWalk.unavailable"));
      }
    } finally {
      setLiveBusy(false);
    }
  }

  async function inspectLiveWalk() {
    if (!journey) return;
    const session = await loadLiveWalkSession();
    const runtime = await getLiveWalkRuntimeStatus();
    const diagnostics = session
      ? buildLiveWalkDiagnostics(
          session,
          session.lastPublished?.point ?? journey.position,
        )
      : undefined;
    setLiveInspect(JSON.stringify({ ...runtime, diagnostics }, null, 2));
    setShowLiveInspect(true);
  }
  async function feedback(key: "rating" | "fit", value: string) {
    if (!journey || feedbackLock.current) return;
    feedbackLock.current = true; setFeedbackSaving(true);
    try {
      await saveWalkFeedback(journey.id, key, value);
      (key === "rating" ? setRating : setFit)([value]);
      setMessage(t.thanks);
    } catch {
      setMessage(messages.tripSaveFailed);
    } finally { feedbackLock.current = false; setFeedbackSaving(false); }
  }
  const route = journey
    ? measureWalk(named(journey.remaining), journey.position, journey.finish)
    : undefined;
  const startStatus = contentStatus === "error" ? "unresolved"
    : journey ? walkStartStatus(journey, places, contentStatus === "available") : "empty";
  const saveStatus = contentStatus === "error" ? "unresolved"
    : journey ? walkSaveStatus(journey, places, contentStatus === "available") : "empty";
  const savedState = journey && account.userId ? accountWalkState(journey, account.walks, account.userId).status : "unsaved";
  const saveLabel = translate(locale, savedState === "saved" ? "saved.walkSaved" : savedState === "changed" ? "saved.updateWalk" : "saved.saveWalk");
  const saveFeedback = saveStatus !== "ready" ? <StatusMessage>{saveStatus === "empty" ? t.saveEmpty
    : saveStatus === "loading" ? discoveryCopy(locale).loadingWalkContent : t.saveContentUnavailable}</StatusMessage> : null;
  // Do not silently promote a different place if refreshed content loses a stop.
  const current = places.find((place) => place.slug === journey?.remaining[0]);
  const eta =
    (stage === "preview" ? generatedAt : now) + (route?.minutes ?? 0) * 60000;
  const deadline = journey?.settings.deadline;
  const isLiveActive = stage === "active" && activeMode === "live" && premium.active;
  const livePresentation =
    activeMode === "live" &&
    premium.active &&
    journey &&
    liveSession?.journeyId === journey.id
      ? buildLiveWalkPresentation(
          liveSession,
          foregroundPoint ?? liveSession.lastPublished?.point ?? journey.position,
          now,
        )
      : undefined;
  const liveNavigationTarget = journey?.takeBack
    ? journey.finish
    : current?.coordinates ?? journey?.finish;
  const itinerary = (
    items: PublicPlaceCard[],
    interactive = true,
    removeInOverflow = false,
    compact = false,
  ) => (
    <View style={styles.section}>
      <SectionTitle>{t.itinerary}</SectionTitle>
      <V2Itinerary
        places={items}
        citySlug={citySlug}
        interactive={interactive}
        removeInOverflow={removeInOverflow}
        compact={compact}
      />
    </View>
  );
  const summary = (r: WalkRoute<PublicPlaceCard>) => (
    <View style={styles.previewSummary}>
      <AppText variant="label">
        {duration(r.minutes)} · {distance(r.distance)} · {r.places.length} {t.stops}
      </AppText>
      <AppText variant="caption" style={styles.muted}>
        {translate(locale, "walk.estimateShort")}
        {r.finish ? ` · ${t.returnLeg}` : ""}
      </AppText>
    </View>
  );
  const customize = () => {
    if (!journey) return;
    setStage("plan");
    setStep(1);
    setShowMap(false);
    const settings = journey.settings;
    setMinutes(settings.minutes);
    setInterests(settings.interests);
    setCategories(settings.categories ?? []);
    setWalking(settings.walking);
    setGps(settings.start);
    setStartMode("gps");
    setReturnBy(
      settings.deadline
        ? `${new Date(settings.deadline).getHours().toString().padStart(2, "0")}:${new Date(settings.deadline).getMinutes().toString().padStart(2, "0")}`
        : "",
    );
    const endpoint = places.find(
      (p) =>
        p.coordinates.lat === settings.finish?.lat &&
        p.coordinates.lng === settings.finish?.lng,
    );
    setEndMode(
      !settings.finish ? "anywhere" : endpoint ? "destination" : "loop",
    );
    if (endpoint) setEndSlug(endpoint.slug);
  };

  return (
    <Screen
      scrollViewRef={scroll}
      onBack={
        stage === "plan" && step > 1
          ? () => setStep((value) => value - 1)
          : undefined
      }
      navigation={false}
      footer={
        stage === "plan" && !buildError ? (
          <PrimaryButton
            wrapLabel
            label={step < 3 ? t.continue : t.buildAction}
            disabled={step === 3 && !eligible.length}
            leadingIcon={
              <NativeIcon
                ios="location.fill"
                android="near_me"
                color={colors.surface}
              />
            }
            onPress={() =>
              step < 3 ? setStep((value) => value + 1) : void build()
            }
          />
        ) : undefined
      }
    >
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      {stage === "hydrate" ? <CitywalkLoading compact label={discoveryCopy(locale).restoringWalk} /> : null}
      {stage === "building" ? <V2Loading stage={buildStage} onPresented={handleBuildPresented} onReady={() => {
        scroll.current?.scrollTo({ y: 0, animated: false });
        buildLayoutReady.current?.();
        buildLayoutReady.current = undefined;
      }} /> : null}
      {buildError ? (
        <V2WalkError
          empty={buildError === "empty"}
          recoveryLabel={buildError === "empty" ? t.rebuild : undefined}
          retry={() => {
            if (buildError === "empty") { void requestRebuild(); return; }
            setBuildError(undefined);
            setStep(1);
          }}
          close={() =>
            router.replace({
              pathname: "/city/[citySlug]",
              params: { citySlug },
            })
          }
        />
      ) : null}
      {stage === "plan" && !buildError ? (
        <>
          <StepProgress
            step={step}
            label={t.step.replace("{step}", String(step))}
          />
          <V2Hero
            compact
            title={t.build}
            subtitle={
              step === 1
                ? t.timeQuestion
                : step === 2
                  ? translate(locale, "planner.stepTwoTitle")
                  : translate(locale, "planner.stepThreeTitle")
            }
          />
          {step === 1 ? (
            <>
              <WalkChoices
                label=""
                variant="time"
                options={[
                  { value: 60, label: t.hour1, description: t.quickWalk },
                  { value: 120, label: t.hour2, description: t.deeperWalk },
                  { value: 180, label: t.hour3, description: t.moreWalk },
                  { value: 240, label: t.halfDay, description: t.relaxedWalk },
                ]}
                selected={[minutes]}
                onSelect={setMinutes}
              />
              <View style={styles.deadline}>
                <AppText variant="label">{t.deadlineQuestion}</AppText>
                <AppText variant="metadata" style={styles.muted}>{t.deadlineHelp}</AppText>
              </View>
              <WalkInput
                label={t.returnBy}
                value={returnBy}
                onChangeText={setReturnBy}
                placeholder={translate(locale, "planner.timePlaceholder")}
              />
            </>
          ) : step === 2 ? (
            <>
              <WalkChoices
                label={t.interests}
                help={t.interestsHelp}
                multiple
                compact
                options={(Object.keys(interestTags) as Interest[]).map(
                  (value) => ({ value, label: t[value] }),
                )}
                selected={interests}
                onSelect={(key) =>
                  setInterests((v) =>
                    v.includes(key) ? v.filter((k) => k !== key) : [...v, key],
                  )
                }
              />
              {dynamicTags.length ? (
                <>
                  <PressableSurface
                    accessibilityRole="button"
                    accessibilityLabel={translate(locale, showMoreInterests ? "planner.showLess" : "planner.showMore")}
                    style={styles.tertiaryAction}
                    onPress={() => setShowMoreInterests((value) => !value)}
                  >
                    <AppText variant="label" style={styles.tertiaryText}>
                      {translate(locale, "planner.moreInterests")} · {translate(locale, showMoreInterests ? "planner.showLess" : "planner.showMore")}
                    </AppText>
                  </PressableSurface>
                  {showMoreInterests || categories.length ? (
                    <WalkChoices
                      label=""
                      multiple
                      compact
                      options={dynamicTags.map((value) => ({
                        value,
                        label: nativeCategoryLabel(value, locale),
                      }))}
                      selected={categories}
                      onSelect={(key) =>
                        setCategories((v) =>
                          v.includes(key)
                            ? v.filter((k) => k !== key)
                            : [...v, key],
                        )
                      }
                    />
                  ) : null}
                </>
              ) : null}
              <WalkChoices
                label={t.walking}
                variant="segment"
                compact
                options={(["easy", "balanced", "long"] as const).map(
                  (value) => ({
                    value,
                    label: translate(locale, `profile.walking_${value}` as TranslationKey),
                  }),
                )}
                selected={[walking]}
                onSelect={setWalking}
              />
            </>
          ) : (
            <>
              <SectionTitle>{t.start}</SectionTitle>
              <PrimaryButton
                wrapLabel
                label={t.current}
                busy={locating}
                tone={startMode === "gps" ? "primary" : "secondary"}
                onPress={() => void locate()}
              />
              <WalkPlacePicker
                label={t.choosePlace}
                options={options}
                selected={startMode === "place" ? [startSlug] : []}
                onSelect={(slug) => {
                  setStartSlug(slug);
                  setStartMode("place");
                }}
              />
              <WalkChoices
                label={t.end}
                variant="radio"
                options={(["anywhere", "loop", "destination"] as const).map(
                  (value) => ({ value, label: t[value] }),
                )}
                selected={[endMode]}
                onSelect={setEndMode}
              />
              {endMode === "destination" ? (
                <WalkPlacePicker
                  label={t.destination}
                  options={options}
                  selected={[endSlug]}
                  onSelect={setEndSlug}
                />
              ) : null}

            </>
          )}
          {!eligible.length ? <StatusMessage>{t.empty}</StatusMessage> : null}
        </>
      ) : null}
      {journey && route && (stage === "preview" || stage === "active") ? (
        <>
          {stage === "preview" ? (
            <V2Hero compact title={t.preview} subtitle={nativeCityName(citySlug, cityName, locale)} />
          ) : !isLiveActive ? (
            <View style={styles.activeHeading}>
              {current ? (
                <AppText variant="caption" style={styles.eyebrow}>
                  {messages.stopProgress
                    ?.replace("{current}", String(journey.visited.length + 1))
                    .replace(
                      "{total}",
                      String(journey.visited.length + journey.remaining.length),
                    )}
                </AppText>
              ) : null}
              <SectionTitle>
                {current
                  ? nativePlaceName(citySlug, current.slug, current.content.name, locale)
                  : journey.takeBack
                    ? finishNameFor(journey) ?? t.destination
                    : t.remaining}
              </SectionTitle>
              {current ? (
                <AppText numberOfLines={1} style={styles.muted}>
                  {current.content.shortDescription}
                </AppText>
              ) : null}
            </View>
          ) : null}
          {stage === "preview" ? summary(route) : null}
          {stage === "preview" ? <View
            style={[
              styles.returnCard,
              deadline && eta > deadline ? styles.lateCard : undefined,
            ]}
          >
            <NativeIcon
              ios="clock"
              android="schedule"
              color={
                deadline && eta > deadline ? colors.warning : colors.success
              }
              size={20}
            />
            <View style={styles.flex}>
              <AppText variant="label">
                {t.eta.replace("{time}", clock(eta))}
              </AppText>
              {deadline ? (
                <AppText variant="metadata" style={styles.muted}>
                  {t.buffer
                    .replace("{time}", clock(deadline))
                    .replace(
                      "{minutes}",
                      String(Math.floor((deadline - eta) / 60000)),
                    )}
                </AppText>
              ) : null}
            </View>
          </View> : null}
          {stage === "preview" && deadline && eta > deadline ? (
            <StatusMessage>{t.late}</StatusMessage>
          ) : null}
          {stage === "preview" ? (
            <PrimaryButton
              label={t.map}
              tone="secondary"
              onPress={() => setShowMap((v) => !v)}
              leadingIcon={
                <NativeIcon ios="map" android="map" color={colors.primary} />
              }
            />
          ) : null}
          {stage === "active" || showMap ? (
            <NativeCityMap
              citySlug={citySlug}
              places={route.places}
              routeStart={journey.position}
              routeFinish={journey.finish}
              currentSlug={current?.slug}
              compact={stage === "active"}
              liveFocus={isLiveActive}
              followUserLocation={stage === "active" && activeMode === "live" && premium.active}
              onLocation={(point) => {
                if (stage === "active" && activeMode === "live" && premium.active) {
                  setForegroundPoint(point);
                  setJourney((currentJourney) =>
                    currentJourney?.id === journey.id
                      ? { ...currentJourney, position: point }
                      : currentJourney,
                  );
                  void publishForegroundLiveWalkLocation(point);
                }
              }}
            />
          ) : null}
          {stage === "preview" ? (
            <>
              {itinerary(route.places, true, true, true)}
              {startStatus === "loading" ? <CitywalkLoading compact label={discoveryCopy(locale).loadingWalkContent} /> :
                startStatus !== "ready" ? <StatusMessage>{startStatus === "empty" ? t.emptyHelp : t.planContentUnavailable}</StatusMessage> : null}
              <PrimaryButton
                wrapLabel
                label={translate(locale, "liveWalk.turnOn")}
                disabled={startStatus !== "ready"}
                busy={updating}
                leadingIcon={
                  <NativeIcon
                    ios={premium.active ? "location.fill" : "lock.fill"}
                    android={premium.active ? "near_me" : "lock"}
                    color={colors.surface}
                  />
                }
                onPress={() => premium.active ? void start("live") : unlockPremium()}
              />
              <PrimaryButton
                wrapLabel
                label={t.startWalk}
                tone="secondary"
                disabled={startStatus !== "ready"}
                busy={updating}
                leadingIcon={
                  <NativeIcon
                    ios="map"
                    android="map"
                    color={colors.primary}
                  />
                }
                onPress={() => void start("basic")}
              />
              {saveFeedback}
              <View style={styles.actionRow}>
                <PrimaryButton
                  style={styles.flex}
                  label={t.customize}
                  tone="secondary"
                  onPress={customize}
                />
                <PrimaryButton
                  style={styles.flex}
                  label={saveLabel}
                  disabled={saveStatus !== "ready" || account.loading || savedState === "saved"}
                  busy={saving}
                  tone="secondary"
                  onPress={() => void save()}
                />
              </View>
            </>
          ) : (
            <>
              {livePresentation ? (
                <NativeLiveWalkCard presentation={livePresentation} />
              ) : null}
              {activeMode === "basic" ? (
                <PrimaryButton
                  label={translate(locale, "liveWalk.turnOn")}
                  tone="secondary"
                  busy={liveBusy}
                  onPress={() => premium.active ? void toggleLiveWalk() : unlockPremium()}
                  leadingIcon={
                    <NativeIcon
                      ios={premium.active ? "sparkles" : "lock.fill"}
                      android={premium.active ? "auto_awesome" : "lock"}
                      color={colors.primary}
                    />
                  }
                />
              ) : Platform.OS === "ios" && premium.active && !liveSession?.enabled ? (
                <>
                  <AppText variant="metadata" style={styles.muted}>
                    {translate(locale, "liveWalk.permissionHelp")}
                  </AppText>
                  <PrimaryButton
                    label={translate(locale, "liveWalk.turnOn")}
                    busy={liveBusy}
                    onPress={() => void toggleLiveWalk()}
                  />
                </>
              ) : null}
              {!livePresentation ? (
                <PrimaryButton
                  label={translate(locale, "liveWalk.continueWalk")}
                  disabled={!liveNavigationTarget}
                  onPress={() => {
                    if (liveNavigationTarget) void navigate(liveNavigationTarget);
                  }}
                />
              ) : null}

              {!isLiveActive ? (
                <>
                  <AppText variant="label" style={styles.routeLabel}>
                    {t.tripControls}
                  </AppText>
                  {premium.active ? (
                    <View style={styles.controls}>
                      <PrimaryButton
                        compact
                        style={styles.control}
                        wrapLabel
                        tone="secondary"
                        label={t.add}
                        disabled={journey.takeBack === true}
                        onPress={() => {
                          setProposalKind("adaptation");
                          setProposalMessage("");
                          setPanel("add");
                        }}
                        leadingIcon={<NativeIcon ios="plus" android="add" />}
                      />
                      <PrimaryButton
                        compact
                        style={styles.control}
                        wrapLabel
                        tone="secondary"
                        label={t.shorten}
                        disabled={!current || journey.takeBack === true}
                        onPress={shorten}
                        leadingIcon={
                          <NativeIcon
                            ios="arrow.triangle.branch"
                            android="alt_route"
                          />
                        }
                      />
                      <PrimaryButton
                        compact
                        style={styles.control}
                        wrapLabel
                        tone="secondary"
                        label={t.takeBack}
                        onPress={() => setPanel("back")}
                        leadingIcon={
                          <NativeIcon ios="arrow.uturn.backward" android="undo" />
                        }
                      />
                    </View>
                  ) : (
                    <View style={styles.section}>
                      <AppText variant="metadata" style={styles.muted}>
                        Add stops, shorten your route and get back on time with CITYWALK Premium.
                      </AppText>
                      <PrimaryButton
                        compact
                        wrapLabel
                        tone="secondary"
                        label="Unlock smart controls"
                        onPress={unlockPremium}
                        leadingIcon={<NativeIcon ios="sparkles" android="auto_awesome" />}
                      />
                    </View>
                  )}
                </>
              ) : null}

              {premium.active && panel === "back" ? (
                <View style={styles.section}>
                  <PrimaryButton
                    label={t.tripStart}
                    onPress={() => back(journey.settings.start)}
                  />
                  <WalkPlacePicker
                    label={t.destination}
                    options={options}
                    selected={[]}
                    onSelect={(slug) => {
                      const place = places.find((candidate) => candidate.slug === slug);
                      if (place) back(place.coordinates);
                    }}
                  />
                </View>
              ) : null}

              {current ? (
                <View style={styles.currentStopPanel}>
                  {!isLiveActive ? (
                    <View style={styles.currentStopHeader}>
                      <AppText variant="caption" style={styles.eyebrow}>
                        {t.stop
                          .replace("{number}", String(journey.visited.length + 1))
                          .replace(
                            "{total}",
                            String(journey.visited.length + journey.remaining.length),
                          )}
                      </AppText>
                      <AppText variant="label" numberOfLines={1}>
                        {nativePlaceName(citySlug, current.slug, current.content.name, locale)}
                      </AppText>
                    </View>
                  ) : null}
                  <View style={styles.currentActions}>
                    {[
                      {
                        label: t.listen,
                        ios: "headphones",
                        android: "headphones",
                        focus: "audio",
                      },
                      {
                        label: t.read,
                        ios: "book",
                        android: "menu_book",
                        focus: "story",
                      },
                    ].map((action) => (
                      <Link
                        key={action.focus}
                        push
                        href={{
                          pathname: "/city/[citySlug]/place/[placeSlug]",
                          params: {
                            citySlug,
                            placeSlug: current.slug,
                            focus: action.focus,
                          },
                        }}
                        asChild
                      >
                        <PrimaryButton
                          compact
                          style={styles.currentAction}
                          wrapLabel
                          tone="secondary"
                          label={action.label}
                          leadingIcon={
                            <NativeIcon
                              ios={action.ios as "headphones" | "book"}
                              android={
                                action.android as "headphones" | "menu_book"
                              }
                            />
                          }
                        />
                      </Link>
                    ))}
                    <Link
                      push
                      href={{
                        pathname: "/city/[citySlug]/guide/[placeSlug]",
                        params: { citySlug, placeSlug: current.slug },
                      }}
                      asChild
                    >
                      <PrimaryButton
                        compact
                        style={styles.currentAction}
                        wrapLabel
                        tone="secondary"
                        label={t.ask}
                        leadingIcon={
                          <NativeIcon ios="sparkles" android="auto_awesome" />
                        }
                      />
                    </Link>
                  </View>
                  <View style={styles.progressActions}>
                    <PrimaryButton
                      style={styles.flex}
                      label={t.visited}
                      busy={updating}
                      onPress={() =>
                        void update(advanceWalk(journey, current, true))
                      }
                    />
                    <PrimaryButton
                      style={styles.flex}
                      label={t.skip}
                      tone="secondary"
                      onPress={() => {
                        setProposalKind("adaptation");
                        setProposed(
                          measureWalk(
                            route.places.slice(1),
                            journey.position,
                            journey.finish,
                          ),
                        );
                      }}
                    />
                  </View>
                </View>
              ) : null}

              {route.places.length ? (
                isLiveActive ? (
                  <View style={styles.liveItinerary}>
                    <PressableSurface
                      accessibilityRole="button"
                      accessibilityLabel={t.itinerary}
                      accessibilityState={{ expanded: showLiveItinerary }}
                      style={styles.liveItineraryToggle}
                      onPress={() => setShowLiveItinerary((value) => !value)}
                    >
                      <AppText variant="label" style={styles.liveItineraryLabel}>
                        {t.itinerary} · {route.places.length} {t.stops}
                      </AppText>
                      <AppText style={styles.liveItineraryIndicator}>
                        {showLiveItinerary ? "−" : "+"}
                      </AppText>
                    </PressableSurface>
                    {showLiveItinerary ? itinerary(route.places, true, true, true) : null}
                  </View>
                ) : itinerary(route.places, true, true, true)
              ) : null}

              {isLiveActive ? (
                <PressableSurface
                  accessibilityRole="button"
                  accessibilityLabel={t.tripControls}
                  accessibilityState={{ expanded: showManageWalk }}
                  style={styles.liveOverflowButton}
                  onPress={() => setShowManageWalk((value) => !value)}
                >
                  <AppText style={styles.liveOverflowText}>•••</AppText>
                </PressableSurface>
              ) : (
                <PrimaryButton
                  label={translate(locale, "liveWalk.manageWalk")}
                  tone="secondary"
                  onPress={() => setShowManageWalk((value) => !value)}
                />
              )}
              {showManageWalk ? (
                isLiveActive ? (
                  <View style={styles.liveMenu}>
                    <PrimaryButton
                      compact
                      wrapLabel
                      tone="secondary"
                      label={t.add}
                      disabled={journey.takeBack === true}
                      onPress={() => {
                        setShowManageWalk(false);
                        setProposalKind("adaptation");
                        setProposalMessage("");
                        setPanel("add");
                      }}
                      leadingIcon={<NativeIcon ios="plus" android="add" />}
                    />
                    <PrimaryButton
                      compact
                      wrapLabel
                      tone="secondary"
                      label={t.shorten}
                      disabled={!current || journey.takeBack === true}
                      onPress={() => {
                        setShowManageWalk(false);
                        shorten();
                      }}
                      leadingIcon={
                        <NativeIcon
                          ios="arrow.triangle.branch"
                          android="alt_route"
                        />
                      }
                    />
                    <PrimaryButton
                      compact
                      wrapLabel
                      tone="secondary"
                      label={t.takeBack}
                      onPress={() => {
                        setShowManageWalk(false);
                        setPanel("back");
                      }}
                      leadingIcon={
                        <NativeIcon ios="arrow.uturn.backward" android="undo" />
                      }
                    />
                    <PrimaryButton
                      compact
                      wrapLabel
                      tone="secondary"
                      label={t.finish}
                      busy={updating}
                      onPress={() => {
                        const next = {
                          ...journey,
                          finishedAt: Date.now(),
                          historyDistance:
                            journey.historyDistance +
                            (!current && journey.finish
                              ? (calculateDistanceMeters(
                                  journey.position,
                                  journey.finish,
                                ) ?? 0)
                              : 0),
                        };
                        void update(next).then(async (ok) => {
                          if (!ok) return;
                          await completeCitywalkLiveWalk();
                          setLiveSession(undefined);
                          setActiveMode("basic");
                          setShowManageWalk(false);
                          setStage("finished");
                        });
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.section}>
                    {saveFeedback}
                    <PrimaryButton
                      label={saveLabel}
                      disabled={
                        saveStatus !== "ready" ||
                        account.loading ||
                        savedState === "saved"
                      }
                      busy={saving}
                      tone="secondary"
                      onPress={() => void save()}
                    />
                    <PrimaryButton
                      label={t.rebuild}
                      tone="secondary"
                      busy={updating}
                      onPress={() => void requestRebuild()}
                    />
                    {premium.active && activeMode === "live" && liveSession?.enabled ? (
                      <PrimaryButton
                        label={translate(locale, "liveWalk.turnOff")}
                        tone="secondary"
                        busy={liveBusy}
                        onPress={() => void toggleLiveWalk()}
                      />
                    ) : null}
                  </View>
                )
              ) : null}

              {!isLiveActive ? (
                <PrimaryButton
                  label={t.finish}
                  busy={updating}
                  onPress={() => {
                    const next = {
                      ...journey,
                      finishedAt: Date.now(),
                      historyDistance:
                        journey.historyDistance +
                        (!current && journey.finish
                          ? (calculateDistanceMeters(
                              journey.position,
                              journey.finish,
                            ) ?? 0)
                          : 0),
                    };
                    void update(next).then(async (ok) => {
                      if (!ok) return;
                      await completeCitywalkLiveWalk();
                      setLiveSession(undefined);
                      setActiveMode("basic");
                      setStage("finished");
                    });
                  }}
                />
              ) : null}

              {(typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production") && activeMode === "live" ? (
                <>
                  <PrimaryButton
                    label={translate(locale, "liveWalk.inspect")}
                    tone="secondary"
                    onPress={() => void inspectLiveWalk()}
                  />
                  {showLiveInspect && liveInspect ? (
                    <AppText selectable variant="caption" style={styles.diagnostic}>
                      {liveInspect}
                    </AppText>
                  ) : null}
                </>
              ) : null}
            </>
          )}
          {stage === "preview" ? (
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel={t.rebuild}
              style={styles.tertiaryAction}
              disabled={updating}
              onPress={() => void requestRebuild()}
            >
              <AppText variant="label" style={styles.tertiaryText}>{t.rebuild}</AppText>
            </PressableSurface>
          ) : null}
        </>
      ) : null}
      {journey && stage === "finished" ? (
        <>
          <View style={styles.finishCheck}>
            <NativeIcon
              ios="checkmark"
              android="check"
              color={colors.success}
              size={38}
            />
          </View>
          <SectionTitle>{t.finished.replace("{city}", nativeCityName(citySlug, cityName, locale))}</SectionTitle>
          <MetricSummary
            items={[
              { label: t.placesVisited, value: String(journey.visited.length) },
              { label: t.distance, value: distance(journey.historyDistance) },
              {
                label: t.timeExplored,
                value: duration(
                  ((journey.finishedAt ?? now) - journey.startedAt) / 60000,
                ),
              },
            ]}
          />
          <SectionTitle>{t.highlights}</SectionTitle>
          {journey.visited.length ? (
            itinerary(named(journey.visited))
          ) : (
            <AppText>{t.noVisited}</AppText>
          )}
          {saveFeedback}
          <PrimaryButton wrapLabel label={saveLabel} disabled={saveStatus !== "ready" || account.loading || savedState === "saved"}
                  busy={saving} onPress={() => void save()} />
          <PrimaryButton
            wrapLabel
            label={t.share}
            onPress={() => {
              void Share.share({
                message: `${t.finished.replace("{city}", nativeCityName(citySlug, cityName, locale))}\n${named(
                  journey.visited,
                )
                  .map((p) => nativePlaceName(citySlug, p.slug, p.content.name, locale))
                  .join(" · ")}`,
              }).catch(() => setMessage(t.shareFailed));
            }}
          />
          <PublicStoreReview journey={journey} onSettled={reviewDidSettle} />
          {reviewSettled === journey.id && showPrivateFeedback !== journey.id ? <PrimaryButton wrapLabel tone="secondary"
            label={translate(locale, "complete.feedback")} onPress={() => setShowPrivateFeedback(journey.id)} /> : null}
          {showPrivateFeedback === journey.id ? <>
          <WalkChoices
            label={translate(locale, "complete.ratingQuestion")}
            options={[1, 2, 3, 4, 5].map((value) => ({
              value: String(value),
              label: `${value} ★`,
            }))}
            selected={rating}
            onSelect={(value) => void feedback("rating", value)}
          />
          <WalkChoices
            label={t.fit}
            options={[
              { value: "yes", label: t.yes },
              { value: "no", label: t.no },
            ]}
            selected={fit}
            onSelect={(value) => void feedback("fit", value)}
          />
          {feedbackSaving ? <PrimaryButton label={uxCopy(locale).saving} busy disabled /> : null}
          </> : null}
          <PrimaryButton
            wrapLabel
            tone="secondary"
            label={t.backCity}
            onPress={() =>
              router.replace({
                pathname: "/city/[citySlug]",
                params: { citySlug },
              })
            }
          />
        </>
      ) : null}
      <SaveAccountGate visible={saveGate} onClose={() => setSaveGate(false)} />
      <Modal visible={!!rebuildConfirmation} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => { if (!updateLock.current) setRebuildConfirmation(undefined); }}>
        <Screen includeTopSafeArea navigation={false} brand={false}>
          <SectionTitle>{t.rebuild}</SectionTitle>
          <AppText>{t.rebuildHelp}</AppText>
          {message ? <StatusMessage>{message}</StatusMessage> : null}
          <PrimaryButton label={t.confirm} busy={updating} onPress={() => void rebuild()} />
          <PrimaryButton label={translate(locale, "common.cancel")} tone="secondary" disabled={updating}
            onPress={() => setRebuildConfirmation(undefined)} />
        </Screen>
      </Modal>
      <Modal
        visible={(premium.active && panel === "add") || !!proposed}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPanel(undefined);
          setProposed(undefined);
          setProposalKind("adaptation");
          setProposalMessage("");
        }}
      >
        <Screen includeTopSafeArea navigation={false} brand={false}
          footer={panel === "add" ? <>
            {proposalMessage ? <StatusMessage>{proposalMessage}</StatusMessage> : null}
            <PrimaryButton tone="secondary" label={translate(locale, "common.close")}
              onPress={() => { setPanel(undefined); setProposalMessage(""); }} />
          </> : undefined}>
          {panel === "add" && journey ? <>
            <WalkChoices label={t.add} variant="radio"
              options={options.filter(p => ![...journey.visited, ...journey.remaining].includes(p.value))}
              selected={[]} onSelect={add} />
            {!options.some(p => ![...journey.visited, ...journey.remaining].includes(p.value)) ?
              <StatusMessage>{t.noEligible}</StatusMessage> : null}
          </> : <>
          <SectionTitle>{t.confirm}</SectionTitle>
          <AppText>{t.changeHelp}</AppText>
          {proposed ? (
            <>
              {summary(proposed)}
              {itinerary(proposed.places, false)}
              <AppText>
                {t.eta.replace("{time}", clock(now + proposed.minutes * 60000))}
              </AppText>
            </>
          ) : null}
          {proposalMessage ? (
            <StatusMessage>{proposalMessage}</StatusMessage>
          ) : null}
          <PrimaryButton
            wrapLabel
            label={t.confirm}
            busy={updating}
            onPress={() => {
              if (!journey || !proposed) return;
              const etaAtConfirm = Date.now() + proposed.minutes * 60000;
              // A deadline may pass while the review sheet is open; show the warning, never hide it.
              if (
                journey.settings.deadline &&
                etaAtConfirm > journey.settings.deadline &&
                !proposalMessage
              ) {
                setProposalMessage(t.late);
                return;
              }
              const next: WalkJourney = {
                ...journey,
                remaining: proposed.places.map((p) => p.slug),
                finish: proposed.finish,
                takeBack: proposalKind === "take_back",
              };
              void update(
                next,
                stage === "preview" ? "preview" : "active",
                stage === "active",
              ).then((ok) => {
                if (ok) {
                  setProposed(undefined);
                  setProposalKind("adaptation");
                  setProposalMessage("");
                } else {
                  setProposalMessage(messages.tripSaveFailed);
                }
              });
            }}
          />
          <PrimaryButton
            wrapLabel
            tone="secondary"
            label={t.keep}
            onPress={() => {
              setProposed(undefined);
              setProposalKind("adaptation");
              setProposalMessage("");
            }}
          />
          </>}
        </Screen>
      </Modal>
    </Screen>
  );
}