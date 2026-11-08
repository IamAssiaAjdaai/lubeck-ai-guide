# Centralized mobile Image Credits — local implementation

7 November 2026. Branch `codex/centralized-image-credits`, worktree `/private/tmp/citywalk-image-credits`.
Stacked dependency: Draft PR [#456](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/456), exact base `d59b25b74502a9b6928543d79d44bd674231f20f`, verified with GitHub and remote refs. This delta must be reviewed against #456, not presented as a standalone develop-based application PR. No commits/pushes/merges/deployments.

## Implemented

- Reuses the existing guest Profile/settings → Legal screen → `/photo-credits` route; labels the legal surface **Legal & Information** and its credits entry **Image Credits / Bildnachweise**. No additional Settings or authentication system.
- Existing four-photo inventory, creators, original URLs, licenses, modification notices and asset records retained unchanged. Presentation labels and modification records now support EN/DE/ES/NL/DA/SV/AR rather than English fallback outside German. Original titles, proper names and legal identifiers remain original text.
- Source and license URLs are visibly listed, selectable, and open through existing native Linking, with recoverable error messaging. The screen remains scrollable, uses semantic headers/link roles, 44pt minimum link targets, font scaling and existing RTL presentation; URLs explicitly use LTR.
- City Hub **place-card** overlay removed for the exact verified Holstentor asset. A modest, adjacent, non-overlay credit link identifies the exact catalog entry. Explore uses the same presentation instead of a long bundled-photo paragraph. Place Detail and Published Active Walk retain their existing nearby catalog links.
- CMS media notices remain adjacent and unmodified. An identical-looking source/creator/license string is not sufficient to remove an unknown asset's attribution. No license-name-wide centralization rule.
- City hero, city selection, Welcome and route-card attribution controls remain intact; those are outside place-photo-only removal. Map-provider attribution remains untouched.
- No photography replacement, rights-metadata change, dependency change, navigation destination change, planner/execution logic, Auth, payments or runtimeVersion change.

## Individual terms and presentation decision

Sources checked 7 November 2026; these are engineering attribution decisions, not a new grant of rights.

| Reviewed photograph | Existing evidence | Presentation |
|---|---|---|
| Prague — Jean Paul Montanaro | [Original](https://www.pexels.com/photo/historic-prague-skyline-with-tyn-church-35286105/), [Pexels license](https://www.pexels.com/license/); bundled welcome license inventory | Attribution optional under those terms; voluntary catalog retained. No Prague place image substituted. |
| Hamburg — Avda | [Original](https://commons.wikimedia.org/wiki/File:Hamburg_-_Elbphilharmonie_-_2016-2.jpg), [CC BY-SA 3.0 legal code §4](https://creativecommons.org/licenses/by-sa/3.0/legalcode) | Author/title/source/license/modification notices retained centrally and existing city/onboarding controls retained. ShareAlike notice remains. No Hamburg place-photo notice removed. |
| Düsseldorf — Turmfalke | [Original and historical Pixabay CC0 publication record](https://commons.wikimedia.org/wiki/File:Rheinturm,_Duesseldorf.jpg), [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | Voluntary catalog retained; no attribution-required claim invented. No Düsseldorf place photo substituted. |
| Holstentor — Christian Wolf (www.c-w-design.de) | [Original and specified attribution](https://commons.wikimedia.org/wiki/File:Holstentor_in_L%C3%BCbeck_Frontseite.jpg), [CC BY-SA 3.0 DE legal code](https://creativecommons.org/licenses/by-sa/3.0/de/legalcode), existing `introduction-photos.LICENSE.md` and `welcome-holstentor.LICENSE.md` | Reasonable-medium attribution with author/title/source/license/modification notices in catalog, reachable from adjacent exact-image link and guest Legal. Only the overlay is removed, not attribution access. ShareAlike retained. |
| Unreviewed CMS/public media | Public DTO exposes free-form attribution text and optional creator, not an independently verified license-placement contract | Preserve full existing adjacent notices and links. Do not infer permission to centralize from CMS publication or a recognizable license name. |

No reviewed photograph's source record imposes a newly identified mandatory on-image overlay. Unknown/ambiguous records remain adjacent pending individual review; moving every image's attribution into Legal alone is NOT asserted sufficient.

## Release blockers / completeness

**The catalog covers the four verified photographs, not a certified complete release manifest. Do not claim all release imagery is cleared.**

1. Final release CMS asset manifest is unavailable in this checkout. Runtime approved/public media can differ by city, locale and publication. Obtain the exact release image set with asset identity, original source, rights holder, license and modification/placement requirements; reconcile it to the catalog before release. Public attribution text alone is insufficient to invent structured metadata. No backend contract changed to work around this.
2. Legacy `/landmarks/marienkirche.jpg`, `rathaus.jpg`, `heiligen-geist-hospital.jpg`, `buddenbrookhaus.jpg` lack verified source/license records in the reviewed inventory. Explore intentionally suppresses legacy imagery without verified provenance, but City Hub still uses legacy `place.image`/variants and fallback paths. Rights clearance or a separately approved suppression/replacement is required before shipping those paths. This change does not silently remove existing images or declare them licensed.
3. Bundled `home-holstentor.jpg`, `home-multicity-approved.webp`, and `city-hub-lubeck-approved.webp` have no matching record in the reviewed four-photo inventory; Home / ImageOverlayHero reference them. Determine provenance and whether they are photos, generated/reference artwork or owned work. A name containing "approved" is not evidence of rights. Do not assign Christian Wolf's license by appearance or filename.
4. `citywalk-waterfront.webp` is documented as generated decorative illustration in `docs/qa/citywalk-v2/README.md`, not factual city photography. It is not relabeled as a licensed photograph. Preserve that distinction and include artwork ownership/creation records in the final release inventory.
5. Missing POI images remain placeholders in Explore; do not create credits for absent imagery. The historical 20-missing-photo finding does not certify the current release CMS snapshot.
6. Native iOS/Android visual, maximum text, RTL scrolling and VoiceOver/TalkBack acceptance are pending. No simulator was booted during the availability check. Automated DOM mocks are not native accessibility acceptance. Translation owner review is also pending.
7. PR #456 integration/native acceptance and the separate Expo patch/native-client/OTA gates remain external dependencies. This branch does not absorb PR #459 or change runtimeVersion.

## Verification

- Focused attribution/legal/navigation tests: see final handoff for count; includes all seven locales, all inventory fields, original/license linking, failure recovery, exact entry selection, no invented placeholder credits, unknown CMS preservation, and rejection of a different license at a matching source.
- Full mobile suite: 1,133 ordinary passes, 1 pre-existing expected failure, 17 TODOs; 116 suites passed, 1 skipped. Subsequent added localization-only cases run in focused suite separately.
- Mobile TypeScript, lint, 7-locale × 681-key localization validator: passed. Feature-specific localization coverage is in the focused tests (outside shared 681-key dictionary).
- iOS and Android Hermes bundle exports: passed, output `/private/tmp/citywalk-image-credits-export`. Bundle success is not native acceptance.
- `git diff --check`: passed. Full patch and file manifest available in the local handoff artifact directory.
- Root build/database checks not run: mobile presentation-only delta, no backend/schema/contracts; no production DB accessed.

## Exact change boundary

Production: `mobile/src/app/city/[citySlug]/explore.tsx`, `mobile/src/app/city/[citySlug]/index.tsx`, `mobile/src/app/legal.tsx`, `mobile/src/app/photo-credits.tsx`, `mobile/src/app/profile.tsx`, `mobile/src/lib/photoCredits.ts`, new `mobile/src/lib/photoCreditsCopy.ts`, new `mobile/src/components/PlacePhotoCredit.tsx`.

Tests: `mobile/tests/native-legal.test.ts`, `mobile/tests/native-v2-regressions.test.tsx` (only old label → new label), `mobile/tests/photo-credits.test.tsx`, new `mobile/tests/place-photo-credit.test.tsx`. No assertion or case deleted to bypass a failure; legal label assertion now checks the new localized label and retains destination checks.

Documentation: this report only. Previously approved layouts otherwise preserved. Owner visual acceptance and release rights reconciliation remain required.
