import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  BackHandler,
  Linking,
  Modal,
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
  estimateWalkingMinutes,
  isEligibleTourPlace,
} from "@citywalk/traveler-core";
import { walkCopy, walkCategoryLabel } from "@citywalk/traveler-core/walkCopy";
import type { PublicPlaceCard } from "../lib/api/contracts";
import {
  loadActiveWalk,
  loadSavedWalks,
  persistActiveWalk,
  saveNativeWalk,
  saveWalkFeedback,
} from "../lib/walkStorage";
import { loadLocalTrips } from "../lib/tripStorage";
import { createMobileTripId } from "../lib/tripNavigation";
import { requestForegroundLocation } from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeCityMap } from "./NativeCityMap";
import {
  AppText,
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

export function NativeWalkFlow({
  citySlug,
  cityName,
  places,
  savedId,
  addSlug,
}: {
  citySlug: string;
  cityName: string;
  places: readonly PublicPlaceCard[];
  savedId?: string;
  addSlug?: string;
}) {
  const { locale, messages } = useNativeLocale(),
    t = walkCopy(locale),
    router = useRouter();
  const [stage, setStage] = useState<
    "hydrate" | "plan" | "building" | "preview" | "active" | "finished"
  >("hydrate");
  const scroll = useRef<ScrollView>(null);
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
  const [journey, setJourney] = useState<WalkJourney>(),
    [proposed, setProposed] = useState<WalkRoute<PublicPlaceCard>>();
  const [panel, setPanel] = useState<"add" | "back">(),
    [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now()),
    [generatedAt, setGeneratedAt] = useState(() => Date.now());
  const [showMap, setShowMap] = useState(false);
  const [buildError, setBuildError] = useState<"empty" | "error">();
  const [buildStage, setBuildStage] = useState<WalkBuildStage>("matching");
  const [rating, setRating] = useState<string[]>([]),
    [fit, setFit] = useState<string[]>([]);
  const [proposalMessage, setProposalMessage] = useState("");
  const eligible = places.filter(isEligibleTourPlace);
  const named = (slugs: string[]) =>
    slugs.flatMap((slug) => places.find((p) => p.slug === slug) ?? []);
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
    label: p.content.name,
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
      if (savedId) {
        restored = (await loadSavedWalks()).find(
          (w) => w.id === savedId && w.citySlug === citySlug,
        );
        if (!restored) {
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
        if (restored)
          restored = {
            ...restored,
            id: createMobileTripId("walk"),
            remaining: [
              ...new Set([...restored.visited, ...restored.remaining]),
            ],
            visited: [],
            position: restored.settings.start,
            historyDistance: 0,
            startedAt: Date.now(),
            finishedAt: undefined,
            settings: { ...restored.settings, deadline: undefined },
          };
      } else restored = await loadActiveWalk(citySlug);
      if (!alive) return;
      if (restored) {
        const allKnown = [...restored.remaining, ...restored.visited].every(
          (slug) => places.some((p) => p.slug === slug),
        );
        const allEligible = restored.remaining.every((slug) =>
          eligible.some((p) => p.slug === slug),
        );
        if (allKnown && allEligible) {
          setJourney(restored);
          setStage(savedId ? "preview" : "active");
          if (addSlug) {
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
              setMessage(t.noEligible);
            }
          }
          return;
        }
        setMessage(t.noEligible);
      }
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
  }, [citySlug, savedId]);
  useEffect(() => {
    if (stage !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
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
  }, [proposed, panel, stage, step]);
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
    setStage("building");
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
        result = steps.next();
      }
      const route = result.value;
      if (!route.places.length) {
        setBuildError("empty");
        setStage("plan");
        return;
      }
      const time = Date.now();
      setGeneratedAt(time);
      setNow(time);
      setJourney({
        id: createMobileTripId("walk"),
        citySlug,
        settings,
        remaining: route.places.map((p) => p.slug),
        visited: [],
        position: start,
        finish,
        historyDistance: 0,
        startedAt: time,
      });
      setStage("preview");
    } catch {
      setBuildError("error");
      setStage("plan");
    }
  }
  async function update(next: WalkJourney) {
    setJourney(next);
    setNow(Date.now());
    try {
      await persistActiveWalk(next);
    } catch {
      setMessage(messages.tripSaveFailed);
    }
  }
  async function save() {
    if (!journey) return;
    try {
      await saveNativeWalk(journey);
      setMessage(t.savedDone);
    } catch {
      setMessage(messages.tripSaveFailed);
    }
  }
  function shorten() {
    if (!journey) return;
    try {
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
      setProposed(next);
      setPanel(undefined);
      setProposalMessage("");
    } else setMessage(t.noEligible);
  }
  function back(point: Point) {
    if (journey) {
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
  async function feedback(key: "rating" | "fit", value: string) {
    if (!journey) return;
    try {
      await saveWalkFeedback(journey.id, key, value);
      (key === "rating" ? setRating : setFit)([value]);
      setMessage(t.thanks);
    } catch {
      setMessage(messages.tripSaveFailed);
    }
  }
  const route = journey
    ? measureWalk(named(journey.remaining), journey.position, journey.finish)
    : undefined;
  // Do not silently promote a different place if refreshed content loses a stop.
  const current = places.find((place) => place.slug === journey?.remaining[0]);
  const eta =
    (stage === "preview" ? generatedAt : now) + (route?.minutes ?? 0) * 60000;
  const deadline = journey?.settings.deadline;
  const itinerary = (items: PublicPlaceCard[], interactive = true) => (
    <View style={styles.section}>
      <SectionTitle>{t.itinerary}</SectionTitle>
      <V2Itinerary
        places={items}
        citySlug={citySlug}
        interactive={interactive}
      />
    </View>
  );
  const summary = (r: WalkRoute<PublicPlaceCard>) => (
    <View>
      <MetricSummary
        items={[
          {
            label: t.duration,
            value: duration(r.minutes),
            icon: <NativeIcon ios="clock" android="schedule" size={20} />,
          },
          {
            label: t.distance,
            value: distance(r.distance),
            icon: <NativeIcon ios="mappin" android="place" size={20} />,
          },
          {
            label: t.stops,
            value: String(r.places.length),
            icon: (
              <NativeIcon
                ios="point.topleft.down.to.point.bottomright.curvepath"
                android="route"
                size={20}
              />
            ),
          },
        ]}
      />
      <AppText variant="caption" style={styles.muted}>
        {t.estimated}
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
      navigation={stage !== "plan" && stage !== "building"}
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
      {stage === "hydrate" ? <AppText accessibilityLiveRegion="polite">{messages.loading}</AppText> : null}
      {stage === "building" ? <V2Loading stage={buildStage} /> : null}
      {buildError ? (
        <V2WalkError
          empty={buildError === "empty"}
          retry={() => {
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
            subtitle={step === 1 ? t.timeQuestion : undefined}
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
                <SectionTitle>{t.deadlineQuestion}</SectionTitle>
                <AppText style={styles.muted}>{t.deadlineHelp}</AppText>
              </View>
              <WalkInput
                label={t.returnBy}
                value={returnBy}
                onChangeText={setReturnBy}
                placeholder="HH:MM"
              />
            </>
          ) : step === 2 ? (
            <>
              <WalkChoices
                label={t.interests}
                help={t.interestsHelp}
                number={1}
                multiple
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
                <WalkChoices
                  label={t.categories}
                  multiple
                  options={dynamicTags.map((value) => ({
                    value,
                    label: walkCategoryLabel(value, locale),
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
              <WalkChoices
                label={t.walking}
                variant="segment"
                number={2}
                options={(["easy", "balanced", "long"] as const).map(
                  (value) => ({ value, label: t[value] }),
                )}
                selected={[walking]}
                onSelect={setWalking}
              />
              <PrimaryButton
                label={t.back}
                tone="secondary"
                onPress={() => setStep(1)}
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
                number={4}
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

              <PrimaryButton
                wrapLabel
                tone="secondary"
                label={t.back}
                onPress={() => setStep(2)}
              />
            </>
          )}
          {!eligible.length ? <StatusMessage>{t.empty}</StatusMessage> : null}
        </>
      ) : null}
      {journey && route && (stage === "preview" || stage === "active") ? (
        <>
          {stage === "preview" ? (
            <V2Hero compact title={t.preview} subtitle={cityName} />
          ) : (
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
                {current?.content.name ?? t.remaining}
              </SectionTitle>
              {current ? (
                <AppText numberOfLines={1} style={styles.muted}>
                  {current.content.shortDescription}
                </AppText>
              ) : null}
            </View>
          )}
          {stage === "preview" ? summary(route) : null}
          <View
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
              size={28}
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
          </View>
          {deadline && eta > deadline ? (
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
              places={route.places}
              routeStart={journey.position}
              routeFinish={journey.finish}
              currentSlug={current?.slug}
              onLocation={(point) => {
                if (stage === "active")
                  void update({ ...journey, position: point });
              }}
            />
          ) : null}
          {stage === "preview" ? (
            <>
              {itinerary(route.places)}
              <PrimaryButton
                wrapLabel
                label={t.startWalk}
                leadingIcon={
                  <NativeIcon
                    ios="location.fill"
                    android="near_me"
                    color={colors.surface}
                  />
                }
                onPress={() => {
                  void update({ ...journey, startedAt: Date.now() });
                  setStage("active");
                }}
              />
              <View style={styles.actionRow}>
                <PrimaryButton
                  style={styles.flex}
                  label={t.customize}
                  tone="secondary"
                  onPress={customize}
                />
                <PrimaryButton
                  style={styles.flex}
                  label={t.save}
                  tone="secondary"
                  onPress={() => void save()}
                />
              </View>
            </>
          ) : (
            <>
              {current ? (
                <>
                  <View style={styles.navigationBar}>
                    <AppText style={styles.flex}>
                      {duration(
                        estimateWalkingMinutes(
                          calculateDistanceMeters(
                            journey.position,
                            current.coordinates,
                          ) ?? 0,
                        ) ?? 0,
                      )}{" "}
                      ·{" "}
                      {distance(
                        calculateDistanceMeters(
                          journey.position,
                          current.coordinates,
                        ) ?? 0,
                      )}
                    </AppText>
                    <PrimaryButton
                      style={styles.flex}
                      label={t.navigate}
                      onPress={() => void navigate(current.coordinates)}
                    />
                  </View>
                  <View style={styles.actionRow}>
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
                          style={styles.flex}
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
                        style={styles.flex}
                        wrapLabel
                        tone="secondary"
                        label={t.ask}
                        leadingIcon={
                          <NativeIcon ios="sparkles" android="auto_awesome" />
                        }
                      />
                    </Link>
                  </View>
                </>
              ) : journey.finish ? (
                <PrimaryButton
                  label={t.navigate}
                  onPress={() => void navigate(journey.finish!)}
                />
              ) : null}
              <SectionTitle>{t.tripControls}</SectionTitle>
              <View style={styles.controls}>
                {current ? (
                  <PrimaryButton
                    compact
                    style={styles.control}
                    wrapLabel
                    tone="secondary"
                    label={t.skip}
                    leadingIcon={
                      <NativeIcon ios="forward.end" android="skip_next" />
                    }
                    onPress={() =>
                      setProposed(
                        measureWalk(
                          route.places.slice(1),
                          journey.position,
                          journey.finish,
                        ),
                      )
                    }
                  />
                ) : null}
                <PrimaryButton
                  compact
                  style={styles.control}
                  wrapLabel
                  tone="secondary"
                  label={t.shorten}
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
                  label={t.add}
                  onPress={() => setPanel("add")}
                  leadingIcon={<NativeIcon ios="plus" android="add" />}
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
              <View style={styles.assistant}>
                <View style={styles.handle} />
                <AppText variant="caption" style={styles.eyebrow}>
                  CITYWALK · {t.ask}
                </AppText>
                <View style={styles.actionRow}>
                  <PrimaryButton
                    style={styles.flex}
                    wrapLabel
                    tone="secondary"
                    label={`${t.tired} · ${t.shorten}`}
                    onPress={shorten}
                  />
                  <PrimaryButton
                    style={styles.flex}
                    wrapLabel
                    tone="secondary"
                    label={t.runningLate}
                    onPress={shorten}
                  />
                </View>
              </View>
              {panel === "add" ? (
                <WalkChoices
                  label={t.add}
                  variant="radio"
                  options={options.filter(
                    (p) =>
                      ![...journey.visited, ...journey.remaining].includes(
                        p.value,
                      ),
                  )}
                  selected={[]}
                  onSelect={add}
                />
              ) : null}
              {panel === "back" ? (
                <>
                  <PrimaryButton
                    label={t.tripStart}
                    onPress={() => back(journey.settings.start)}
                  />
                  <WalkPlacePicker
                    label={t.destination}
                    options={options}
                    selected={[]}
                    onSelect={(slug) =>
                      back(places.find((p) => p.slug === slug)!.coordinates)
                    }
                  />
                </>
              ) : null}
              {current ? (
                <PrimaryButton
                  label={t.visited}
                  onPress={() =>
                    void update(advanceWalk(journey, current, true))
                  }
                />
              ) : null}
              {itinerary(route.places)}
              <PrimaryButton
                label={t.finish}
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
                  void update(next);
                  setStage("finished");
                }}
              />
              <PrimaryButton
                label={t.save}
                tone="secondary"
                onPress={() => void save()}
              />
            </>
          )}
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
          <SectionTitle>{t.finished.replace("{city}", cityName)}</SectionTitle>
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
          <PrimaryButton wrapLabel label={t.save} onPress={() => void save()} />
          <PrimaryButton
            wrapLabel
            label={t.share}
            onPress={() => {
              void Share.share({
                message: `${t.finished.replace("{city}", cityName)}\n${named(
                  journey.visited,
                )
                  .map((p) => p.content.name)
                  .join(" · ")}`,
              }).catch(() => setMessage(t.shareFailed));
            }}
          />
          <WalkChoices
            label={t.rate}
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
      <Modal
        visible={!!proposed}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProposed(undefined)}
      >
        <Screen includeTopSafeArea navigation={false} brand={false}>
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
              void update({
                ...journey,
                remaining: proposed.places.map((p) => p.slug),
                finish: proposed.finish,
              });
              setProposed(undefined);
              setProposalMessage("");
            }}
          />
          <PrimaryButton
            wrapLabel
            tone="secondary"
            label={t.keep}
            onPress={() => {
              setProposed(undefined);
              setProposalMessage("");
            }}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}
