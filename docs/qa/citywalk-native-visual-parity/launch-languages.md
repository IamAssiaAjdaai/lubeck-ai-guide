# Launch languages and native public reviews

Implementation: Commit 1 `c23b0eb6e10321a2e8c5e89d1d5e9f737dde90bd` on `fix/citywalk-native-device-acceptance`. This report separates current static UI support from dated content audits; no push/build/deployment or release acceptance is claimed.

## UI gate

**440 static UI keys per locale** in the validated checkpoint, including review and empty-walk recovery copy. Official launch scope is exactly **de / en / da / sv / nl / es**. All six dictionaries have zero missing/empty keys and matching interpolation placeholders. Arabic also has all 440 keys and retains RTL, outside the launch-completeness gate.

One native header selector shows **Deutsch, English, Dansk, Svenska, Nederlands, Español**, in that order, using full labels. Its menu scrolls on short screens. Development additionally exposes العربية; production does not. Arabic dictionaries, locale support, native name shims and RTL rendering are retained. All six launch locales are LTR.

Web continues to support all **27** locales. The seven shared locales (six launch + AR) use `packages/i18n`; **20** legacy Web dictionaries remain. DA/SV/NL/ES legacy static dictionaries were removed only after their keys were migrated. Account/checkout UI uses shared translations. Untranslated City Pass product editorial copy remains English with separate, truthful language metadata; no new editorial copy was fabricated.

## Published content coverage

Audited **2026-09-25T17:23:59.160Z**, read-only, against the restored develop Preview. The raw local audit artifact is held out of this commit because its summary-based audio counts are invalid; dated prose coverage is summarized below. Scope is the publicly served **Lübeck catalog**, not unpublished CMS drafts or nationwide city coverage. Exact requested locale plus a nonempty field is required; fallback content never counts as translated.

| Locale | UI keys | Missing UI keys | Lübeck: city names; place names / summaries / stories; tours title / description; audio | Launch status |
| --- | ---: | ---: | --- | --- |
| de | 440 | 0 | City 1/1; places 25/25 · 25/25 · 5/25; tours 1/1 · 1/1; audio not established by summary | UI READY; content PARTIAL; device review pending |
| en | 440 | 0 | City 1/1; places 25/25 · 25/25 · 5/25; tours 1/1 · 1/1; audio not established by summary | UI READY; content PARTIAL; device review pending |
| da | 440 | 0 | City 0/1; places 5/25 · 5/25 · 5/25; tours 1/1 · 1/1; audio not established by summary | UI READY; content PARTIAL; device review pending |
| sv | 440 | 0 | City 0/1; places 5/25 · 5/25 · 5/25; tours 1/1 · 1/1; audio not established by summary | UI READY; content PARTIAL; device review pending |
| nl | 440 | 0 | City 0/1; places 5/25 · 5/25 · 5/25; tours 1/1 · 1/1; audio not established by summary | UI READY; content PARTIAL; device review pending |
| es | 440 | 0 | City 0/1; places 5/25 · 5/25 · 5/25; tours 1/1 · 1/1; audio not established by summary | UI READY; content PARTIAL; device review pending |

All six city summaries are missing (**0/1 each**). DE/EN have an exact city name; DA/SV/NL/ES city records fall back to English. Tour description coverage measures `shortDescription`; the published values are short “Walking Tour” labels, not evidence of a complete long-form tour narrative. There is no separate long tour-story field in this public response.

Exact-English Holstentor audio was independently observed through Place Detail, delivered and decoded, then heard by the owner on iPhone. The sampled German Holstentor detail had no exact-German attachment. Summary DTOs intentionally omit place/tour audio: they cannot establish 0/25, 1/25 or whole-catalog audio completeness. Other places/locales require an authorized detail-level audit. See [dated media/audio evidence](managed-media-diagnosis.md).

### Missing records

The same twenty places have no published story in **any** of the six locales. DA/SV/NL/ES additionally lack names and summaries for these twenty (English fallback is served):

- `lubecker-altstadt`
- `europaeisches-hansemuseum`
- `st-petri-zu-luebeck`
- `luebecker-dom`
- `willy-brandt-haus`
- `an-der-obertrave`
- `salzspeicher`
- `fuechtingshof`
- `dunkelgruener-gang`
- `kalandsgang`
- `malerwinkel`
- `buergergaerten`
- `cafe-niederegger`
- `schiffergesellschaft`
- `fangfrisch`
- `restaurant-vai`
- `brauberger-zu-luebeck`
- `zaubertheater-luebeck`
- `kolk-17`
- `final-escape-luebeck`

DE/EN have no missing place names or summaries. The five authored-story places in all six are `holstentor`, `marienkirche`, `rathaus`, `heiligen-geist-hospital`, `buddenbrookhaus`. Missing city: `lubeck` localization in DA/SV/NL/ES; missing city summary: `lubeck` in every locale. No tour titles or short descriptions are missing. Audio inventory outside the separately checked Holstentor locale pair remains unverified by this summary audit.

Content coverage is partial. An empty story does not mean a place has no readable summary. #111/#74 own editorial readiness and a realistic key-stop DE/EN audio baseline; 25 recordings in every launch language are NOT a new beta gate. Dictionary completeness does not establish linguistic quality, physical rendering or whole-language launch approval.

The summary-based audit script and its JSON output remain local, unstaged work requiring correction before they can be used for audio coverage. No new content requests or publication occurred during this documentation review.

## Native public review flow — reconciled 2026-09-25

- Expo SDK 57-compatible `expo-store-review` 57.0.3 is a local dependency addition, not proof the installed binary contains it.
- Finish requests a native review after two distinct explicitly visited stops and a two-second settling period, only while focused/foreground. Skipped stops are never added to the visited list. Manual visited state is not GPS arrival proof.
- Configurable application policy: three additional unique completed walks OR 30 days since the last attempt. All unique completed walks count toward the interval, but the current prompting walk must itself have two distinct visited stops. Reopening Finish does not increment the ledger; a previously attempted journey is never requested again. Serialized storage records attempts before entering native code; unreadable/unwritable history suppresses requests.
- No custom preprompt, rating screening, automatic redirect or submitted-review claim. Native errors and OS suppression are silent. Private feedback retains its local storage semantics and is now revealed only by the separate optional feedback action after the automatic opportunity settles; it never affects eligibility.
- The independent explicit store link appears only with an approved configured HTTPS listing. A tap opens that URL only; it never invokes native review or modifies automatic eligibility. Both `.env.example` values remain empty: `EXPO_PUBLIC_IOS_APP_STORE_URL`, `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL`. Android validates `com.citywalk.app`; iOS requires an explicitly supplied numeric production listing. No values are inferred.
- Native module presence in the installed Development Client is **unverified**: no connected iPhone was detected in the current audit. The earlier source snapshot lacks the new dependency. A compatible native rebuild requires separate approval, not a Metro reset. No build here.
- TestFlight dialog suppression is expected. Android real review integration needs a Google Play internal/closed test install, eligible tester account and actual Play services; an arbitrary sideloaded APK or mock is not equivalent.
- Official references: [Expo 57 StoreReview](https://docs.expo.dev/versions/v57.0.0/sdk/storereview/), [Apple StoreKit review timing](https://developer.apple.com/documentation/storekit/requesting-app-store-reviews), [Google Play test guidance](https://developer.android.com/guide/playcore/in-app-review/test). Application policy is not an OS quota guarantee.

## Preference integration

AsyncStorage persists the user's choice with serialized writes; late hydration cannot override a newer selection. The existing runtime's Intl device locale resolves regional tags (for example `de-DE`, `nl-BE`, `es-MX`) to supported languages, unsupported tags to English. No additional locale native dependency. The provider does not re-key navigation or write walk/saved storage. Walk retains its mounted state and last known same-city data during a locale content refresh, including error recovery, so a saved route cannot be silently restarted. Arabic support/RTL stays intact. German persistence after reopening and preserving the active walk across launch-locale changes were owner-confirmed. Other OS-locale/long-label scenarios remain scoped physical checks.

## Mobile layout risk audit

| Area | Audit / targeted change | Physical check still required |
| --- | --- | --- |
| Bottom tabs | Concise localized labels; later responsive native changes allow wrapping/growth without auto-shrinking | All five tabs at 320/375/390 px and large accessibility text |
| Buttons / cards | Shared concise action copy; no aggressive shrinking added. Existing full-width/wrapping controls retained | DE membership labels, SV remove action, DA/SV Ask, ES saved/remove labels |
| Planner choices | Short walking-style labels; questions and return-by copy fully translated | Two-column time cards, interest chips, start/end options and German return-by labels |
| Language modal / sheets | Full six language names in one scrollable menu; AR remains development-only | Small screens/landscape, safe areas, large text, route-change sheet actions |
| Finish / public review | Separate public card; public action uses `wrapLabel`. Private feedback is independent | Finish metrics, longer DE/SV labels; configured fallback CTA; native OS dialog on supported builds |

The native render bridge covers selection of every launch locale and a full planner/preview/start flow in all seven supported locales. It cannot measure native glyph widths or establish physical visual acceptance. No new screenshots or native API dialog success are claimed.

## Exact files added in this follow-up

- `packages/i18n/src/locales/da.json`
- `packages/i18n/src/locales/sv.json`
- `packages/i18n/src/locales/nl.json`
- `packages/i18n/src/locales/es.json`
- `packages/i18n/src/launch-locales.json`
- `packages/i18n/scripts/check.mjs`
- `packages/i18n/src/ci-check.test.ts`
- `mobile/src/lib/storeReview.ts`
- `mobile/src/components/PublicStoreReview.tsx`
- `mobile/tests/store-review.test.ts`
- `mobile/tests/public-store-review.test.tsx`
- `mobile/tests/launch-locale-selector.test.tsx`
- `docs/qa/citywalk-native-visual-parity/launch-languages.md`

Registration, dictionaries EN/DE/AR, translator tests, native selector/Finish, Web locale bridge/paywall, package scripts/mobile dependency lock, `.env.example`, CI and existing QA/architecture documentation were updated. No duplicate mobile DA/SV/NL/ES dictionaries. No CMS imports or writes, schema migrations, routing/business-planner changes, or media/audio-trust changes.

## Validation

See [the reviewed checkpoint](reviewed-checkpoint.md) for final integration and staged-source checks, and the [ledger](README.md) for dated device evidence. Earlier counts in other reports are historical.
