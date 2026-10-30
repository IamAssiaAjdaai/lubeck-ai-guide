# Verification · Global Welcome

25 October 2026, local uncommitted work on `codex/onboarding-global-welcome`, based on `98a1dbbda17f945a0d982eb6dbc36713bad61617`. These results do not imply remote CI, device/store acceptance or production readiness.

| Check | Actual result |
|---|---|
| Focused Welcome tests | **11 passed**; guest primary/skip navigation, all 7 supported locale copies, reduced motion and external-credit failure recovery. Native bridges mocked. |
| Focused Welcome + locale accessibility/preferences | **34 passed** across 4 files after final layout adjustments. |
| Full mobile `npm run test:run --prefix mobile` | **784 passed**, 94 files. Rerun on the final Dynamic Type implementation. |
| Mobile lint | **Pass**, zero warnings. |
| Mobile TypeScript | **Pass**. |
| Mobile `config:validate` | **Pass**, local development configuration. No lockfile or config change. |
| Expo Doctor | **21/21 pass** with official metadata access. First sandbox-only attempt failed DNS for 2 network checks; not counted as a product failure. |
| iOS Metro bundle | **Pass**; actual simulator rendered the route. Existing native development binary, current worktree JavaScript; no new signed iOS build. |
| Android `expo export --platform android` | **Pass**, Hermes bundle exported locally. Not an APK/AAB build or Android device run. Rerun after the final responsive-title/container adjustment. |
| Root `npm run test:run` | **1,902 passed, 239 skipped**, 268 passed / 27 skipped files. Skipped integration tests are not passes. |
| Root lint | Exit 0, **15 existing warnings**, zero errors; unrelated warning files unchanged. |
| Root `npx tsc --noEmit` | **Pass** after Next generated its route types. Initial bare checkout lacked generated `PageProps`/`LayoutProps`. |
| Root `npm run build` | **Pass** with explicit disposable local DB URL, localhost auth URL and synthetic local-only auth secret. Initial build without the required auth secret failed at admin prerender; no product code was changed to bypass it. |
| `npm run db:generate` | **Pass**: 58 tables, no schema changes, no migration generated. |
| `npm run db:migrate` | **Pass**, committed migrations against a new disposable Postgres 16 container bound to localhost port 55473. |
| `npm run db:verify` | **Pass**: 1 city, 25 places after existing canonical fixture seed into that disposable database. Empty freshly migrated catalog initially failed as expected. No existing/production database or remote storage touched. Container stopped/removed after checks. |
| `git diff --check` | **Pass**. No secrets/env files, dependency manifests, lockfiles, migrations, production configuration or unrelated work changed. |

Initial verification used symlinked dependencies; the workspace-resolution test and Turbopack rejected paths outside this checkout. Private local dependency copies resolved that setup issue. One unchanged membership test timed out under a parallel full mobile run; its focused rerun and later full mobile runs passed. No assertion was removed or test timeout changed.

## Native visual / accessibility evidence

Simulator: **iPhone 17 Pro, iOS 26.5**, logical **402 × 874**, screenshot **1206 × 2622**. Evidence is simulator-only, not physical iPhone acceptance. `preview.png` places two untouched captures side by side with labels; Home remains the existing launch route, and Welcome is a separate review route.

- `before-ios.png`: existing English Home/city discovery, unchanged source at the fetched baseline. It was recaptured without development overlays after returning from Welcome; it is not a different older revision.
- `after-ios-en.png`: English Welcome, standard native text size.
- `after-ios-de.png`: German Welcome, standard native text size.
- `after-ios-de-max-text-top.png`: top viewport at `accessibility-extra-extra-extra-large`; logo remains a fixed visual asset, caption/body retain native scaling, and title uses a smaller base size while retaining font scaling. Content continues below the viewport. The original system text size was restored. Full traversal at this extreme size and physical assistive-technology acceptance remain unverified.

Observed manually: English Get started and German Städte entdecken reach existing guest discovery without account entry or location prompts; Home retains launch-ready Lübeck plus noninteractive coming-soon Hamburg/Düsseldorf. English/German locale switching works. All standard-size actions and credits fit/reflow. Hero pixels are unmirrored. Offline/image failure is handled by existing NativeContentImage; external-link failure is tested with mocked Linking.

The reused language picker originally appeared as one Close accessibility element containing all languages. The narrow `accessible={false}` backdrop fix exposes individually checked/unchecked native radio options, verified in the simulator accessibility tree. An iOS accessibility-escape handler closes the menu. This is not a claim that VoiceOver or TalkBack testing was completed.

Calculated sRGB contrast:

- Navy #09234D on Off-white #FBFDFF: **15.15:1**.
- Muted #61748C on Off-white #FBFDFF: **4.70:1**.
- White on Blue #155CAF: **6.60:1**.

Primary target minimum 56 points; discovery skip 48; credit links and locale trigger at least 44. Headings and controls have native accessible names/roles. Reduced-motion image/route transitions are covered by component behavior/source and focused tests; no whole-app conformance claim.

Still required: owner approval of Screen 01, real Android rendering/device acceptance, physical iOS acceptance, VoiceOver/TalkBack traversal (including largest-text scrolling), experimental Arabic/RTL device rendering, compact/tablet visual acceptance and full Preview acceptance at a separately authorized environment. Existing native launch/store/runtime gates remain unchanged. No Screen 02 implementation, commit, push, PR, merge or deployment performed.
