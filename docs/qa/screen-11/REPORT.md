# Screen 11 — Place Detail

27 October 2026. Local implementation awaiting visual approval. No commit, push, merge or deployment.

## Scope and baseline

Existing isolated worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, branch `codex/onboarding-global-welcome`, HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Read-only remote preflight: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`. Existing stacked uncommitted work preserved. `frozen-sources.sha256` and `logs/frozen-sources.log` confirm every pre-existing mobile source except the scoped detail route remains unchanged, including approved Screens 01–10 and shared components.

Mobile Core required. iOS simulator implementation/evidence supplied. Android shared implementation and bundle export verified; Android device acceptance unverified. Public Web and Admin Web are unchanged and not part of this visual redesign.

## Audit and reuse

The existing detail route already owns public city/place retrieval and identity guards, guest local Save, current-walk membership/budget behavior, walking directions, trip navigation/completion, authored story/facts/visitor notes, verified source disclosures, Guide eligibility, exact-locale audio and Premium gating. These systems remain authoritative.

PublicPlace provides category, duration, pricing, operational status, content and media; it does not provide opening hours or a Nearby list. Operational status must not become an invented “Open now” claim. No Nearby or opening-hours UI was added. Known pricing values can be displayed; unknown pricing is omitted. No free-admission assertion was invented for Holstentor. Audio is an exact-locale attachment and remains gated by existing Premium access. Missing audio stays an honest compact notice; no fake audio navigation or player is shown.

The existing photo audit remains: 20 absent photos and four legacy assets with unverified provenance. The detail screen now reuses Explore’s approved public-media / exact matching bundled-photo policy rather than treating a legacy URL as licensed. Public detail-resolution variants are preferred where supplied. Holstentor uses the existing Christian Wolf CC BY-SA 3.0 DE derivative, including crop notice, original source and license links. Other missing/unverified photos use a category illustration and honest unavailable-photo copy. No photographs were downloaded, invented or borrowed from another place/city.

## Implementation and exact modified files

Production:

- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`: licensed hero/fallback, overlapping rounded editorial title panel, category and duration, truthful optional pricing, accessible labeled Save, full-width Add to Walk and separate Directions, functional Overview/Story/Audio section links only when content supports them, existing source disclosures and city-scoped Explore/City Hub exits. Retains the existing focused subflow without bottom tabs and native Back history. Large-text title adjusts its base size while retaining system scaling; content/actions wrap and scroll. Existing audio/story focus deep links, entitlement checks and trip controls preserved.
- `mobile/src/lib/placeDetailCopy.ts`: scoped interface copy for EN/DE and the existing DA/SV/NL/ES/AR locales. No authored POI content or backend taxonomy changes.

Tests:

- `mobile/tests/native-v2-regressions.test.tsx`: two mounted regressions for truthful section availability, actual Story scroll offsets and city-scoped exits.
- `mobile/tests/place-detail-p1.test.ts`: updated scoped presentation expectations for labeled Save and Overview.
- `mobile/tests/native-city-experience.test.ts`: updated editorial section order expectation.
- `mobile/tests/membership-screens.test.tsx`: updated detail-only layout expectations for the accessible 44pt, full-width labeled CTA; real shared walk-membership assertions retained.

Evidence only: this directory, including baseline source, isolated implementation patch, hashes, logs and screenshots. No shared component, API/schema, authentication, entitlement, purchase, availability, location handling, dependency or lockfile changes. City Pass remains €4.99/72h, one-time, no automatic renewal.

## Automated verification

| Gate | Actual result |
| --- | --- |
| Focused detail / navigation tests | 80 passed |
| Final complete mobile suite | 102 files / 888 passed |
| Mobile lint | passed, zero warnings |
| Mobile TypeScript | passed |
| iOS / Android / Web exports | passed, `/private/tmp/citywalk-screen11-final` |
| Root tests | 268 passed / 27 skipped files; 1,902 passed / 239 skipped tests |
| Root lint | zero errors, 15 existing warnings |
| Root TypeScript | passed |
| Root production build | passed with synthetic local auth and isolated local QA DB configuration |
| db:generate | passed, no schema drift |
| db:migrate / db:verify | passed on task-owned localhost:55604 only; 1 city / 25 places |
| Frozen approved sources / final source hashes | passed |
| git diff --check | passed |

Root/database gates preceded the last native-only accessibility-title sizing adjustment; complete mobile tests, lint, types and all platform exports were rerun afterward. Initial mobile failures were existing presentation assertions for the intentionally changed section order and button sizing; updated expectations pass without removing their behavior checks. Skipped root tests are not integration acceptance. No production data, imports, storage or credentials used.

Token contrast checks against off-white: Navy 15.15:1, Blue 6.47:1, muted text 4.70:1. Existing Save/action targets remain at least 44pt. These checks and simulator accessibility trees do not replace physical VoiceOver/TalkBack acceptance.

## Native verification and screenshots

Task-owned simulators, iOS26.5: iPhone17Pro 402×874pt and iPhoneSE 375×667pt.

Observed on the small iPhone: guest Save/Saved and Add/Remove independently change and restore state; Story scrolls to authored content; source disclosure opens; navigation from Hub and Explore opens Detail and native Back returns to its origin. The explicit City Hub link opens the selected city. Marienkirche uses the unavailable-photo fallback, not its unverified legacy image. English/German layouts and maximum German accessibility text were inspected, with controls reached by native accessibility scrolling. Temporary Save/walk mutations were undone; text size restored to normal.

Directions opens Apple Maps. Its location permission prompt was left untouched; live route calculation is unverified. Source/license links remain the existing MediaAttribution link implementation, backed by the existing attribution tests; external source page navigation was not newly exercised.

Captures:

- `screenshots/standard-before-en.png`
- `screenshots/standard-after-en.png`
- `screenshots/small-before-en.png`
- `screenshots/small-after-en.png`
- `screenshots/small-after-de.png`
- `screenshots/small-fallback-en.png`
- `screenshots/small-max-text-de.png`
- `screenshots/comparison.png` — storyboard crop, before and after at matched presentation sizes.

Standard iPhone English visuals were inspected. A separate standard-device German capture remains unverified: Simulator’s UI automation exposed no device accessibility tree for that window and coordinate input repeatedly failed with `windowNotFoundAtPosition`, including after centering/fitting the window. German and maximum German text were verified on the small iPhone. No simulated screenshot or unobserved pass is substituted for that missing capture.

## Remaining differences and limits

The storyboard’s illustrative 15-minute visit, “Historic Landmark,” opening status, free entry and audio duration are not substituted for real catalog data. Current Holstentor has category See, 30-minute visit and no attached EN/DE audio. Only Overview and Story navigation appear. The existing official header, focused detail navigation, licensed-photo attribution and distinct accessible walk/directions actions use more space than the reference. No bottom-tab architecture change was introduced.

Screenshots exercise the existing canonical code catalog, as in Screen 10; database-backed native catalog acceptance remains unverified. Real Premium audio playback, live Maps route calculation, physical assistive technology, Android device visuals and the standard German capture remain acceptance gaps. Bundle exports are not new native binary builds or store acceptance.

Stop for explicit Screen 11 visual approval. No Screen 12 work, commit, push, merge or deployment.
