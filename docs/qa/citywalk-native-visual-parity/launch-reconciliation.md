# CITYWALK launch reconciliation — 2026-09-25

> **Status update — 2026-09-27:** The owner has now accepted the specific empty-walk Start/Save/Rebuild correction round on the tested iPhone; see the latest [QA ledger](README.md#empty-walk-correction-round-accepted-on-tested-iphone--2026-09-27). Pending language/visual checks outside that round remain unverified. Historical source digests, gate counts and earlier pending statements below describe their dated runs, not this checkpoint. See [reviewed checkpoint](reviewed-checkpoint.md) for current integration evidence.


This report supersedes stale scope/readiness statements in earlier QA notes. Those notes remain dated history. Work stayed on `fix/citywalk-native-device-acceptance`; no commit, push, merge, source upload, build/export, deployment, store submission, content publication or service-configuration mutation.

## A. Baseline and evidence identity

- Local HEAD: `efe8cf62f408181f0f4ca922f32e53e712a982a2`.
- Read-only GitHub audit: PR [#142](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/142) is **open, not merged**, targeting `develop`. Remote head is the same SHA; reported base SHA is `7e6abee18cb625eb81a40f889ad9bbdcac00d88b`.
- `git ls-tree HEAD packages/i18n` is empty; HEAD's mobile manifest does not declare StoreReview. The working tree already contained both. Remote absence was not treated as missing local implementation.
- Existing local work includes shared i18n, seven dictionaries, six launch languages, native loading/membership/RTL fixes and review integration, plus Web compatibility/editorial separation. It was preserved rather than recreated.
- Nothing is staged. Full final status/stat and source identity are below. The [local source manifest](local-source-identity.json) records content hashes, deleted paths and the exact source digest; documentation is excluded to avoid self-referential hashing. No ignored files are part of the source identity.

| Evidence state | What is established |
| --- | --- |
| LOCAL IMPLEMENTED | Current source manifest, including untracked shared package and native review files |
| AUTOMATED VERIFIED | Only the completed final gates listed below; mocked native bridges are identified |
| DEVICE VERIFIED | Dated owner observations below, not blanket verification of this local revision |
| PUSHED | Only HEAD/PR #142 snapshot; newer uncommitted localization/review work is not pushed |
| MERGED | Current PR #142 is not merged; restored develop baseline is distinct |
| DEPLOYED | Existing develop Preview serves the audited content/endpoints; this working tree was not deployed |

### Native evidence ledger

| Distribution | Source/build/environment | Device, locale, scenario, result |
| --- | --- | --- |
| Current local implementation | HEAD plus source manifest; no new build/profile/version assigned | Automated only. Current iPhone/Android physical results not captured |
| Earlier Development Client | Exact build ID/profile/version and source diff not recorded in owner observations; do not infer its module set | Owner iPhone, model/OS unspecified, 2026-09-25: correct-place Read/Listen, compact Back, Explore one-tap, Ask opening EN/DE/AR and planner progress accepted. Home one-tap still unresolved |
| Earlier internal iOS Release | `e18db018-1716-4886-aede-aa3919bc6b95`, preview/internal Release, `com.citywalk.app`, 1.0.0 (9), develop Preview; predates current changes | Artifact inspection is historical; cannot validate current local i18n/reviews |
| TestFlight | Historical Build 7, current source mapping unavailable | Not reused as evidence of current work; review-dialog suppression is expected |
| Android | No current source-matched Play test build/device evidence | Internal APK/development tests do not establish Google Play review integration |

Read-only `xcrun xctrace list devices` detected the Mac and iOS 16.2 simulators, **no physical iPhone**. The first sandboxed inventory crashed; the permitted read-only retry succeeded. Installed Development Client native module presence is therefore **unverified**, not verified absent. HEAD lacks the new dependency; a compatible rebuild containing StoreReview requires separate approval. Clearing Metro cannot add native code.

There are **19 actual Web PNGs** under `screenshots/web/`, **0 local iOS PNGs**, **0 local Android PNGs** in this QA directory. No invented screenshot paths or new device pass. Missing evidence is **UNVERIFIED**, not an observed MISMATCH. Prior matrix rows labelled “MISMATCH — unverified” should be read accordingly. No new observed mismatch classification was possible.

## B. Minimal #137 / #130 corrections

### #137 localization

- Reused `packages/i18n`; exact official set stays **de, en, da, sv, nl, es**. Arabic and accepted RTL remain supported; no new Arabic editorial production.
- Added persisted native preference using existing AsyncStorage; serialized writes preserve the latest selection. Late hydration cannot overwrite a new selection. Runtime Intl device tags normalize region/case/underscore variants to supported languages; unsupported tags safely resolve to English. Actual OS locale behavior remains a device gate.
- Provider does not re-key navigation or write saved/current-walk storage. A localized city fetch previously could unmount the walk and restart a saved route; the walk now keeps same-city data and its mounted state during refresh, with retry on failure. Other-city data is not reused.
- Removed the hard-coded minimum 432 assertion. Key and placeholder gates follow current English keys, including newly introduced future keys; all seven dictionaries are checked.
- One header language-selection interaction; full names and scrollable menu. Six launch locales in production; Arabic remains accessible in development and retains runtime/RTL compatibility. No duplicate native translation dictionaries.

### #130 reviews

- Automatic request only after completion with **at least two distinct nonempty visited stop IDs**, after a two-second settling period, while focused and foreground. Existing `advanceWalk(..., false)` skip behavior never adds a visited stop. Manual visited state is not a physical-arrival/GPS assertion.
- Configurable application policy: **three additional unique completed walks OR 30 days since an attempt**. All unique completed walks count toward the interval; a prompting walk itself still needs two visited stops. Reopening Finish cannot increment the count, and a previously attempted journey cannot request again.
- Persisted unique completion/attempt ledger; serialized requests; record attempt before native call; migrate previous local attempt IDs. Corrupt/unwritable history suppresses prompting. OS silence/errors never open a URL, screen by private rating or claim a submitted review.
- Independent optional explicit store link: only approved configured HTTPS URL, intentional tap opens that URL, never calls the native API or changes automatic eligibility. No guessed URL, old dev listing or numeric app ID. Both example variables remain empty.
- Neutral translated review copy in the six launch languages (Arabic compatibility retained). Private feedback keeps existing local storage/data semantics and becomes a separate optional disclosure after the automatic opportunity settles. No private opinion question precedes the native request.
- No review analytics aliases or new product events emitted. #61 owns transport/taxonomy acceptance.

## C. Historical UI integration and dated published prose coverage

Historical UI check in this run: **432 keys × 7 catalogs**. The later validated checkpoint has **440 keys × 7 catalogs**, zero errors; neither establishes linguistic or device acceptance.

Native consumers: Home/discovery, City Hub, place cards/detail, planner/progress/preview/active/Finish, membership, Saved/Trips, Profile/account, Ask, loading/recovery and navigation through shared adapters. Web consumers include the locale bridge, discovery/walk, account/commerce and City Pass UI. All **27 Web locales/routes** remain; the other **20** dictionaries remain legacy. Canonical Lübeck/city-pass editorial data is separate from static UI; untranslated English product prose retains its real language metadata. See [migration inventory](../../architecture/shared-i18n.md).

Content source: existing read-only report, **2026-09-25T17:23:59.160Z**, restored **develop Preview**, `${DEVELOP_PREVIEW_ORIGIN}/api/content/cities/lubeck?locale=LOCALE`. The raw coverage artifact is held locally because summary audio counts are not authoritative. Denominators: **one city, 25 published places, one tour**. No full catalog refetch. Description/facts/visit-note counts below were derived from the saved responses of the same audit (`<local-only temporary artifact>`), not a new publication state.

| Locale | City name / summary (of 1) | Place name / summary (of 25) | Description / story / facts / visit note (of 25) | Tour title / short description (of 1) | Audio coverage from summary |
| --- | --- | --- | --- | --- | --- |
| DE | 1 / 0 | 25 / 25 | 5 / 5 / 5 / 6 | 1 / 1 | Not established |
| EN | 1 / 0 | 25 / 25 | 5 / 5 / 5 / 6 | 1 / 1 | Not established |
| DA | 0 / 0 | 5 / 5 | 5 / 5 / 5 / 0 | 1 / 1 | Not established |
| SV | 0 / 0 | 5 / 5 | 5 / 5 / 5 / 0 | 1 / 1 | Not established |
| NL | 0 / 0 | 5 / 5 | 5 / 5 / 5 / 0 | 1 / 1 | Not established |
| ES | 0 / 0 | 5 / 5 | 5 / 5 / 5 / 0 | 1 / 1 | Not established |

Counts require authored requested-locale content; English fallback does not count as translation. Empty stories do not mean no readable content: all DE/EN places have summaries, and the other four locales can receive English fallback for twenty places. Tour short descriptions are generic walking-tour labels; no distinct long tour story is exposed. Full missing-slug lists are in [launch-languages.md](launch-languages.md).

Audio boundaries:

- Detail-level CMS metadata independently identified English Holstentor audio; German Holstentor detail had none. Summary omissions do not prove the absence of audio elsewhere. Later delivery/audibility evidence is recorded in the media report and owner ledger.
- Legacy local files: five EN place MP3s (Holstentor, Rathaus, Marienkirche, Heiligen-Geist-Hospital, Buddenbrookhaus), one DE Holstentor MP3; additionally one FR Holstentor file outside launch scope. Relative to the 25-place audit denominator that is file presence 5/25 EN, 1/25 DE, 0/25 DA/SV/NL/ES. Not CMS approval, rights review or native playback evidence.
- Native `selectExactLocaleAudio` accepts exact-locale approved `/api/media/` metadata, not a guessed legacy English substitute. Legacy file presence is not added to native CMS coverage.
- Premium narration is separately entitlement-gated through `/api/commerce/media/[assetKey]`; current premium inventory/entitlement/playback was not audited. No premium completeness claim or paid-access change.
- No current per-locale physical playback matrix. Correct-place Listen navigation accepted by the owner does not by itself validate every audio asset.

### Reviewable draft batches under #111 / #74

1. City identity: DA/SV/NL/ES Lübeck name plus city summaries for all six; proposed translations remain drafts for editorial review.
2. Twenty missing DA/SV/NL/ES place names/summaries; retain IDs/slugs and reviewed EN/DE copy. Use the dated prose slug list in `launch-languages.md`; recheck content before any editorial action.
3. Twenty missing descriptions/stories/facts in all six; visit-note gaps separately (19 DE/EN, 25 in each other launch locale). Prioritize core route stops using reviewed factual sources; optional field emptiness is not automatically a launch blocker.
4. Review existing tour names/short descriptions and any intended narrative needs, rather than assuming a populated generic label establishes editorial quality.
5. Define the key-stop DE/EN audio baseline; inventory CMS versus legacy versus premium, rights/provenance, text hashes and exact-locale playback. No requirement for 25 recordings in all six locales is imposed.
6. After editorial approval, separately authorize a safe CMS publish → API/cache refresh → native display check without app rebuild. The current task made no publication writes, so that end-to-end acceptance remains open. Isolated DB tests are not a substitute for native refresh evidence.

Second-city timing conflict: #111 names a second German city as P0 pipeline proof for the first Lübeck validation; older #131 staging places it after initial validation, while #136's current sequence puts native beta before analytics/dashboard and Lübeck + second-city work. Product planning must distinguish native Store Beta, initial Lübeck cohort and portfolio pipeline proof. No new city production or invented release gate here.

## D. Native review acceptance limitations

[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/storereview/) recommends completion-triggered requests and warns against rating-button triggers/prequestions. [Apple StoreKit](https://developer.apple.com/documentation/storekit/requesting-app-store-reviews) recommends a quiet completed-task moment and permits OS suppression. [Google Play testing](https://developer.android.com/guide/playcore/in-app-review/test) distinguishes internal testing, internal sharing and fake APIs. These were read against current official documentation; no third-party assumptions or platform-quota promises.

- Development Client: first verify `ExpoStoreReview` exists in that exact installed binary. A newly added package in JS/package.json is insufficient; rebuild requires approval. No connected device means this verification is blocked, not failed.
- iOS development/internal Release: verify exact module/build/source and nondisruptive request/no-navigation behavior. A displayed dialog is not evidence of an actual submitted public review.
- TestFlight: nonappearance is expected; do not fail acceptance merely because a dialog is suppressed.
- Android: approved Play internal/closed testing build for `com.citywalk.app`, tester opt-in/primary account and Play-installed package. Check no prior review, eligible Play account/services and record request/no-op behavior. Internal app sharing does not provide a submittable-review test; mocked `requestReview` only proves application policy.
- Explicit links remain hidden while real public URLs are unapproved. Test fixtures do not supply production listing values.

## E. Existing issue ownership and analytics audit

All listed issues were read; no remote edits/comments/new issues.

| Existing owner | Remaining work / surface |
| --- | --- |
| #137 | Six-locale shared integration, linguistic review, device persistence/long-label acceptance; Mobile Core required, existing shared Web consumers regression-required, Admin content scope separate |
| #130 | Native reviews and explicit approved listing links; Mobile Core required, Public Web not applicable, Admin not applicable |
| #138 + #33 + #112 | iOS/Android V2 capabilities, release-build/device evidence, GPS/map/audio/live AI/auth/lifecycle and Android acceptance; Public Web intentionally scoped under #136 |
| #53 | Feedback/bugs/suggestions must persist and reach founder workflow, with localized recovery/rate limiting/privacy. Device-local Finish feedback does not complete it |
| #61 | Actual native analytics delivery, canonical event definitions/platform/locale, 20–30 real traveler cohort, distribution findings; never infer arrival from a page view |
| #59 | Admin Users and Product Analytics, authorized real account and analytics sources. Registered database accounts are not active travelers |
| #111 + #74 | Reviewed CMS city/place/tour translation, approved imagery/audio, draft workflow, refresh-to-native proof |
| #60 | Acquisition landing, real native visuals, SEO, legal/contact and approved beta/store conversion; full Web active-trip parity not required |
| #61 + #62 | Social content/tester cohort/hotel-QR pilot: prepare plans, no accounts/publication/outreach in this task |
| #109 + #110 | Privacy/data rights/retention/store disclosures; monitoring, alerts, backup/restore, incident ownership |
| #128 + #129 + #130 | Approved metadata, real-build screenshots, truthful review flow before public submission |
| #108 + #34 | Server-authoritative native paid access/restore/refund and final release; no paid-access switch without a recorded product decision |

### Current events → #61 taxonomy decision

| Existing code event(s) | Meaning / proposed canonical reconciliation, no emission changes |
| --- | --- |
| `city_opened`, `place_viewed` | Web pathname-derived visitor events; keep city/place context and locale. Views are not physical arrival |
| `landmark_opened`, `landmark_selected` | Legacy detail/link events; audit overlap with `place_viewed` before unifying, do not double-emit aliases |
| `personalized_tour_built`, `tour_preferences_changed` | Existing Web builder events; reconcile with proposed `route_built`, preference and return-by taxonomy |
| `tour_started`, `tour_completed`, `tour_rated` | Existing Web start/completion/private feedback semantics; reconcile proposed trip events and `completion_feedback`, not store review |
| `ai_guide_opened`, `ai_question_asked`, `ai_rate_limit_reached` | Open/attempt/rate-limit, not proof of successful useful answer. Define `ai_used` success semantics before mapping |
| `audio_played`, `premium_feature_used` | Web audio interaction events; verify actual native start/delivery separately before mapping `audio_used` |
| `map_opened`, `map_place_selected`, `place_category_selected` | Map/category interactions, not arrival |
| `location_requested`, `location_available`, `location_permission_denied`, `location_error`, `arrival_detected`, `arrival_story_started` | Web location/arrival pipeline; only legitimate arrival signals qualify, never page-view aliases |
| `language_selected` | Web selector event already carries locale. Native preference now persists, but no native transport was added |
| `paywall_viewed`, `premium_feature_selected`, `checkout_started`, `checkout_returned`, `entitlement_granted` | Existing commerce foundation; return is not verified payment. Server grant is authoritative; reconcile enabled-commerce funnel only |

Native `mobile/src/lib/analytics.ts` currently exposes a location-properties helper; no PostHog/mobile capture transport was found. Shared planner/walk domain does not emit events. Consequently review/completion analytics and native funnel delivery are **not implemented by this change**. #61 must define one taxonomy with `platform`, `city`, `locale`, app/release context, consent/identity policy and deduplication. Exclude raw GPS/trails, question/feedback text, auth/session secrets and sensitive payloads. Verify transport ingestion, not merely a function call.

## F. Blockers by release stage

| Stage | Remaining blockers / evidence |
| --- | --- |
| Device QA | Source-matched native binary/module inventory; new-module rebuild approval if absent; iOS/Android physical locale persistence/long labels/RTL; Home one-tap unresolved at this historical audit, subsequently owner-confirmed; screenshots and navigation/lifecycle/audio/map/GPS/auth on real devices. Preserve accepted observations |
| Store Beta (#33) | TestFlight and Google Play internal/closed test acceptance of required native capabilities; current live guide failure, media delivery defect, full map/audio validation and crash evidence require documented acceptance/triage. Internal/dev evidence alone is insufficient. TestFlight review suppression is not a blocker |
| Public free release | Native beta/matrix green; #109/#110 legal/operations; #128–130 metadata/real screenshots/reviews; approved six-locale UI/editorial scope and native delivery; #60 landing/legal/store links; real #61 analytics. Free release without commerce requires explicit paid-access product decision |
| Paid release | #108 native compliant purchase/restore/refund/entitlement testing, sandbox acceptance and real approved premium content/legal/support requirements; no enable/disable decision made |
| Later polish / scale | Broader locale editorial/audio portfolio, second-city rollout after timing decision, social/QR experiments and evidence-led visual polish. Do not add a universal all-place/all-locale audio beta gate |

### Fresh endpoint recheck

At **2026-09-25T18:19:49.605491Z**, same develop Preview:

- Approved city card `/api/media/d90f55b7-14ff-4fb5-b196-b7afec17d825?variant=card`: **502**, safe “Media delivery is temporarily unavailable.”
- Published fallback `/landmarks/holstentor.jpg`: **200**, JPEG, 2,502,963 bytes.
- Real `/api/guide` question for Lübeck/Holstentor in EN: **500**, safe “AI Guide is temporarily unavailable.” No fake answer or limiter bypass.

Media delivery failed in this dated probe; later sampled image/full-audio requests succeeded, as recorded in `managed-media-diagnosis.md`. The old runtime logs identified missing Upstash configuration; this new sanitized 500 **does not establish the present root cause**. Current Upstash configuration/provider diagnosis remains unverified and belongs to authorized service/log investigation. Full map rendering and Stripe/native sandbox acceptance were not exercised or claimed fixed. Fallback imagery keeps Home city cards, City Hub/suggested cards, place/itinerary thumbnails and detail heroes usable in their existing V2 slots, but does not prove on-device crop/rendering or repair managed delivery.

## G. Local-only draft guidance/ticket amendments

Applied narrow local guidance corrections in `AGENTS.md`, `mobile/AGENTS.md`, `.github/pull_request_template.md` and scope banners in the architecture/native-shell docs, referencing #136 and dated #131/#138/#33/#112 updates. Preserve V2 identity and native interactions; keep existing Web features. Each ticket classifies Mobile Core, Public Web required/optional/N/A and Admin Web required/N/A; evidence states remain separate.

Proposed ticket text, **not posted**:

- **#137:** approved launch set is exactly DE/EN/DA/SV/NL/ES; AR regression compatibility retained. Gate dictionary/interpolation, persisted/device preference and actual physical language layouts separately from CMS editorial/audio readiness.
- **#130:** use the two-distinct-visited-stop automatic policy and three-additional-completions-or-30-days interval above; independent explicit configured links; no feedback screening, submitted-review claims or TestFlight dialog gate. Verify native module/build evidence.
- **#131/#111:** decide which milestone requires second-city proof: initial Lübeck cohort, Store Beta, or portfolio scaling; do not silently treat the conflicting staging as resolved.
- **#112/#138:** missing native captures are UNVERIFIED; old Web comparison matrices are historical, not universal parity gates. Record native capability/device evidence and accepted V2 identity.
- **#61/#59:** approve the event-definition mapping before renaming/emitting; distinguish accounts, active travelers, page views, legitimate visited stops and actual delivery.
- **#111/#74:** track draft/review/publish status per field and exact audio locale; approve a realistic key-stop baseline, then authorize the publish/cache/native-refresh acceptance test.

## H. Proposed commit/PR grouping — approval required

Do not mass-stage the working tree. Inspect hunks because several files contain earlier work from multiple tasks.

1. Shared i18n foundation/#137: `packages/i18n`, shared adapters, Web compatibility/editorial separation, six locale integration/persistence, CI and tests. Include importer/public resolver regression evidence together. Preserve all 27 Web routes.
2. Native correctness/#138: existing accepted RTL/Slot, loading/membership, navigation/media fixes and regression evidence. Separate earlier behavior fixes from the language-refresh preservation hunk where practical.
3. Reviews/#130: native dependency/lock, service/component, Finish optional feedback separation, shared review strings and empty URL examples, policy tests. Depend on shared i18n; mark binary/device acceptance pending.
4. Scope/evidence/#136/#112: guidance, QA reports, coverage and source manifest. No claimed deployment or screenshot acceptance.

These are review boundaries, not commands to cherry-pick random files. Prefer coherent dependent PRs against develop after owner approval. Existing local work is not discarded to force artificial separation.

## I. Next single executable task

Connect and unlock the review iPhone, open the installed CITYWALK Development Client, and record its build/profile/version/OS plus whether `ExpoStoreReview` is present. This is the next read-only device acceptance step. If the module is absent, return that exact evidence and request approval for one compatible native rebuild; do not attempt a Metro-cache fix. Do not begin another feature or store submission.

## Final automated validation and diff audit

Final source digest: `dabce61609b820b25467d8a49f34c3a09315a61845768a26b59632773543f11b` (**138 source/config/test/asset paths**, including untracked files and explicit deletes), at HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2`. The completed Web/shared run precedes only the native lint correction; its tested Web/shared sources are unchanged. Mobile full tests/typecheck/lint were repeated after that correction. The manifest is the final source identity.

| Final gate | Exact result | Evidence |
| --- | --- | --- |
| Full Web + shared tests | **868 passed / 140 files; 22 DB tests skipped / 5 files**; 221.47 s; exit 0 | `npm run test:run -- --maxWorkers=2`; `<local-only temporary artifact>` |
| Full mobile tests | **349 passed / 47 files**, no skipped/failed tests or unhandled errors; exit 0 | `npm --prefix mobile run test:run -- --maxWorkers=2`; `<local-only temporary artifact>` |
| Dictionary CI gate | **432 keys each: DE/EN/DA/SV/NL/ES/AR; 0 errors** | `npm run i18n:check`; `<local-only temporary artifact>` |
| Affected isolated DB integration | **11 passed / 2 files** (CMS 5, city-content 6), 10.39 s | New loopback DB, committed migrations, required canonical fixture, `CMS_DB_INTEGRATION=1 CITY_CONTENT_DB_INTEGRATION=1` and Vitest `--maxWorkers=1`; `<local-only temporary artifact>` |
| Mobile TypeScript | PASS | `npm --prefix mobile run typecheck`; `<local-only temporary artifact>` |
| Web/shared TypeScript | PASS | `node node_modules/typescript/bin/tsc --noEmit`; `<local-only temporary artifact>` |
| Standalone i18n TypeScript | PASS | `node node_modules/typescript/bin/tsc --project packages/i18n/tsconfig.json`; `<local-only temporary artifact>` |
| Mobile lint | PASS, zero warnings | `npm --prefix mobile run lint`; `<local-only temporary artifact>` |
| Web/shared lint | PASS | `npm run lint`; `<local-only temporary artifact>` |
| Whitespace/diff | PASS | `git diff --check` |
| Production/native build, export, Expo cloud, store submission | NOT RUN — explicitly prohibited | No artifact/acceptance claim |

The other **11 DB tests** (media/commerce/knowledge) were not re-run: this slice changed no corresponding DB implementation. Historical 22-test DB results remain historical. CMS/content integration was appropriate because the preserved local i18n work changes the canonical importer and public localization resolver. Both temporary audit databases were removed; no existing local/Preview/production database was seeded/imported/changed.

Rerun transparency:

- Earlier interrupted launches provide no current result. No orphaned old Vitest run was found during the final process audit.
- Focused iterations exposed ambiguous DE/NL title queries, the now-optional feedback action missing from the flow test, and a dynamic AsyncStorage mock-initialization timeout. These were corrected; the existing mandatory AsyncStorage dependency now uses a normal static import. Test assertions were not weakened and timeout thresholds were not increased.
- First complete mobile pass: 349/47; first mobile lint found synchronous state update in an effect and duplicate imports. Replaced the effect with guarded derived-state preservation and removed the duplicate import; full mobile tests, TypeScript and lint re-run green (349/47).
- First disposable DB attempt: 6 passed / 5 failed because the required canonical Lübeck fixture was missing. The temporary database was removed. A new database with the existing canonical fixture passed all 11; no product code or publication safety rule was changed to force success.
- The root suite's existing Vite config/plugin migration advisories remain warnings, not test failures. No suppressed/unhandled error is counted as a pass.

### Final status / files not to commit

`git status`: **82 modified tracked files, 10 tracked deletions, 59 untracked files; none staged**. `git diff --stat` (tracked changes only): **92 files, 1,350 insertions, 2,209 deletions**. The source manifest includes untracked implementation paths that this stat omits. All earlier local work is preserved.

Changed/untracked-path audit found no secret-pattern candidates, signing credentials, `.env.local`, native build archives or generated-build directories. `.env.example` is the only changed environment-file candidate; its two public review URLs are deliberately empty. This is a diff/pattern audit, not an assertion that ignored local secrets do not exist.

**Do not commit:** existing ignored `.env.local`, `.next/`, `mobile/.expo/`, `mobile/ios/`, `mobile/android/`, temporary logs/database helpers, device/signing artifacts or prior IPA/APK files. None is staged or part of this source manifest. No new debug instrumentation was added; earlier opt-in development tab diagnostics remain part of the preserved native work and should be reviewed with that commit group.

The source is ready for scoped code review/proposed grouping, **not native release acceptance**. Commit/push permission remains withheld; this report does not authorize a build or publication.
