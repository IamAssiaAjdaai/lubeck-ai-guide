# Photo Credits / Screen 11 refinement

27 October 2026. Local uncommitted work in `codex/onboarding-global-welcome`, HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Read-only remote refs remain develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`. No commit, push, merge or deployment.

## Result

Screen 11’s long Holstentor attribution paragraph is removed. A small accessible Photo Credits / Bildnachweise link sits beside category/duration and opens that image’s complete record first. Hero dimensions, title, Save, Add/Remove, Directions, Overview and Story are preserved. Removing the separate paragraph brings the actions and content upward.

The existing guest legal route now uses its localized Photo Credits label. The existing central page covers four individually reviewed source photographs and known variants, including creator, exact title, original source, exact license/direct link, modifications, files and usage. EN/DE descriptions are supplied; existing localized credit titles remain supported. External-link failure is visible and retryable. No login, DB or CMS access is required for bundled credits.

The attached `AUDIT.md` documents exact licenses, source links, placement decisions and every affected presentation family. Only reviewed bundled Holstentor uses the compact-link policy on Screen 11. CMS credits remain inline; approved Screens 01–10 remain unchanged. No global attribution suppression, license guessing, new photos or asset/DB/CMS metadata changes.

## Exact changed code

- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`: scoped known-image credit link and conditional retention of unreviewed inline attribution.
- `mobile/src/app/legal.tsx`: localized label for the existing guest credits entry.
- `mobile/src/app/photo-credits.tsx`: extended guest catalog, image-specific ordering, accessible source/license links and error feedback.
- `mobile/src/lib/photoCredits.ts`: reviewed bundled-image registry with bilingual usage/modification descriptions, reusing existing source/license identities.
- `mobile/tests/photo-credits.test.tsx`: catalog completeness, exact license/source identity, EN/DE guest rendering, image ordering, link actions and link failure.
- `mobile/tests/native-v2-regressions.test.tsx`: actual detail route points to the exact centralized Holstentor entry without rendering the long paragraph.

Evidence only: this directory. Frozen approved-source hashes pass. Screens 01–10, routing/auth/guest logic, city availability, payments, imports, schema, assets and shared attribution components unchanged. City Pass remains €4.99/72 hours, one-time/no renewal.

## Actual verification

- Mobile: **103 files / 893 tests passed**.
- Mobile lint: passed, zero warnings. Mobile TypeScript: passed.
- Expo iOS/Android/Web exports: passed, `/private/tmp/citywalk-photo-credits` (bundle exports, not new native binaries).
- Root tests: **268 passed / 27 skipped files; 1,902 passed / 239 skipped tests**.
- Root lint: zero errors, 15 existing warnings. Root TypeScript and production build: passed with synthetic localhost-only auth/database configuration and canonical code content.
- db:generate: passed, no schema drift. db:migrate / db:verify not rerun: local Docker daemon is stopped (`logs/database-runtime.log`). No database mutation or schema change in this task.
- Frozen source checks, exact final source hashes and git diff --check: passed.

Native iOS26.5: standard iPhone17Pro 402×874pt and small iPhoneSE 375×667pt. Observed English refined Screen 11, German small Screen 11, guest Legal → Photo Credits, exact-image Detail → Credits, readable EN/DE attribution records and accessible heading/link names. The Holstentor license action opened its actual CC BY-SA 3.0 DE page in Safari. Every registered original-source/license URL was also checked against its authoritative source using web tools; exact handoff URLs and failure behavior are covered by tests.

Screenshots: `screen11-standard-en.png`, `screen11-small-de.png`, `credits-en.png`, `credits-de.png` / `credits-small-de.png`. Normal-text layouts reflow without horizontal clipping and credits remain scrollable. Physical screen-reader testing, Android device acceptance and maximum accessibility text runtime acceptance of this new credits page remain unverified. No fake native screenshots or blanket legal certification supplied.

Mobile Core implemented; Public Web audited/preserved, no redesign or publication; Admin not applicable. Existing runtime uses canonical repository city/POI content, not invented fixtures. No production services or credentials used.

Stop for final Screen 11 visual approval. No Screen 12, commit, push, merge or deployment.
