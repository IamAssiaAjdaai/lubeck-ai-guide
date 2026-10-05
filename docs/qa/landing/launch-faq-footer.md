# Landing Launch / FAQ / Footer — review checkpoint

Part of #187, following #209. Base: `02f1aa6d0889e65c3c387622f5b80ed0627ac347`.

## Scope and product surfaces

Public Web only: replace the temporary closing block on `/landing-preview` with a
navy prelaunch panel, four native FAQ disclosures and a shared-logo footer. Header
navigation gains the working `#faq` target. The footer stays outside `main`.

Mobile Core (iOS / Android) and Admin are unchanged. Root `/`, existing traveler
routes, `/api/*`, auth callbacks/recovery, DB schema, Worker entrypoint and hosting
configuration are unchanged. Vercel Git deployment remains disabled. No new
packages, lockfile changes, images, SDKs, secrets or runtime integrations.

## Honest prelaunch states

- iPhone and Android are explicitly planned platforms, not download buttons.
- Primary action opens `mailto:support@getcitywalk.com`; secondary action opens the
  actual FAQ. Contacting support does not enrol anyone for launch notifications.
- No email input, consent checkbox, submit handler, subscriber database write,
  Resend call, store badge or fake successful signup.
- Pricing remains unresolved in #187. The FAQ does not choose free/paid, quote a
  price, promise unlimited access or announce store availability.
- Guest planning and authenticated account saves remain distinct, matching
  `docs/qa/saved-walk-account-ux/account-saved-walks.md` and native Save gating.
- Offline wording is conservative: plan to connect for fresh content/audio/AI.
  This preview does not certify a fully offline native experience.
- City FAQ references the existing Cities section, not a second city roadmap.
- Privacy / Terms / Imprint / Account deletion are explicitly pending plain text,
  not fake legal documents, `#` links, 404 destinations or a deletion form. They
  must be replaced with reviewed live pages before launch.
- One CITYWALK route mark is reused. The dark-panel brand tile is decoration, not
  approval or replacement of the native app icon.

## Implementation and accessibility

`LandingClosing.tsx` exposes the launch section, FAQ and footer. Styles are scoped
in `closing.module.css`. Existing Header/Hero/feature/city markup is preserved.

FAQs use HTML `details` / `summary`, all closed initially, with a visible focus
indicator and a decorative plus/minus. No custom client state or JavaScript is
needed to open answers. Desktop uses four columns, medium widths two, mobile one.
The dark panel stacks on small screens and hides only its decorative brand tile.
No fixed text heights or truncation are used.

Reference semantics: MDN HTML `details` / `summary`; Next.js server components for
static markup. Installed Next docs/dependencies were unavailable in the authoring
container (GitHub/npm DNS lookup fails); no framework API was changed.

## Verification

Authoring checks: all changed TSX transpile syntax, browser-script `node --check`,
CSS parse and whitespace checks. These are not a full typecheck, unit-test suite,
or Next/vinext runtime pass.

Normal CI remains mandatory. The existing landing workflow keeps its Next build,
loopback-only Chromium checks at 320/390/768/1440px, keyboard skip navigation,
minimum link-target sizes, noindex/preview rules and full-page captures. It now
also tests Enter/Space FAQ toggling, pointer opening of all answers, expanded
answer overflow, 200% text with answers expanded, and disclosure use with browser
JavaScript disabled. Open FAQ screenshots are additional artifacts.

The workflow retains the vinext build, SSR `index.js` guard and deploy **dry-run**.
Read actual results for the PR head before claiming these gates passed. Existing
image-provenance checks, real native captures, owner visual acceptance, legal
pages, notification consent/delivery, localization and homepage cutover remain
separate gates. Do not mark any #187 launch/legal checkbox complete for this PR.

No merge, production deploy, DNS change, store submission or email send is
performed by this checkpoint.
