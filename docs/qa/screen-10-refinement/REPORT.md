# Screen 10 visual refinement — 27 October 2026

Local, uncommitted work on `codex/onboarding-global-welcome`, HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Live read-only refs: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main `88191e77e55a489804c49bccccf6307b5876b41d`. No integration or deployment. Existing stacked work preserved.

## Scope and files

Mobile Core required; iOS simulator verified, Android shared implementation/export verified but device acceptance remains unverified. Public Web unchanged; Admin not applicable.

- `mobile/src/app/city/[citySlug]/explore.tsx`: scoped visual refinement only. Navy header uses one fluid title line at normal size and reduces vertical spacing (approximately 60pt shorter for the current English city). Search and category touch targets remain at least 44pt. Cards use larger 100×132 thumbnails, editorial names, clearer metadata, three-line descriptions at normal size, soft shadows instead of enclosing borders, and separate labeled Save and Add to Walk actions. Missing-photo placeholders use category icons and restrained map-like lines, never substitute photographs. Large-text cards stack and release text clamps. No photo info icon was reintroduced; existing caption source/license links remain.
- `mobile/tests/explore-p1.test.ts`: existing presentation check follows the reused labeled discovery-card membership variant.
- Evidence only: this directory, including baseline source text, source hashes, isolated patch, frozen-source hashes, screenshots and logs.

No changes to approved Screens 01–09 or their shared components. Frozen-source checks pass. No new data store, API/schema, navigation destination, city activation, authentication, purchase or location system. Existing city-scoped actions, Slot crash fix, guest access, localization, native map and saving contracts retained. City Pass remains €4.99/72h, one-time, no automatic renewal.

## Photo audit

Rechecked the existing 25-row audit against canonical POI declarations, available landmark files and existing license metadata. Twenty POIs lack photographs. Four legacy assets remain unverified: Marienkirche, Rathaus, Heiligen-Geist-Hospital and Buddenbrookhaus. Existing matching Holstentor derivative retains Christian Wolf attribution, crop notice, Wikimedia Commons source and CC BY-SA 3.0 DE license link. Approved public media still takes precedence. No content/import or image changes.

## Verification

- Mobile tests: 102 files / 886 passed.
- Root tests: 268 passed / 27 skipped files; 1,902 passed / 239 skipped tests. Skips are not integration acceptance.
- Mobile lint: passed, zero warnings. Root lint: zero errors, 15 existing warnings.
- Mobile and root TypeScript: passed.
- Root production build: passed using synthetic local Better Auth configuration and the existing task-owned localhost:55604 QA database. Initial run lacked DATABASE_URL; rerun with the isolated local configuration passed.
- Expo iOS/Android/Web exports: passed, `/private/tmp/citywalk-screen10-refinement-final`. Bundle builds, not new native binaries.
- db:generate: passed, no drift. db:migrate and db:verify: passed on task-owned localhost:55604 only, 1 city / 25 places. No seed/import performed.
- Frozen approved-source checks and git diff --check: passed. No dependencies, lockfiles, secrets or production infrastructure changed.

Native checks on task-owned iPhone 17 Pro (402×874pt) and iPhone SE (375×667pt), iOS26.5: initial viewport, English/German, distinct guest Save and Add/remove controls, search route with keyboard and Back, Eat filter yielding 5 places, Map/List retaining the category, and scroll access to the photo card/attribution. Maximum German accessibility text stacks cards and keeps actions reachable through native accessibility scrolling. Test save/walk changes undone; small simulator restored to normal text and English. Captures use existing canonical code catalog because database-backed native catalog acceptance was already unavailable; no new database-backed runtime claim.

## Visual comparison and remaining differences

See `screenshots/standard-comparison.png`: storyboard crop, previous and refined standard simulator at matched presentation sizes. The historical baseline includes the earlier photo info icon; that icon remains removed in this refinement. The storyboard's illustrative four-photo density cannot be reproduced honestly with current media coverage. The official approved logo/header, existing five tabs, real visit durations and labeled 44pt actions use more space than the storyboard. Missing photos retain polished placeholders. At maximum German text, substantial scrolling and the existing wrapped tab labels remain. Physical VoiceOver/TalkBack and Android device visuals remain unverified.

Screenshots: `standard-en.png`, `small-en.png`, `small-de.png`, `small-photo-en.png`, `small-max-text-de.png`. All under `screenshots/`.

Stop for explicit Screen 10 visual approval. No Screen 11, commit, push, merge or deployment.
