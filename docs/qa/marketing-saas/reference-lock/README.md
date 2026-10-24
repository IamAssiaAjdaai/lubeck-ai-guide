# WIRKFADEN Design Reference Lock — local owner review

**Implementation for visual review. Design Freeze is NOT declared. No push/PR/merge/deployment or live-provider activation.**

## Baseline and preservation

Branch `codex/mkt-dashboard-01`, implementation parent `3f3a568558a30c52db25fe587cce8a49fb9e04b4`; previous `a06d9772ef7725413753d37f399d3dbb01f7a53a` is retained. Fresh develop preflight: `17be0aad0bae00640fe5a81df87332bf235483ea`. PR #425 is merged at `72c87245bbb2f0332feb7fe261cee5668ca06b7e`, already in this branch's ancestry. The one newer develop commit is admin WebAuthn work (#432); it was inspected and not imported into this explicitly continued Marketing branch. No history rewrite or CITYWALK change.

The first supplied Wirkfaden dashboard image is the canonical visual reference. Its SHA-256 is in [REFERENCE.json](REFERENCE.json). The second purple dashboard is excluded. [PRESERVATION.json](PRESERVATION.json) records unchanged 117 Human Review files and 321 held files. Prior dashboard-01/02 evidence stays unchanged; private reviewer materials, results and coordinator keys are not copied.

## What changed

A 240px pale navigation rail, spacious company/account topbar, expressive Fraunces hero, organically rounded photo, four pastel summaries, direction/weekly-plan row, three post previews with a right knowledge/action rail, retained recent draft and a forest status band now follow the owner's composition. Manrope remains the operational font. The scoped temporary wordmark explicitly says **Arbeitsname**. The same authenticated typography, form controls, white surfaces, pastel accents, spacing and CTA treatment carry through creation, editor, Content Packs, knowledge/facts, Brand Kit, media, settings and onboarding.

Existing request/callback flow, dirty-state navigation guard and security controls are reused. New display fields are derived from existing read APIs, not new persistence/API contracts. Selected-company KPIs and Overview posts do not mix other project data. The full Content Pack library still groups every authorized project, retaining older saved drafts.

## Reference versus implementation

| Reference area | Implemented counterpart | Intentional difference |
| --- | --- | --- |
| Pale rail / W. / wordmark | 240px desktop; 216px at 1024; temporary identity | Six implemented destinations only. No dead Strategy/Calendar/Export links. Name remains provisional. |
| Salon/team image | Current reviewed approved business photo, otherwise existing D2 editorial photo with persistent visible UI caption | No invented tenant staff/premises. Logo assets cannot become hero business photos. Fallback is explicitly synthetic illustration. |
| Weekly-prepared headline | Conditional saved-content headline, or company-first empty state | No claim that an old Pack is this week's AI strategy. No invented welcome identity. |
| Posts / Reel / Stories / week summary | Current Pack posts, saved preparation drafts, completed Packs, planned Reels/Stories | Counts derive from selected-company loaded data. No invented video/story counts, analytics, exports or upgrades. |
| Strategy | Actual Pack/draft objective, channel and confirmed-fact count | Full-company strategy remains planned; no fabricated audience, focus or AI recommendation. |
| Week schedule | Actual saved day/time/task previews; native access to all seven tasks | Not a publishing calendar, no fake dated/scheduled posts. Preview clipping never removes full tasks from disclosure/editor. |
| Three social cards | Current immutable version's three texts and exact per-post review state | Only a bound, current reviewed approved source asset supplies a post thumbnail; otherwise explicit text-first panels. No fake Reel player. |
| Brand knowledge / next action | Actual city, confirmed facts, sufficiency and existing contextual callback | No guessed brand tone, CTA or completion percentage. |
| Upgrade band | Closed-pilot/manual-publishing status and real Media Library action | No purchasable subscription, fake customer promise or billing. |

The implementation is deliberately taller than the vision image: 16px body copy, readable review metadata, truthful product limitations and the preserved saved draft take more space than the compact mockup. It matches architecture, palette, typography and hierarchy, not pixel identity. The primary next action follows the hero in DOM and mobile reading order while occupying the reference's desktop right rail.

## Actual evidence

- [Side-by-side owner-reference comparison](comparison-1440.png).
- [Desktop Overview](after/authenticated/overview-returning-1440.png) · [1024](after/authenticated/overview-returning-1024.png) · [tablet](after/authenticated/overview-returning-768.png) · [390](after/authenticated/overview-returning-390.png) · [375](after/authenticated/overview-returning-375.png).
- Prior actual authenticated Overview: [desktop](../dashboard-02/after/overview-1440.png), [mobile](../dashboard-02/after/overview-390.png), parent `3f3a568`. New `before/` captures use synthetic intercepted APIs on that same parent before source changes; final `after/fixtures/` is separately identified as intercepted API evidence, not real authentication.
- All active screens at five widths are indexed in [SCREENSHOTS.md](SCREENSHOTS.md). The actual authenticated captures use a fresh isolated local PostgreSQL database, Better Auth and synthetic test accounts; they are not design mockups. Earlier before screenshots are linked rather than rewritten.
- [Design tokens and component contracts](DESIGN-SYSTEM.md).
- [Proposed Design Freeze v1.0 checklist](DESIGN-FREEZE-CHECKLIST.md).
- [Exact file inventory](FILES.txt) · [test evidence](TEST-RESULTS.json) · [canonical CI summary](CI-SUMMARY.json).

## Capability matrix

| Available now in local QA | Boundaries / unavailable |
| --- | --- |
| Independent auth, website/manual business intake, editable city and fact confirmation | Public registration remains closed outside isolated synthetic test setup |
| Saved goal/channel preparation, sufficiency/theme checks, three-post mock Packs and seven-day tasks | No real AI weekly strategy, calendar/scheduling, Reels, Stories or social analytics |
| Persisted version history, local editing and exact-version approval | No approval inferred from generation completion |
| Private approved-source media, Brand Kit, default-off mock Creative workflow | No activated real image/video provider; synthetic media never documentary proof |
| Human-reviewed text/creative export, manual publishing | No automatic posting, paid plan, checkout or lead collection |

## Verification and limits

| Final local check | Result |
| --- | --- |
| Full units | 1,707 passed / 0 failed / 239 skipped |
| Marketing unit/security subset | 236 passed / 0 failed / 87 skipped |
| Isolated PostgreSQL integration | 118 passed / 0 failed / 0 skipped |
| Authenticated / closed / D2 public demo | 596 / 30 / 271 checks passed |
| Reference geometry, keyboard, empty/error/multi-project/stale review | 124 checks passed |
| Automated axe | 0 violations across 85 authenticated state/viewport pairs, five fixture widths and five closed-auth widths |
| UI / API / core TypeScript; Marketing build | PASS |
| Marketing lint | 0 errors, five native-image advisory warnings; helper-script lint PASS |
| Existing local migrations, repeat application and DB integrity | PASS |
| Protected / held files | 117 / 321 unchanged |

Counts overlap: Marketing units are part of full units; DB mixed suites may include already-counted unit portions. Skips are not database passes. This is local verification, not GitHub CI or release approval.

Exact results are recorded in TEST-RESULTS.json. Full units, Marketing units/security, isolated PostgreSQL integration, UI/API/core TypeScript, Marketing lint/build, authenticated/closed/public-demo journeys, and five-width reference/keyboard/axe checks are executed offline. Database tests include tenant/source/privacy/quota safeguards already present; no new backend behavior is claimed. Full repository Next/CITYWALK build and Drizzle operations are not altered or used to test this independent Vite frontend; Marketing's seven existing local migrations, repeat application and DB integrity are checked instead.

An external shared dependency installation temporarily removed tool entry points during one final rerun. Source work was preserved. A task-private copy of the restored dependencies was used for final verification; no dependency or lockfile change is committed. Two earlier iterations also caught a test-only invalid Testing Library option and tablet header expectation; both were corrected and rerun. Raw failed logs, sessions, DB configuration, local mail, exports and credentials stay outside Git.

Automated axe checks do not prove complete accessibility. Manual keyboard checks cover navigation, focus, native disclosure and review tabs; no screen-reader/real-device or owner visual acceptance is claimed. This task does not validate AI quality, commercial readiness, trademark clearance or live-provider operation. The external paid pilot stays NO-GO.
