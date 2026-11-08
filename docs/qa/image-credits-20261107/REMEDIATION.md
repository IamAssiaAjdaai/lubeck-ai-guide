# CITYWALK P0 Image Rights — local remediation

7 November 2026. Target release: 16 November 2026.

**Local verdict: PASS for quarantined-byte exclusion and bundled-image retention. CMS imagery remains blocked. This is not store/native-device or release approval.**

Branch `codex/centralized-image-credits`; unchanged base `d59b25b74502a9b6928543d79d44bd674231f20f` (PR #456). Builds remain stacked on #456; do not present this as a standalone develop patch. Previous centralized credits UI is preserved; this report distinguishes the incremental remediation from that existing local patch.

## Exact image changes

The five unresolved legacy photographs are:

- `public/landmarks/holstentor.jpg`
- `public/landmarks/marienkirche.jpg`
- `public/landmarks/rathaus.jpg`
- `public/landmarks/heiligen-geist-hospital.jpg`
- `public/landmarks/buddenbrookhaus.jpg`

Their bytes remain in Git/working-tree history, but native consumers no longer select their URLs or transformed variants; native `.easignore` rules exclude them from the intended source archive.

- Home's `mobile/assets/images/home-holstentor.jpg` is replaced at the usage/import level by existing verified `introduction-holstentor.jpg`. Old hash `22257df1777b146f93c6a4bd6a79fa1e8960630263822ec9a01dd13c4a0a75e3` → reused verified hash `fb949c64783b0c8ec5048c71c7bed7671c4e40f7dc4d1df5d1e852f984aece83`. No replacement file was generated and no existing image bytes were edited.
- `mobile/assets/images/home-multicity-approved.webp` is hidden: its static import and rendered image are removed. Original hash `6d9d8bc2d18f62cdc023ae9ffc36cda503ff92023017aba33b7dd88458530011` → **absent from both exports**. Existing hero dimensions, sky/scrim, typography, copy, controls and navigation remain; this is the explicitly requested photo removal, not a new design.
- Additional unresolved rasters `mobile/assets/images/city-hub-lubeck-approved.webp` (`5910cc59d4219839ed947ce8e1b799027ee6d399a74d3dad2faed50b8286c429`) and `mobile/assets/images/citywalk-hero.png` (`c0674ba03232a8047fa11631af3a5362e347fcdc1a6e9401f03083fbf44494fc`) are absent from both exports and excluded by source-archive rules. The latent editorial hero reference is removed; existing documented decorative waterfront artwork is used there instead. The other raster has no mobile reference.
- Byte scan additionally identified `public/images/citywalk-hero.png`, identical to the unresolved mobile raster. Its native source-archive copy is also excluded. No Public Web source file or image was deleted/changed.
- Total: **10 quarantined paths / 8 distinct SHA-256 identities** excluded by archive rules; **zero matches** in either platform's exported asset bytes.

Complete exact before/after hashes: `before-after-assets.csv`; machine export/source-rule evidence: `package-verification.json`. “ABSENT” describes the export/package boundary, not deletion or rights clearance.

## Photo-selection boundary and affected screens

New `mobile/src/lib/releasePhotography.ts` is a deliberately closed native release gate. Without an owner-approved hashed manifest it returns no CMS/legacy image or variant, including cached DTOs and publication/creator/license-looking strings. There is no environment/settings bypass or fabricated manifest. Generic API media helpers, DTOs and exact-locale audio selection are unchanged; the latter is re-exported unchanged. This does not implement a manifest approval/import system.

Every native primary-image selector now uses that gate. Direct Home and custom-itinerary legacy/error fallback paths are removed. Static-import tests reject quarantined filenames and **content hashes**, catching reintroduction under another relative filename. Metadata and license records are not changed.

| Surface | Result |
|---|---|
| Ordinary Home | Verified Holstentor city card; licensed Hamburg/Düsseldorf cards retained; unverified composite hidden; existing global credits access retained. No city launch flags change. |
| S04 Choose City | Existing verified bundled city photos retained; dynamic CMS image selection blocked. Guest access, search, location and availability unchanged. |
| S08 First Experience | Matching verified Lübeck image remains; other selected cities get the existing placeholder rather than unfrozen CMS imagery. Selections/navigation/footer unchanged. |
| S09 City Hub | Hero/place/suggested-walk imagery uses verified matching bundled photo or existing placeholder; no legacy primary/error fallback. Credit access retained. |
| S10 Explore / S11 Place Detail | Verified matching Holstentor image or existing premium category placeholder. CMS images blocked; existing catalog/detail/attribution UI unchanged. |
| S12 Walking Routes / S13 Published Preview / S14 Published Active Walk | Existing shared presentation helpers use a verified matching stop photograph or existing no-photo state. Titles, geometry/progress/controls and execution models unchanged. |
| Custom planner preview/itinerary/execution rows | Verified Holstentor or existing dimension-preserving placeholder. Required exact-image credit link is a sibling of the place action, not a nested interactive element. No duration, planner state, storage or navigation logic changes. |
| S01–S03, S05–S07 | Existing approved photography/artwork/layout unchanged. |

All **20 canonical POIs without static photographs** retain missing-photo/placeholder behavior; no generic landmark is substituted for another place. No authentication, payments, runtimeVersion, dependency, API/backend or production CMS change.

## Retained verified images and legal conditions

Both exports retain the original seven bundled photo files with unchanged hashes (see `package-verification.json`): `welcome-prague.webp`, `welcome-hamburg.webp`, `welcome-duesseldorf.webp`, `welcome-holstentor.webp`, `home-hamburg.webp`, `home-duesseldorf.webp`, `introduction-holstentor.jpg`.

- Jean Paul Montanaro / Prague: existing Pexels source and license retained, voluntary attribution.
- Avda / Hamburg: exact CC BY-SA 3.0 author/title/source/license/modification record retained; derivative ShareAlike notice remains.
- Turmfalke / Düsseldorf: historical CC0 source/publication evidence retained; voluntary credit remains.
- Christian Wolf (www.c-w-design.de) / Holstentor: exact CC BY-SA 3.0 DE author/title/source/license/modification record and derivative ShareAlike notice retained. Home links to the existing full catalog; city selection retains its credit control; place/custom itinerary photos have exact-image catalog access.

Centralized Image Credits remains guest-accessible and localized in all seven launch languages. No required notice is removed from a rendered image; CMS notices are retained in component code for a later separately approved manifest integration. Provider map attribution and system icon usage are untouched. Reusing a verified photograph does not license a different same-place image.

License evidence remains in `mobile/assets/images/*.LICENSE.md` and `mobile/src/lib/photoCredits.ts`; the earlier P0 report links the primary terms/source pages. No new license or copyright assignment is asserted. Required attribution, source/license access, modification and ShareAlike notices must remain with final distribution.

## Verification and limitations

- Focused rights/photo/navigation/localization regression suites: **77 passed / 7 suites**. Tests include all four image purposes, all four variants, CMS/cached/legacy rejection, exact-locale audio preservation, static-import/hash denial, archive exclusions, verified replacement/credits, all 20 missing-photo identities, seven-language catalog links and guest city entry.
- Full mobile: **1,152 ordinary passes; 1 existing expected failure; 17 TODOs; 117 suites passed, 1 skipped**. No test skipped/deleted or expected-failure classification changed for this work.
- Mobile TypeScript, lint, localization (7 × 681 keys), `git diff --check`: **PASS**.
- iOS + Android Hermes exports: **PASS**, output `/private/tmp/citywalk-rights-remediated-export`. Asset counts: **48 iOS / 52 Android**. All seven verified bundled photographs present by byte hash; all eight denied identities absent.
- EAS source-archive policy: existing ignore matcher confirms all ten matching tracked source copies are excluded and verified bundled photos are not denied. This is local rule verification, **not a cloud archive upload/build or signed APK/IPA inspection**.
- Generic image-delivery fallback tests remain unchanged. Existing image expectations in five test files were migrated where they explicitly required the now-forbidden CMS/legacy/composite presentation; navigation/city/interaction assertions remain. Stronger replacement expectations require the exact verified filename or no image, rather than accepting the unverified URI.
- Prior tests/exports were not repeated for unrelated root/backend/database behavior. No schema/backend changes or DB access.
- No new simulator, physical-device, VoiceOver/TalkBack, store-binary or OTA acceptance is claimed. Final unsigned exports are not native acceptance. Existing installed binaries and public Web/backend responses are not remotely remediated by this local patch.

## Remaining CMS / release gates

1. Dynamic CMS image display is **intentionally disabled**, even if production publishes images. Re-enabling requires owner-approved deterministic manifest digest with immutable asset/variant hashes, creator/source/license or permission, modifications, every consuming placement, and rights-review evidence. Do not infer clearance from `approved/public` or free-form attribution.
2. Final November 16 CMS snapshot, exact production deployment → database/storage mapping and effective release binary/profile still require owner/operator approval. Intended production remains `https://getcitywalk.com`; preview is not a substitute. No origin changed.
3. An authorized city-scoped media reviewer/operator must supply the sanitized manifest without account records, actor IDs, private object keys, credentials or confidential evidence text. No private export was performed.
4. Final native source archive/signed binary and manual visual/accessibility checks remain release gates. No upload, distribution or release is authorized here.
5. Public Web and the existing backend still retain legacy source paths; no Web/backend rights-closure claim is made. The exclusion is for the intended **native** package/display boundary. If those Web surfaces are included in the release scope, their separate rights remediation/approval remains necessary.

## Scope and preservation

No image file deleted, rewritten or relicensed. All original versions remain available in Git/working tree; source-archive exclusion does not delete history. Existing credits work preserved, except its City Hub file receives the scoped release selector/fallback correction. Exact incremental/cumulative patch and file manifest are included in the handoff artifacts. No commit, push, merge, deployment, OTA, store submission or remote data change.
