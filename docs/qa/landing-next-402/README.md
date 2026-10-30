# LANDING-NEXT / PR #402 — founder design integration

Implemented locally on `feat/landing-next-planta-20261021`, based on unchanged HEAD `383aa82d565cd281ffffb9ea8c4ce9db24acdcf7`. Draft PR: https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/402. No commit, push, merge or deployment was performed.

Public Web: required, isolated `/landing-next-preview` only. Mobile Core and Admin Web: not applicable. Production `/`, original LandingPreview/#395, backend, authentication, city availability data, database, payments, Cloudflare and existing untracked work were not modified.

## Review

Open [the screenshot gallery](index.html). It includes the supplied HTML alongside the integrated page, all six required viewport widths, mobile 200% text captures and dark mode. Images link to full-resolution captures. Screenshot WebP copies preserve dimensions; original PNG captures and detailed local logs remain under `.citywalk/landing-next-402/`.

The isolated local server is available at `http://127.0.0.1:3195/landing-next-preview` while its QA process is running. Its source snapshot contains no `.env*` files, starts with an explicit minimal environment, uses curated code content, blocks database/provider/external network connections, and disables Next telemetry. The browser also blocks external requests. No infrastructure startup scripts were run.

To restart that existing isolated snapshot (do not start a second server on the occupied port):

```sh
python3 .citywalk/landing-next-402/run-isolated.py dev --webpack --hostname 127.0.0.1 --port 3195
```

## Actual checks

| Check | Result | Evidence |
| --- | --- | --- |
| Original nine sections and copy | PASS | All nine rendered section texts match the supplied HTML after whitespace normalization; only the required extra illustrative-image caption is excluded from that comparison. |
| Responsive layout | PASS | 320, 390, 768, 1024, 1440 and 1920px, each at 100% and 200% root text size: 12/12; no horizontal overflow, navbar links fit, hero clears navbar. |
| Interaction/content checks | PASS | 38/38: skip link/focus, menu open/close, Escape/focus restoration, outside click, desktop resize, section links/back-to-top, 200% menu reachability, native FAQ exclusivity, image decoding, nine-section copy, noindex and disabled store URLs. |
| Every FAQ answer | PASS | Separate 9/9 real-browser keyboard opening/closing checks; exactly one answer open at a time. `faq-results.json`. |
| All unique internal routes | PASS | Actual Next link clicks and local HTTP 200 for `/explore`, `/support`, `/account-deletion`, `/privacy`, `/terms`, `/imprint`. Curated code content only; this does not certify legal/operator readiness. |
| Accessibility automation | PASS with manual limitations | axe-core 4.11.0, all default rules, 14 runs: light at all six widths/both text sizes, dark at 390/1440. Zero violations. Gradient/illustrative contrast includes incomplete checks requiring visual review. |
| Console / network | PASS | Zero browser console/page errors; zero external browser requests. |
| Existing store URL guards | PASS | 8/8 Vitest tests; store UI remains non-clickable prelaunch labels, independent of environment values. |
| Preview TypeScript | PASS | `tsc --noEmit` with a preview-scoped config in the ignored QA directory, importing the real shared dependencies. |
| Preview lint / whitespace | PASS | `eslint src/app/landing-next-preview --max-warnings=0`; `git diff --check`. |
| Isolated preview production bundle + prerender | PASS | Next 16.3.8 Webpack `compile`, then `generate`, limited by `--debug-build-paths='app/landing-next-preview/page.tsx'`. Preview TypeScript checked separately. Generated static Next page retains client navigation/menu support. This is a QA artifact, not a deployed site or replacement for backend routes. |
| Full application build | BLOCKED (existing source) | Compilation succeeds; generated Next route checks reject the existing named exports `GenericCityContent` (`src/app/[locale]/[citySlug]/page.tsx:30`) and `GenericPlaceContent` (`src/app/[locale]/[citySlug]/[placeSlug]/page.tsx:35`). Both files match HEAD and are outside this task. A route-filtered default build also encounters unrelated admin `PageProps` whose route is absent from the filtered type map. Neither check was suppressed in application configuration. |
| Founder visual acceptance | REQUIRED | Comparison supplied; no pixel-parity or founder-acceptance claim. |

Browser: Chromium 153.0.8010.12, Playwright 1.62.1, device scale 1. Viewport matrix uses 1000px height; keyboard menu checks also use 640px height. The 200% check increases the document root text size; the decorative phone illustration retains its image-like internal typography. This is not a Safari/Firefox, screen-reader or physical-device acceptance claim. The Next development toolbar is hidden only in QA screenshots, with a test-injected stylesheet outside application content.

The final preview artifact uses the installed Next font mock interface with local Geist files bundled in that same Next package, avoiding Google network fetches. The landing itself uses the exact reference system-font stack; the HTML does not embed or load Plus Jakarta Sans. These offline QA artifacts are not release artifacts.

## Changes and design boundaries

- `src/app/landing-next-preview/page.tsx`: server composition, noindex metadata, shared brand tokens and proper document back-to-top target.
- `src/app/landing-next-preview/Navbar.tsx`: authentic CitywalkLogo, Next links, responsive keyboard-operable disclosure and cleaned-up event listeners.
- `src/app/landing-next-preview/sections.tsx`: nine named server-rendered sections, complete reference content, native exclusive FAQ and labeled first-party illustration. No raw HTML injection or reference preview-interception script.
- `src/app/landing-next-preview/cities.tsx`: source-controlled names/statuses; unpublished cities excluded and coming-soon cities never promoted by landing copy.
- `src/app/landing-next-preview/Footer.tsx`: authentic logo, real internal routes and semantic section headings.
- `src/app/landing-next-preview/landing-next.module.css`: scoped reference styling, shared brand navy, narrow/text-zoom reflow, actual-header-relative menu height, focus and dark contrast corrections. The reference hero's background treatments and phone composition are retained.
- `public/images/landing-next/citywalk-app-illustration.webp`: extracted original embedded JPEG, 900×822, 108,328 → 79,614 bytes (26.5% smaller), WebP quality 85, no upscaling. Visible illustrative caption and descriptive alternative text retained.
- `docs/qa/landing-next-402/`: this report, gallery, browser checks, JSON results, hash manifest and screenshot derivatives.

The reference HTML SHA-256 is `aafef293fee8e81e530970cb0385f37897787edf00502233fd9becefc53d20ce`. Its inline JavaScript and placeholder circular logo were not copied into the application. The authentic logo/shared brand navy replace the reference stand-in as requested. Reference text remains unchanged at the current city availability state. Native store badges remain prelaunch text; there is no web checkout.

`manifest.json` records source, extracted asset, screenshot and generated artifact hashes. Production homepage SHA-256 remains `eebd44aa8dc6197798993a17450d50ed6c3d95393dff53243bfaebf505652a77`, equal to HEAD.

## Reproducing checks

```sh
npx vitest run src/app/landing-next-preview/storeLinks.test.ts --exclude '**/.citywalk/**'
npx eslint src/app/landing-next-preview --max-warnings=0
npx tsc --noEmit -p .citywalk/landing-next-402/preview-tsconfig.json
python3 .citywalk/landing-next-402/run-isolated.py build --webpack --experimental-build-mode compile --debug-build-paths='app/landing-next-preview/page.tsx'
python3 .citywalk/landing-next-402/run-isolated.py build --webpack --experimental-build-mode generate --debug-build-paths='app/landing-next-preview/page.tsx'
git diff --check
```

`browser-checks.cjs` is a portable copy of the browser harness: it accepts `CITYWALK_REFERENCE_HTML` (required and SHA-verified), `CITYWALK_PLAYWRIGHT_MODULE`, `CITYWALK_CHROMIUM_EXECUTABLE`, `CITYWALK_AXE_PATH` and `CITYWALK_QA_DIR`. Supply installed QA tool paths without changing application dependencies. It permits only `127.0.0.1:3195` and file/data resources; failing assertions set a nonzero exit code. Existing ignored QA scripts retain the paths used in this session.

## Outstanding gates

1. Founder visual acceptance of the complete preview, including authentic-brand substitutions, the supplied illustration and 200% reflow; real-device/assistive-technology review remains unverified.
2. Resolve the pre-existing full Next build errors in a separately scoped change, then complete required CI/Preview acceptance before merge. This task does not authorize a backend or production change.
3. Before public launch, complete legal/operator approval and verify actual native store listings before separately enabling links. The preview's noindex metadata is not access control.

No commit/push, PR publication update, merge, production homepage switch or deployment is included in this handoff.
