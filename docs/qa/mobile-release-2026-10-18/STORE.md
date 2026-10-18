# Draft store submission checklist and EN/DE copy

**DRAFT / NOT APPROVED / NOT SUBMITTED.** #128 and #129 remain open. This is an actionable preparation pack, not completion of keyword research or a screenshot set. No store console or production URL was accessed in this audit.

## Asset audit

| Item | Repository evidence | Remaining acceptance |
| --- | --- | --- |
| App icon | `mobile/assets/images/icon.png`, 1024×1024, no alpha; visual inspection shows navy map pin and teal path on light background | Human brand approval; inspect actual iOS icon masks/light/dark display and Android launcher |
| Adaptive icon | foreground/background/monochrome PNGs all 1024×1024; foreground/mono have alpha, background opaque | Android round/squircle/themed icon safe area and small-size legibility on actual launcher |
| Splash | expo-splash-screen uses icon, contain, width 168, background #FAFAF8 | Real cold start, Android 12+ splash behavior, iPhone/iPad; no blank frame/flash |
| Screenshots | Existing QA screenshots are historical Web evidence, not this candidate's store assets | Six real-build EN and DE frames per store; record device/build/SHA and editable master |
| Play feature graphic | No approved store-ready asset identified | Prepare approved 1024×500 graphic; verify current console requirements |
| Tablet | supportsTablet=true | Capture/QA enabled iPad family or explicitly scope out in separate change |

Use the [current Apple screenshot size table](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) for the device families the binary supports. Follow [Google's preview asset rules](https://support.google.com/googleplay/android-developer/answer/9866151) for phone screenshots, icon and feature graphic; validate in Console before eventual upload. Do not substitute generated UI or Web captures for native product evidence.

Screenshot story for #129 (EN / DE working copy):

1. Your city. Your time. Your walk. / Deine Stadt. Deine Zeit. Dein Rundgang. — actual route Preview with time/stops.
2. A walk built around you. / Ein Rundgang, der zu dir passt. — interests, duration, walking preference, start/end.
3. Plan your return time. / Plane deine Rückkehr. — Return-by + estimated ETA/buffer; avoid guaranteeing exact arrival.
4. Adapt your walk as you go. / Passe deinen Rundgang unterwegs an. — actual Shorten/Back controls.
5. Ask CITYWALK along the way. / Frag CITYWALK unterwegs. — supported verified question with visible attribution.
6. Stories worth stopping for. / Geschichten, für die sich ein Stopp lohnt. — actual Place + approved locale audio.

Use Lübeck as the current example while presenting CITYWALK as a city-guide platform. Do not imply other cities/content are launch-ready without content acceptance. Exclude private accounts, precise GPS, debug overlays, unsupported background/offline features, future Shareable Walks and paid-access promises. Store screenshot tests A/B/C from #129 remain future measured experiments, not a visual preference decision.

## Metadata hypotheses (requires ASO and product approval)

Apple EN name: **CITYWALK: City Guide**; subtitle: **Walks around your time**.
Apple DE name: **CITYWALK: Stadtführer**; subtitle: **Rundgänge nach deinem Plan**.
Names/subtitles are below #128's 30-character limits. EN keyword hypothesis: `travel,audio,sightseeing,planner,local,landmarks,itinerary,explore,route`; DE: `spaziergang,audioguide,sehenswürdigkeiten,geheimtipps,reise,ausflug,stadtplan,urlaub`.
Both keyword hypotheses are below 100 UTF-8 bytes; validate locale demand/competition and duplication with finalized visible copy. No search-volume/competition data was obtained, so keywords are unranked hypotheses. #128 competitor/data research remains open.

Google EN title: **CITYWALK: City Guide**; short: **Plan city walks around your time and interests. Start exploring in Lübeck.**
Google DE title: **CITYWALK: Stadtführer**; short: **Stadtrundgänge nach deiner Zeit und deinen Interessen. Starte in Lübeck.**

EN full-description draft:

> Explore a city at your own pace with CITYWALK. Start in Lübeck and build a walking route around your available time, interests and walking preferences. Preview your stops, choose your return time and adjust your walk as you go. Open place details, listen to available audio stories and ask the guide questions backed by verified local sources. Basic exploration works without an account. Sign in to save walks to your account. Location is optional; map and location features need device permissions and network availability. Audio coverage varies by language. More city experiences will be added as they are ready.

DE full-description draft:

> Entdecke eine Stadt in deinem Tempo mit CITYWALK. Starte in Lübeck und plane einen Rundgang passend zu deiner Zeit, deinen Interessen und deinem Gehtempo. Sieh dir die Stopps vorab an, lege eine Rückkehrzeit fest und passe deinen Rundgang unterwegs an. Entdecke Ortsdetails, höre verfügbare Audiogeschichten und stelle Fragen auf Basis geprüfter lokaler Quellen. Die grundlegende Erkundung ist ohne Konto möglich. Melde dich an, um Rundgänge in deinem Konto zu speichern. Die Standortfreigabe ist freiwillig; Karten- und Standortfunktionen benötigen passende Berechtigungen und eine Netzwerkverbindung. Die Audioauswahl hängt von der Sprache ab. Weitere Stadterlebnisse folgen, sobald sie bereit sind.

These drafts require comparison with the exact submitted feature-access policy; no unsupported free entitlement, offline download, background narration, social sharing or payment claims. Paid/native subscriptions are outside #387 initial launch scope.

## Privacy / Data Safety review inputs

Use `docs/legal/CITYWALK-DATA-INVENTORY.md` and `CITYWALK-STORE-PRIVACY-DRAFT.md` as the detailed implementation inventory. [Apple privacy guidance](https://developer.apple.com/app-store/app-privacy-details/) requires review of app and third-party practices; [Google Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469) must be answered for actual shipped behavior. This audit supplies no legal approval.

- Review name/email/account identifiers, saved walks and session metadata linked to accounts; AI questions/context sent to backend/Groq; pseudonymous visitor ID; optional consented analytics; support requests; purchase SDKs if active.
- Device-local GPS/feedback/history differs from off-device collection. Do not declare location uncollected without checking map/tile providers, logs and the exact binary's network behavior. No microphone/audio recording is intended.
- Confirm encryption in transit, retention/backups/provider DPAs, deletion handling + external erasure outbox and test-account purge. Provider retention is still unresolved in the existing draft inventory.
- Inspect final archive privacy manifests, required-reason APIs and SDK signatures against [Apple's SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/). A JavaScript dependency list does not establish archive compliance.
- Reconcile unnecessary generated native declarations (local network/Bonjour, Face ID, motion, Android overlay/external storage) with the final Release artifact and plugin configuration before submission. The local prebuild audit observed these; no permission-removal change was made here.

## Operator submission checklist (future authorization required)

- [ ] Confirm signed artifact ID, full candidate/backend SHA, version/build/versionCode, signature/architectures and SDK policy eligibility at submission time.
- [ ] Complete #33 native beta and #112 matrix with no Blocker/Critical, explicit Major decisions, field walk and crash sweep.
- [ ] Approve developer legal identity, copyright, categories, country availability, age/content ratings, export/encryption declaration and pricing/free-access policy. Existing `usesNonExemptEncryption=false` is config, not a reviewed legal determination.
- [ ] Verify real public HTTPS privacy, support, terms/imprint and deletion URLs; correct identity and working support contact. Mobile links are fixed to `https://getcitywalk.com/privacy`, `/terms`, `/imprint`, `/support`, `/account-deletion`; code existence is not live URL acceptance.
- [ ] Approve EN/DE metadata and screenshot masters, localization/accessibility declarations, iPad scope and Play graphic. Confirm all six launch languages are accurately represented.
- [ ] App Privacy and Data Safety signed off from actual network/provider evidence; validate web and in-app account deletion using test accounts only.
- [ ] Reviewer notes describe guest start, location optionality, network needs, exact-locale audio, test credentials delivered securely if needed, AI evidence/limits and inaccessible/disabled paid features.
- [ ] Verify Apple/Google identity providers and callback setup; reviewer can access intended features without live payment.
- [ ] Verify monitoring, incident owner, backend rollback/restore evidence, beta contact and app-access instructions. Native observability remains disabled; define approved crash evidence collection.
- [ ] Obtain separate explicit operator authorization for store uploads, review submission, release timing, production deployment and any launch-policy activation. Nothing here authorizes those actions.
