# Read-only source excerpts — 28 October 2026

## ROUTE

`mobile/src/app/city/[citySlug]/walk.tsx:13`

```text
12: import { discoveryCopy } from "../../../design/discoveryCopy";
13: export default function WalkScreen() {
14:   const params = useLocalSearchParams<{
15:     citySlug: string;
16:     saved?: string;
17:     source?: string;
18:     add?: string;
19:   }>();
20:   const identity = parseCityRouteIdentity(params.citySlug);
21:   const { locale } = useNativeLocale();
22:   const state = usePublicCity(identity?.citySlug ?? "invalid", locale);
23:   const [previous, setPrevious] = useState<{ citySlug: string; locale: string; data: PublicCitySummaryResponse }>();
24:   if (identity && state.status === "available" &&
```

## MOUNT

`mobile/src/app/city/[citySlug]/walk.tsx:47`

```text
46:       <NativeWalkFlow
47:         key={`${identity.citySlug}:${params.saved ?? "active"}:${params.add ?? ""}`}
48:         interestOnboarding
49:         citySlug={identity.citySlug}
50:         cityName={data.city.content.name}
51:         cityMedia={data.city.media}
52:         places={data.places}
53:         contentStatus={state.status}
54:         savedId={params.saved}
55:         accountSaved={params.source === "account"}
56:         addSlug={params.add}
57:       />
58:     </>
```

## STATE

`mobile/src/components/NativeWalkFlow.tsx:203`

```text
202:   }, []);
203:   const [interestEntryComplete, setInterestEntryComplete] = useState(false);
204:   const [locationEntryComplete, setLocationEntryComplete] = useState(false);
205:   const [firstExperienceComplete, setFirstExperienceComplete] = useState(false);
206:   const locationEntryAttempt = useRef(0);
207:   const [step, setStep] = useState(1),
208:     [minutes, setMinutes] = useState(120),
209:     [returnBy, setReturnBy] = useState("");
210:   useEffect(() => {
211:     scroll.current?.scrollTo({ y: 0, animated: false });
212:   }, [stage, step]);
213:   const [interests, setInterests] = useState<Interest[]>([
214:       "history",
```

## HYDRATE

`mobile/src/components/NativeWalkFlow.tsx:358`

```text
357:     void (async () => {
358:       let restored: WalkJourney | undefined;
359:       let restoredPhase: "preview" | "active" = "active";
360:       if (savedId) {
361:         restored = accountSaved ? await loadAccountWalkForOpen(savedId, citySlug) : (await loadSavedWalks()).find(
362:           (w) => w.id === savedId && w.citySlug === citySlug,
363:         );
364:         if (!restored && !accountSaved) {
365:           const legacy = (await loadLocalTrips()).find(
366:             (w) => w.id === savedId && w.citySlug === citySlug,
367:           );
368:           const start = places.find(
369:             (p) => p.slug === legacy?.stopSlugs[0],
```

## SUBSCRIBE

`mobile/src/components/NativeWalkFlow.tsx:458`

```text
457:     if (stage !== "preview" && stage !== "active") return;
458:     return subscribeCurrentWalk(citySlug, current => {
459:       setMessage(previous => previous === savedMessage ? "" : previous);
460:       setJourney(current?.journey);
461:       setStage(current?.phase ?? "plan");
462:       // A proposal belongs to the route it was computed from.
463:       setProposed(undefined);
464:       setProposalMessage("");
465:     });
466:   }, [citySlug, stage, savedMessage]);
467:   useEffect(() => {
468:     if (stage !== "active") return;
469:     const timer = setInterval(() => setNow(Date.now()), 30000);
```

## BACK

`mobile/src/components/NativeWalkFlow.tsx:473`

```text
472:   useEffect(() => {
473:     const subscription = BackHandler.addEventListener(
474:       "hardwareBackPress",
475:       () => {
476:         if (rebuildConfirmation) {
477:           if (!updateLock.current) setRebuildConfirmation(undefined);
478:           return true;
479:         }
480:         if (proposed) {
481:           setProposed(undefined);
482:           return true;
483:         }
484:         if (panel) {
```

## GPS

`mobile/src/components/NativeWalkFlow.tsx:506`

```text
505:   }, [proposed, panel, stage, step, rebuildConfirmation, interestOnboarding, interestEntryComplete, locationEntryComplete, firstExperienceComplete, buildError, journey, savedId, addSlug]);
506:   async function locate(applyResult: () => boolean = () => true) {
507:     setLocating(true);
508:     const result = await requestForegroundLocation(
509:       expoForegroundLocationAdapter,
510:     );
511:     setLocating(false);
512:     if (!applyResult()) return false;
513:     if (result.status === "available") {
514:       setGps({ lat: result.location.latitude, lng: result.location.longitude });
515:       setStartMode("gps");
516:       setMessage("");
517:     } else setMessage(t.gpsHelp);
```

## BUILD

`mobile/src/components/NativeWalkFlow.tsx:520`

```text
519:   }
520:   async function build() {
521:     const start =
522:       startMode === "gps"
523:         ? gps
524:         : places.find((p) => p.slug === startSlug)?.coordinates;
525:     const finish =
526:       endMode === "loop"
527:         ? start
528:         : endMode === "destination"
529:           ? places.find((p) => p.slug === endSlug)?.coordinates
530:           : undefined;
531:     const deadline = returnBy ? deadlineForToday(returnBy) : undefined;
```

## SETTINGS

`mobile/src/components/NativeWalkFlow.tsx:549`

```text
548:     try {
549:       const settings: WalkSettings = {
550:         minutes,
551:         deadline,
552:         start,
553:         finish,
554:         interests,
555:         categories,
556:         walking,
557:       };
558:       const steps = buildWalkSteps(places, settings);
559:       let result = steps.next();
560:       while (!result.done) {
```

## START

`mobile/src/components/NativeWalkFlow.tsx:640`

```text
639:   }
640:   async function start(mode: ActiveWalkMode = "basic") {
641:     if (!journey || updateLock.current) return;
642:     if (mode === "live" && !premium.active) {
643:       unlockPremium();
644:       return;
645:     }
646:     updateLock.current = true; setUpdating(true);
647:     try {
648:       if (walkStartStatus(journey, places, contentStatus === "available") !== "ready") return;
649:       if (authorizeStart && !await authorizeStart()) return;
650:       const next = await startCurrentWalk(citySlug, journey.id, places, contentStatus === "available");
651:       setActiveMode(mode);
```

## REBUILD

`mobile/src/components/NativeWalkFlow.tsx:682`

```text
681:   }
682:   async function requestRebuild() {
683:     if (updateLock.current) return;
684:     try {
685:       const current = await loadCurrentWalk(citySlug);
686:       if (journey && current?.journey.id !== journey.id) throw new Error("walk-changed");
687:       setMessage(""); setRebuildConfirmation({ current });
688:     }
689:     catch { setMessage(messages.tripSaveFailed); }
690:   }
691:   async function rebuild() {
692:     if (!rebuildConfirmation || updateLock.current) return;
693:     updateLock.current = true; setUpdating(true);
```

## CUSTOMIZE

`mobile/src/components/NativeWalkFlow.tsx:906`

```text
905:   );
906:   const customize = () => {
907:     if (!journey) return;
908:     setStage("plan");
909:     setStep(1);
910:     setShowMap(false);
911:     const settings = journey.settings;
912:     setMinutes(settings.minutes);
913:     setInterests(settings.interests);
914:     setCategories(settings.categories ?? []);
915:     setWalking(settings.walking);
916:     setGps(settings.start);
917:     setStartMode("gps");
```

## S05

`mobile/src/components/NativeWalkFlow.tsx:935`

```text
934:   if (interestOnboarding && !interestEntryComplete && !savedId && !addSlug && !journey && stage === "plan" && step === 1 && !buildError) {
935:     return <SelectInterests citySlug={citySlug} cityName={cityName} selected={interests}
936:       onToggle={key => setInterests(values => values.includes(key) ? values.filter(value => value !== key) : [...values, key])}
937:       onContinue={() => { if (interests.length) setInterestEntryComplete(true); }}
938:       onSkip={() => { setInterests([]); setInterestEntryComplete(true); }}
939:       onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: "/city/[citySlug]", params: { citySlug } })} />;
940:   }
941:   if (interestOnboarding && stage === "plan" && step === 1 && !buildError) {
942:     return <AvailableTime citySlug={citySlug} cityName={cityName} minutes={minutes} onSelect={setMinutes}
943:       onContinue={() => setStep(2)}
944:       onBack={() => {
945:         if (!journey && !savedId && !addSlug) setInterestEntryComplete(false);
946:         else if (router.canGoBack()) router.back();
```

## S06

`mobile/src/components/NativeWalkFlow.tsx:942`

```text
941:   if (interestOnboarding && stage === "plan" && step === 1 && !buildError) {
942:     return <AvailableTime citySlug={citySlug} cityName={cityName} minutes={minutes} onSelect={setMinutes}
943:       onContinue={() => setStep(2)}
944:       onBack={() => {
945:         if (!journey && !savedId && !addSlug) setInterestEntryComplete(false);
946:         else if (router.canGoBack()) router.back();
947:         else router.replace({ pathname: "/city/[citySlug]", params: { citySlug } });
948:       }}>
949:       <AppText variant="label">{t.deadlineQuestion}</AppText>
950:       <AppText variant="metadata" style={styles.muted}>{t.deadlineHelp}</AppText>
951:       <ReturnByTimePicker label={t.returnBy} value={returnBy} onChangeText={setReturnBy} placeholder={translate(locale, "planner.timePlaceholder")} />
952:     </AvailableTime>;
953:   }
```

## S07

`mobile/src/components/NativeWalkFlow.tsx:955`

```text
954:   if (interestOnboarding && !locationEntryComplete && !savedId && !addSlug && !journey && stage === "plan" && step === 2 && !buildError) {
955:     return <LocationPermission busy={locating} error={message || undefined}
956:       onUseLocation={() => {
957:         if (locating) return;
958:         const attempt = ++locationEntryAttempt.current;
959:         void locate(() => mounted.current && attempt === locationEntryAttempt.current).then(available => { if (available) setLocationEntryComplete(true); });
960:       }}
961:       onSkip={() => { locationEntryAttempt.current += 1; setMessage(""); setLocationEntryComplete(true); }}
962:       onBack={() => { locationEntryAttempt.current += 1; setMessage(""); setStep(1); }} />;
963:   }
964:   if (interestOnboarding && locationEntryComplete && !firstExperienceComplete && !savedId && !addSlug && !journey && stage === "plan" && step === 2 && !buildError) {
965:     return <FirstExperience citySlug={citySlug} cityName={cityName} cityMedia={cityMedia}
966:       onBack={() => setLocationEntryComplete(false)}
```

## S08

`mobile/src/components/NativeWalkFlow.tsx:965`

```text
964:   if (interestOnboarding && locationEntryComplete && !firstExperienceComplete && !savedId && !addSlug && !journey && stage === "plan" && step === 2 && !buildError) {
965:     return <FirstExperience citySlug={citySlug} cityName={cityName} cityMedia={cityMedia}
966:       onBack={() => setLocationEntryComplete(false)}
967:       onExplore={() => {
968:         setFirstExperienceComplete(true);
969:         router.push({ pathname: "/city/[citySlug]", params: { citySlug, returnToPlanner: "1" } });
970:       }} />;
971:   }
972:   return (
973:     <Screen
974:       scrollViewRef={scroll}
975:       onBack={
976:         stage === "plan" && step > 1
```

## REPEAT

`mobile/src/components/NativeWalkFlow.tsx:1070`

```text
1069:               <WalkChoices
1070:                 label={t.interests}
1071:                 help={t.interestsHelp}
1072:                 multiple
1073:                 interestGrid
1074:                 options={(Object.keys(interestTags) as Interest[]).map(
1075:                   (value) => ({
1076:                     value,
1077:                     label: t[value],
1078:                     description: ({
1079:                       en: { history: "Discover the past", architecture: "Iconic buildings", "hidden-gems": "Secret local spots", nature: "Parks & gardens", food: "Local flavors", culture: "Art & traditions", family: "Fun for everyone" },
1080:                       de: { history: "Geschichte entdecken", architecture: "Besondere Bauwerke", "hidden-gems": "Geheime Lieblingsorte", nature: "Parks & Gärten", food: "Lokale Spezialitäten", culture: "Kunst & Traditionen", family: "Für Groß und Klein" },
1081:                       da: { history: "Udforsk historien", architecture: "Ikoniske bygninger", "hidden-gems": "Skjulte perler", nature: "Parker og haver", food: "Lokale smage", culture: "Kunst og traditioner", family: "For hele familien" },
```

## WALKING

`mobile/src/components/NativeWalkFlow.tsx:1131`

```text
1130:               <WalkChoices
1131:                 label={t.walking}
1132:                 variant="segment"
1133:                 compact
1134:                 compactPace
1135:                 options={(["easy", "balanced", "long"] as const).map(
1136:                   (value) => ({
1137:                     value,
1138:                     label: translate(locale, `profile.walking_${value}` as TranslationKey),
1139:                   }),
1140:                 )}
1141:                 selected={[walking]}
1142:                 onSelect={setWalking}
```

## CONSTRAINTS

`mobile/src/components/NativeWalkFlow.tsx:1147`

```text
1146:             <>
1147:               <SectionTitle>{t.start}</SectionTitle>
1148:               <PressableSurface
1149:                 accessibilityRole="button"
1150:                 accessibilityLabel={t.current}
1151:                 accessibilityState={{ selected: startMode === "gps" }}
1152:                 disabled={locating}
1153:                 onPress={() => void locate()}
1154:                 style={{
1155:                   minHeight: 70, flexDirection: "row", alignItems: "center",
1156:                   gap: 12, padding: 14, borderWidth: 1,
1157:                   borderColor: startMode === "gps" ? colors.primary : colors.border,
1158:                   backgroundColor: startMode === "gps" ? colors.primarySoft : colors.surface,
```

## HUBRETURN

`mobile/src/app/city/[citySlug]/index.tsx:154`

```text
153:                 // Screen 08 keeps its city-scoped planner mounted beneath this hub.
154:                 if (params.returnToPlanner === "1" && router.canGoBack()) {
155:                   event.preventDefault();
156:                   router.back();
157:                 }
158:               }}
159:               href={{
160:                 pathname: "/city/[citySlug]/walk",
161:                 params: { citySlug: city.slug },
162:               }}
163:               asChild
164:             >
165:               <PrimaryButton
```

## GUIDERETURN

`mobile/src/app/city/[citySlug]/assistant.tsx:13`

```text
12: 
13: export default function CityAssistantScreen() {
14:   const { citySlug, returnToPlanner } = useLocalSearchParams<{ citySlug?: string; returnToPlanner?: string }>();
15:   const { messages } = useNativeLocale();
16:   const context = cityAssistantContext(citySlug);
17:   return context ? <CityAssistant context={context} returnToPlanner={returnToPlanner === "1"} /> : <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
18: }
19: 
20: export function CityAssistant({ context, returnToPlanner = false }: { context: CityAssistantContext; returnToPlanner?: boolean }) {
21:   const { locale, direction, messages } = useNativeLocale();
22:   const city = usePublicCity(context.citySlug, locale);
23:   const copy = discoveryCopy(locale);
24:   return (
```

## READ

`mobile/src/lib/walkStorage.ts:20`

```text
19: }
20: async function read(key: string, store: WalkStore): Promise<unknown> {
21:   const value = await store.getItem(key);
22:   try {
23:     return value ? JSON.parse(value) : undefined;
24:   } catch {
25:     return undefined;
26:   }
27: }
28: // Serialize read-modify-write operations so rapid save/remove taps cannot lose updates.
29: let queue: Promise<unknown> = Promise.resolve();
30: function mutate<T>(work: () => Promise<T>): Promise<T> {
31:   const next = queue.then(work, work);
```

## REPLAY

`mobile/src/lib/walkStorage.ts:55`

```text
54: }
55: export function reopenSavedWalk(record: WalkJourney, sessionId: string): WalkJourney {
56:   const { savedAt: _savedAt, updatedAt: _updatedAt, ...route } = record as SavedWalk;
57:   return { ...route, savedWalkId: record.id, id: sessionId,
58:     remaining: [...new Set([...record.visited, ...record.remaining])], visited: [],
59:     position: record.settings.start, historyDistance: 0, startedAt: Date.now(), finishedAt: undefined,
60:     settings: { ...record.settings, deadline: undefined },
61:   } as LinkedJourney;
62: }
63: export type CurrentWalk = { journey: WalkJourney; phase: "preview" | "active" };
64: const listeners = new Map<string, Set<(current: CurrentWalk | undefined) => void>>();
65: export function subscribeCurrentWalk(city: string, listener: (current: CurrentWalk | undefined) => void) {
66:   const group = listeners.get(city) ?? new Set();
```

## CURRENT

`mobile/src/lib/walkStorage.ts:75`

```text
74: }
75: export async function loadCurrentWalk(city: string, store?: WalkStore): Promise<CurrentWalk | undefined> {
76:   const value = await read(activeKey(city), store ?? (await defaultStore()));
77:   if (!isWalkJourney(value) || value.citySlug !== city || value.finishedAt) return;
78:   const { nativePhase, ...journey } = value as WalkJourney & { nativePhase?: string };
79:   return { journey: uniqueJourney(journey), phase: nativePhase === "preview" ? "preview" : "active" };
80: }
81: export async function loadActiveWalk(city: string, store?: WalkStore) {
82:   const current = await loadCurrentWalk(city, store);
83:   return current?.phase === "active" ? current.journey : undefined;
84: }
85: async function writeCurrent(current: CurrentWalk, target: WalkStore) {
86:   if (!isWalkJourney(current.journey)) throw new Error("Invalid journey");
```

## WRITE

`mobile/src/lib/walkStorage.ts:103`

```text
102: }
103: export async function persistCurrentWalk(journey: WalkJourney, phase: CurrentWalk["phase"], store?: WalkStore) {
104:   return mutate(async () => writeCurrent({ journey, phase }, store ?? await defaultStore()));
105: }
106: export async function persistActiveWalk(journey: WalkJourney, store?: WalkStore) {
107:   return persistCurrentWalk(journey, "active", store);
108: }
109: 
110: function visitStopStatus(slugs: readonly string[], places: readonly PublicPlaceCard[], contentReady: boolean) {
111:   if (!contentReady) return "loading";
112:   const stops = slugs.map(slug => places.find(place => place.slug === slug));
113:   if (stops.some(place => !place)) return "unresolved";
114:   if (!stops.length || stops.some(place => !isEligibleTourPlace(place!))) return "empty";
```

## STARTSTORE

`mobile/src/lib/walkStorage.ts:125`

```text
124: 
125: export async function startCurrentWalk(city: string, id: string, places: readonly PublicPlaceCard[], contentReady = true, store?: WalkStore) {
126:   return mutate(async () => {
127:     const target = store ?? await defaultStore();
128:     const current = await loadCurrentWalk(city, target);
129:     if (!current || current.journey.id !== id) throw new Error("walk-changed");
130:     // Idempotent: repeated taps never reset a running timer or write another start.
131:     if (current.phase === "active") return current;
132:     const status = walkStartStatus(current.journey, places, contentReady);
133:     if (status !== "ready") throw new Error(`walk-start-${status}`);
134:     const next: CurrentWalk = { phase: "active", journey: { ...current.journey, startedAt: Date.now() } };
135:     await writeCurrent(next, target);
136:     return next;
```

## CLEAR

`mobile/src/lib/walkStorage.ts:142`

```text
141: // another screen. Only this city's current slot is cleared; saved data survives.
142: export async function clearCurrentWalk(city: string, expected: CurrentWalk | undefined, store?: WalkStore) {
143:   return mutate(async () => {
144:     const target = store ?? await defaultStore();
145:     const current = await loadCurrentWalk(city, target);
146:     if (current?.phase !== expected?.phase || JSON.stringify(current?.journey) !== JSON.stringify(expected?.journey)) throw new Error("walk-changed");
147:     await target.setItem(activeKey(city), "null");
148:     notifyCurrentWalk(city, undefined);
149:   });
150: }
151: // Read and transform under the same queue so two screens cannot add duplicates
152: // or lose each other's membership edits. The caller checks any route constraints.
153: export async function changeCurrentWalk(
```

## ACCOUNTOPEN

`mobile/src/lib/accountWalks.ts:54`

```text
53: }
54: export async function loadAccountWalkForOpen(id: string, citySlug: string) {
55:   const session = await nativeAuthClient.getSession();
56:   const userId = session.data?.user.id;
57:   if (!userId) throw new Error("account-required");
58:   const record = (await listAccountWalks(userId)).find(w => w.id === id && w.citySlug === citySlug);
59:   if (!record) throw new Error("account-save-unavailable");
60:   return { ...record, accountSavedWalkId: record.id, accountSavedUserId: userId };
61: }
```

## DEFAULTS

`mobile/src/lib/travelerStyle.ts:58`

```text
57: 
58: export async function loadTravelerStyle(
59:   userId: string | undefined,
60:   store?: Store,
61: ): Promise<TravelerStyle> {
62:   if (!userId) return DEFAULT_TRAVELER_STYLE;
63:   try {
64:     const raw = await (store ?? await defaultStore()).getItem(travelerStyleStorageKey(userId));
65:     return raw ? parse(JSON.parse(raw)) : DEFAULT_TRAVELER_STYLE;
66:   } catch {
67:     return DEFAULT_TRAVELER_STYLE;
68:   }
69: }
```

## PLANNER

`packages/traveler-core/src/walkPlanner.ts:15`

```text
14: export type Interest = keyof typeof interestTags;
15: export type WalkSettings = {
16:   minutes: number;
17:   deadline?: number;
18:   start: Point;
19:   finish?: Point;
20:   interests: Interest[];
21:   categories?: string[];
22:   walking: "easy" | "balanced" | "long";
23: };
24: export type WalkRoute<T extends TourBuilderPlace> = {
25:   places: T[];
26:   distance: number;
```

## MEASURE

`packages/traveler-core/src/walkPlanner.ts:40`

```text
39: }
40: export function measureWalk<T extends TourBuilderPlace>(
41:   places: T[],
42:   start: Point,
43:   finish?: Point,
44: ): WalkRoute<T> {
45:   let current = start,
46:     distance = 0,
47:     walkingMinutes = 0,
48:     visitMinutes = 0;
49:   for (const point of [
50:     ...places.map((place) => place.coordinates),
51:     ...(finish ? [finish] : []),
```

## DEADLINE

`packages/traveler-core/src/walkPlanner.ts:148`

```text
147: }
148: export function deadlineForToday(
149:   value: string,
150:   now = new Date(),
151: ): number | undefined {
152:   // Native Arabic keyboards may enter Arabic-Indic digits; browser time inputs
153:   // already normalize them. Accept the same clock value on every platform.
154:   value = value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)));
155:   if (!/^\d{2}:\d{2}$/.test(value)) return undefined;
156:   const [hours, minutes] = value.split(":").map(Number);
157:   if (hours > 23 || minutes > 59) return undefined;
158:   const target = new Date(now);
159:   target.setHours(hours, minutes, 0, 0);
```

## PICKER

`mobile/src/components/ReturnByTimePicker.tsx:21`

```text
20: }
21: export function ReturnByTimePicker({ label, value, onChangeText, placeholder }: {
22:   label: string;
23:   value: string;
24:   onChangeText: (value: string) => void;
25:   placeholder: string;
26: }) {
27:   const { locale } = useNativeLocale();
28:   const [open, setOpen] = useState(false);
29:   const [draft, setDraft] = useState(() => timeDate(value));
30:   // Android retains the validated HH:MM input until a native Android picker is implemented.
31:   if (Platform?.OS !== "ios") {
32:     return <WalkInput label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} />;
```

## PRESENTATION

`mobile/src/components/FirstExperience.tsx:21`

```text
20: 
21: export function FirstExperience({ citySlug, cityName, cityMedia = [], onExplore, onBack }: {
22:   citySlug: string; cityName: string; cityMedia?: readonly PublicMedia[]; onExplore: () => void; onBack: () => void;
23: }) {
24:   const { locale, direction, messages } = useNativeLocale();
25:   const { height, fontScale } = useWindowDimensions();
26:   const available = isCityLaunched(citySlug);
27:   const name = nativeCityName(citySlug, cityName, locale);
28:   const copy = firstExperienceCopy[locale];
29:   // A bundled image is mapped only to its own city. Other cities use their own published media.
30:   const bundled = citySlug === "lubeck";
31:   const media = selectPrimaryImageMedia(cityMedia);
32:   const uri = selectImageUrl(media, undefined, undefined, "hero");
```

## ID

`mobile/src/lib/tripNavigation.ts:26`

```text
25: 
26: export function createMobileTripId(prefix = "trip"): string {
27:   const randomId = globalThis.crypto?.randomUUID?.();
28:   return `${prefix}-${randomId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
29: }
30: 
31: export function createMobileTripPlaceParams(
32:   input: Omit<MobileTripContext, "version" | "currentStopIndex">,
33:   currentStopIndex: number,
34: ): MobileTripRouteParams {
35:   assertTripIdentity(input.citySlug, input.stopSlugs, currentStopIndex);
36:   return {
37:     citySlug: input.citySlug,
```

## NAVPATTERN

`mobile/src/lib/tabNavigation.tsx:41`

```text
40: export function useTabScrollCoordinator() { return useContext(TabScrollContext); }
41: export function useRootTabScroll(scrollToTop: (animated?: boolean) => void) {
42:   const route = useRoute();
43:   const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
44:   const params = useLocalSearchParams<{ section?: string; view?: string; citySlug?: string }>();
45:   const coordinator = useTabScrollCoordinator();
46:   // usePathname is global: background stack screens must retain their own identity.
47:   const path = route.name === "index" ? "/" : route.name === "saved" ? "/saved"
48:     : route.name === "profile" ? "/profile"
49:     : route.name === "account/index" ? "/account"
50:     : route.name === "city/[citySlug]/index" && params.citySlug ? `/city/${params.citySlug}`
51:     : route.name === "city/[citySlug]/explore" && params.citySlug ? `/city/${params.citySlug}/explore` : "";
52:   const key = tabRootKey(path, params);
```

## SDK_NAV

`mobile/node_modules/expo-router/build/useNavigation.d.ts:57`

```text
56:  */
57: export declare function useNavigation<T = Omit<NavigationProp<ReactNavigation.RootParamList>, 'getState'> & {
58:     getState(): NavigationState | undefined;
59: }>(parent?: string | Href): T;
60: //# sourceMappingURL=useNavigation.d.ts.map
```

## SDK_POP

`mobile/node_modules/expo-router/build/react-navigation/routers/StackRouter.d.ts:68`

```text
67:      */
68:     pop(count?: number): void;
69:     /**
70:      * Pop to the first route in the stack, dismissing all other screens.
71:      */
72:     popToTop(): void;
73:     /**
74:      * Pop any screens to go back to the specified screen.
75:      * If the specified screen doesn't exist, it'll be added to the stack.
76:      *
77:      * @param screen Name of the route to pop to.
78:      * @param [params] Params object for the route.
79:      * @param [options.merge] Whether to merge the params onto the route. Defaults to `false`.
```

## SDK_PARAMS

`mobile/node_modules/expo-router/build/react-navigation/core/types.d.ts:293`

```text
292:      */
293:     setParams(params: ParamList[RouteName] extends undefined ? undefined : Partial<ParamList[RouteName]>): void;
294:     /**
295:      * Replace the param object for the route
296:      *
297:      * @param params Params object for the current route.
298:      */
299:     replaceParams(params: ParamList[RouteName] extends undefined ? undefined : ParamList[RouteName]): void;
300: };
301: export type NavigationHelpers<ParamList extends ParamListBase, EventMap extends EventMapBase = {}> = NavigationHelpersCommon<ParamList> & EventEmitter<EventMap> & NavigationHelpersRoute<ParamList, keyof ParamList>;
302: export type NavigationContainerProps = {
303:     /**
304:      * Initial state object for the navigation tree.
```


## SDK_GESTURE

`mobile/node_modules/expo-router/build/react-navigation/native-stack/types.d.ts:558`

```text
551:     /**
552:      * Whether you can use gestures to dismiss this screen. Defaults to `true`.
553:      *
554:      * Only supported on iOS.
555:      *
556:      * @platform ios
557:      */
558:     gestureEnabled?: boolean;
559:     /**
560:      * Use it to restrict the distance from the edges of screen in which the gesture should be recognized. To be used alongside `fullScreenGestureEnabled`.
```
