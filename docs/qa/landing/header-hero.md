# Landing Header / Hero — design review checkpoint

Part of #187; visual direction approved in issue comment 5985852453.
Base: `96e6d814f653fc3b014e7096b62fd194fd33c390`.

## Scope

Public Web: responsive Header / Hero at **`/landing-preview`**, English reference copy.
Mobile Core and Admin: unchanged. `/`, traveler routes, `/api/*`, auth callbacks,
password recovery, Cloudflare entrypoint, DNS and Vercel deployment policy are unchanged.
This is a Draft PR checkpoint, not a homepage cutover or launch acceptance.

White/navy/blue composition, route-mark brand, app-first headline, iPhone + Android
positioning, a large phone visual and one-city-first wording follow the approved mockup.
Compact How it works and launch-information blocks give the Header/Hero links actual
local destinations; other full-page sections remain a follow-up.

## Honest preview boundaries

- The phone is an explicitly captioned **illustration**, not a real native screenshot.
  It is aria-hidden and contains no pretend interactive controls. Replace it with an
  approved capture from the release candidate before public release.
- `/images/citywalk-waterfront.webp` is an existing repository decoration reused only
  for composition review. This PR does not certify photographic accuracy or licensing;
  final city imagery requires provenance/rights approval before homepage integration.
- No city roadmap beyond “Lübeck first; more cities to follow,” no fake testimonials,
  ratings, guaranteed arrival, prices, app-store badges or unavailable downloads.
- The temporary CTA is **Launch information**, not a fake newsletter submit. Its anchor
  explains the prelaunch state and offers the real support mailto. A consent-aware,
  tested notification form and truthful store-link states belong in a separate PR.
- No form inputs, new analytics, external map tiles, API fetches, auth or database
  imports in the added components. The existing root layout and Worker wrapper remain
  unchanged; in production the wrapper still acquires a request-scoped DB client.
- The review route is `noindex, nofollow`, not linked from the existing public homepage.
  It is not access-controlled; no private data or credentials belong in its content.
- English is explicit on the preview. Localized marketing copy is not declared shipped.

## Validation

The normal CI must pass tests, lint, Next build and isolated database/mobile checks.
`Validate landing preview` additionally builds the actual Next app, runs Chromium at
320/390/768/1440px, checks in-page destinations/keyboard access/44px link height and
horizontal overflow, captures 200% text/reduced-motion layout, and uploads screenshots.
It then builds vinext, verifies `ssr/index.js` and runs the existing deploy **dry-run**.
No upload to Cloudflare, store submission, traffic switch or production secret is used.
Browser tooling is installed in an isolated temporary directory, not the root lockfile.

Actual results must be read on the PR head; workflow presence alone is not a pass.
The authoring container cannot resolve GitHub/npm, so full dependency-based gates run
in GitHub Actions, not locally. Syntax and static markup checks are not Next runtime
or browser acceptance. Owner visual acceptance, final media, full page sections,
localized copy and live CTA integration remain open. Do not complete launch boxes.

## Local review (no deployment)

On the feature branch with dependencies installed, run `npm exec -- next dev --port 3100`
and open `http://localhost:3100/landing-preview`. This bypasses the repository's `predev`
infrastructure command; the preview components do not require a live DB. Use only
non-production configuration. This is neither a native app build nor a deploy.

For a production-mode UI review, use the same loopback build/start path as the workflow.
Verify the root homepage, saved traveler data and account routes are unchanged before
any later merge or separately approved production rollout.
