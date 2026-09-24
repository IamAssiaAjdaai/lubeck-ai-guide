import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Share,
  View,
} from "react-native";
import {
  buildWalk,
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
import { WalkChoices, WalkInput } from "./WalkControls";

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
  const [step, setStep] = useState(1),
    [minutes, setMinutes] = useState(120),
    [returnBy, setReturnBy] = useState("");
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
              const candidate = places.find(place => place.slug === addSlug);
              const proposal = candidate ? proposeAddedStop(
                restored.remaining.flatMap(slug => places.find(place => place.slug === slug) ?? []),
                candidate, restored.visited, restored.settings, restored.position,
                restored.finish, restored.startedAt,
              ) : undefined;
              if (proposal) setProposed(proposal);
              else { setPanel("add"); setMessage(t.noEligible); }
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
        if (stage === "plan" && step === 2) {
          setStep(1);
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
    setStage("building");
    // Yield to native rendering; no invented stage completion or percentage.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
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
      const route = buildWalk(places, settings);
      if (!route.places.length) {
        setMessage(`${t.empty} ${t.emptyHelp}`);
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
      setMessage(t.errorHelp);
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
  const current = route?.places[0];
  const eta =
    (stage === "preview" ? generatedAt : now) + (route?.minutes ?? 0) * 60000;
  const deadline = journey?.settings.deadline;
  const itinerary = (items: PublicPlaceCard[], interactive = true) => (
    <View style={{ gap: 12 }}>
      <SectionTitle>{t.itinerary}</SectionTitle>
      {items.map((p, i) => !interactive ? <AppText key={p.slug}>{i + 1}. {p.content.name} · {duration(p.durationMinutes)}</AppText> : (
        <Link
          key={p.slug}
          href={{
            pathname: "/city/[citySlug]/place/[placeSlug]",
            params: { citySlug, placeSlug: p.slug },
          }}
          asChild
        >
          <PrimaryButton
            wrapLabel
            tone="secondary"
            label={`${i + 1}. ${p.content.name} · ${duration(p.durationMinutes)}`}
          />
        </Link>
      ))}
    </View>
  );
  const summary = (r: WalkRoute<PublicPlaceCard>) => (
    <View style={{ gap: 8 }}>
      <AppText>
        {duration(r.minutes)} · {distance(r.distance)} · {r.places.length}{" "}
        {t.stops}
      </AppText>
      <AppText variant="caption">{t.estimated}</AppText>
      {r.finish ? <AppText variant="caption">{t.returnLeg}</AppText> : null}
    </View>
  );

  return (
    <Screen>
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      {stage === "hydrate" || stage === "building" ? (
        <View accessibilityRole="progressbar" accessibilityLabel={t.loading}>
          <ActivityIndicator />
          <AppText variant="heading">{t.loading}</AppText>
          {stage === "building" ? (
            <AppText>
              {[t.matching, t.checking, t.fitting, t.choosing].join("\n")}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {stage === "plan" ? (
        <>
          <SectionTitle>{t.build}</SectionTitle>
          <AppText>{t.step.replace("{step}", String(step))}</AppText>
          {step === 1 ? (
            <>
              <WalkChoices
                label={t.timeQuestion}
                options={[
                  { value: 60, label: t.hour1 },
                  { value: 120, label: t.hour2 },
                  { value: 180, label: t.hour3 },
                  { value: 240, label: t.halfDay },
                ]}
                selected={[minutes]}
                onSelect={setMinutes}
              />
              <AppText>{t.deadlineHelp}</AppText>
              <WalkInput
                label={t.returnBy}
                value={returnBy}
                onChangeText={setReturnBy}
                placeholder="HH:MM"
              />
              <PrimaryButton
                wrapLabel
                label={t.continue}
                onPress={() => setStep(2)}
              />
            </>
          ) : (
            <>
              <WalkChoices
                label={t.interests}
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
                options={(["easy", "balanced", "long"] as const).map(
                  (value) => ({ value, label: t[value] }),
                )}
                selected={[walking]}
                onSelect={setWalking}
              />
              <SectionTitle>{t.start}</SectionTitle>
              <PrimaryButton
                wrapLabel
                label={t.current}
                busy={locating}
                tone={startMode === "gps" ? "primary" : "secondary"}
                onPress={() => void locate()}
              />
              <WalkChoices
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
                options={(["anywhere", "loop", "destination"] as const).map(
                  (value) => ({ value, label: t[value] }),
                )}
                selected={[endMode]}
                onSelect={setEndMode}
              />
              {endMode === "destination" ? (
                <WalkChoices
                  label={t.destination}
                  options={options}
                  selected={[endSlug]}
                  onSelect={setEndSlug}
                />
              ) : null}
              <PrimaryButton
                wrapLabel
                label={t.buildAction}
                disabled={!eligible.length}
                onPress={() => void build()}
              />
              <PrimaryButton
                wrapLabel
                tone="secondary"
                label={t.back}
                onPress={() => setStep(1)}
              />
            </>
          )}
          {!eligible.length ? <StatusMessage>{t.empty}</StatusMessage> : null}
        </>
      ) : null}
      {journey && route && (stage === "preview" || stage === "active") ? (
        <>
          <SectionTitle>
            {stage === "preview"
              ? t.preview
              : (current?.content.name ?? t.remaining)}
          </SectionTitle>
          <AppText>{cityName}</AppText>
          {summary(route)}
          <AppText>{t.eta.replace("{time}", clock(eta))}</AppText>
          {deadline ? (
            <AppText>
              {t.buffer
                .replace("{time}", clock(deadline))
                .replace(
                  "{minutes}",
                  String(Math.floor((deadline - eta) / 60000)),
                )}
            </AppText>
          ) : null}
          {deadline && eta > deadline ? (
            <StatusMessage>{t.late}</StatusMessage>
          ) : null}
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
          {stage === "preview" ? (
            <>
              {itinerary(route.places)}
              <PrimaryButton
                wrapLabel
                label={t.startWalk}
                onPress={() => {
                  void update({ ...journey, startedAt: Date.now() });
                  setStage("active");
                }}
              />
              <PrimaryButton
                wrapLabel
                label={t.customize}
                tone="secondary"
                onPress={() => {
                  setStage("plan");
                  setStep(1);
                  const s = journey.settings;
                  setMinutes(s.minutes);
                  setInterests(s.interests);
                  setCategories(s.categories ?? []);
                  setWalking(s.walking);
                  setGps(s.start);
                  setStartMode("gps");
                  setReturnBy(
                    s.deadline
                      ? `${new Date(s.deadline).getHours().toString().padStart(2, "0")}:${new Date(s.deadline).getMinutes().toString().padStart(2, "0")}`
                      : "",
                  );
                  const endpoint = places.find(
                    (p) =>
                      p.coordinates.lat === s.finish?.lat &&
                      p.coordinates.lng === s.finish?.lng,
                  );
                  setEndMode(
                    !s.finish ? "anywhere" : endpoint ? "destination" : "loop",
                  );
                  if (endpoint) setEndSlug(endpoint.slug);
                }}
              />
            </>
          ) : (
            <>
              {current ? (
                <>
                  <AppText>
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
                    wrapLabel
                    label={t.navigate}
                    onPress={() => void navigate(current.coordinates)}
                  />
                  <Link
                    href={{
                      pathname: "/city/[citySlug]/place/[placeSlug]",
                      params: { citySlug, placeSlug: current.slug },
                    }}
                    asChild
                  >
                    <PrimaryButton
                      wrapLabel
                      tone="secondary"
                      label={`${t.listen} · ${t.read}`}
                    />
                  </Link>
                  <Link
                    href={{
                      pathname: "/city/[citySlug]/guide/[placeSlug]",
                      params: { citySlug, placeSlug: current.slug },
                    }}
                    asChild
                  >
                    <PrimaryButton wrapLabel tone="ai" label={t.ask} />
                  </Link>
                  <PrimaryButton
                    wrapLabel
                    label={t.visited}
                    onPress={() =>
                      void update(advanceWalk(journey, current, true))
                    }
                  />
                  <PrimaryButton
                    wrapLabel
                    tone="secondary"
                    label={t.skip}
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
                </>
              ) : journey.finish ? (
                <PrimaryButton
                  wrapLabel
                  label={t.navigate}
                  onPress={() => void navigate(journey.finish!)}
                />
              ) : null}
              <SectionTitle>{t.tripControls}</SectionTitle>
              <PrimaryButton
                wrapLabel
                tone="secondary"
                label={`${t.tired} · ${t.shorten}`}
                onPress={shorten}
              />
              <PrimaryButton
                wrapLabel
                tone="secondary"
                label={t.runningLate}
                onPress={shorten}
              />
              <PrimaryButton
                wrapLabel
                tone="secondary"
                label={t.add}
                onPress={() => setPanel("add")}
              />
              <PrimaryButton
                wrapLabel
                tone="secondary"
                label={t.takeBack}
                onPress={() => setPanel("back")}
              />
              {panel === "add" ? (
                <WalkChoices
                  label={t.add}
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
                    wrapLabel
                    label={t.tripStart}
                    onPress={() => back(journey.settings.start)}
                  />
                  <WalkChoices
                    label={t.destination}
                    options={options}
                    selected={[]}
                    onSelect={(slug) =>
                      back(places.find((p) => p.slug === slug)!.coordinates)
                    }
                  />
                </>
              ) : null}
              {itinerary(route.places)}
              <PrimaryButton
                wrapLabel
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
            </>
          )}
          <PrimaryButton
            wrapLabel
            label={t.save}
            tone="secondary"
            onPress={() => void save()}
          />
        </>
      ) : null}
      {journey && stage === "finished" ? (
        <>
          <SectionTitle>{t.finished.replace("{city}", cityName)}</SectionTitle>
          <AppText>
            {journey.visited.length} {t.placesVisited} ·{" "}
            {distance(journey.historyDistance)} ·{" "}
            {duration(
              ((journey.finishedAt ?? now) - journey.startedAt) / 60000,
            )}
          </AppText>
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
        <Screen includeTopSafeArea>
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
