# CITYWALK Screen 03 — Account / Sign-in

25 October 2026. Local implementation, awaiting owner visual approval. Worktree `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge or deployment. Owner has approved Screens 01 and 02; those visual implementations are locked.

![Screen 03 iOS](screenshots/ios-standard-en.png)

## Scope and baseline audit

Mobile Core required; Public Web not applicable; Admin Web not applicable. iOS implementation and simulator evidence below. Android implementation shares native source and passes Hermes export; Android device acceptance remains unverified. No new Screen 04 implementation.

Targeted GitHub preflight: develop `4a74395838d0064e1fabf21f0f4ac3b9f951ecad` (#446, Preview synthetic fixture tooling) has no mobile overlap. Explicit continuation on this existing owner-requested branch; no rebase or integration change. Local uncommitted checks are not same-SHA CI or latest-develop integration evidence.

| Existing capability | Audit / reuse |
|---|---|
| Traveler authentication | Existing Better Auth client in `mobile/src/lib/auth/client.ts`, Expo plugin, SecureStore and citywalk callback scheme. Reused without a second provider/client/session store. |
| Email registration | Existing native validation and `signUp.email`; server requires email verification, disables automatic sign-in, sends verification, and uses existing locale header. Unchanged. |
| Email sign-in / recovery | Existing `signIn.email`, resend verification and password reset; errors localized, request locks and stale/unmount guards retained. No real account/email requests made for screenshots. |
| Apple / Google | Existing environment capability flags and provider handlers only. Both hidden in this preview because disabled; tests enable mock configuration to verify existing handler contracts. No provider enabled or credential changed. |
| Navigation | Approved Welcome → approved Introduction. Introduction Next now pushes `/account?onboarding=1`; its Explore Cities remains existing guest discovery. Screen 03 Explore Cities replaces root with `section=cities`, without authentication. |
| Existing profile/account management | Plain `/account`, account editing, password changes, linking, export/deletion and walk return behavior remain in existing presentation and handlers. Existing regression tests pass. |
| Availability / purchase rules | Existing city discovery and eligibility untouched. Lübeck available; other city cards remain coming soon. €4.99 / 72-hour, one-time, no renewal unchanged. |

## Implementation and visual decisions

Opt-in presentation inside the existing AccountScreen; a new layout-only frame supplies safe areas, scrollable content, iOS keyboard avoidance, locale control, editorial Georgia headline / Android serif, Navy/Blue/off-white colors, and a separate guest footer. Existing forms and feedback are extracted once and reused in both account presentations. Existing UI buttons, Card, PasswordField and localized validation are retained.

The reference account composition is followed: calm pale blue background, back/locale controls, large two-line editorial title, short supporting copy, account choices, and sign-in below. Actual preview is email-first because social providers are not enabled; it deliberately does not show nonfunctional provider buttons. Copy promises saved walks/personalization rather than cloud-synced favorites or universal premium access. No photography added, so no new license obligation. All seven existing locale types have copy; only currently selectable locales remain selectable.

Screen 01 source is byte-identical. Screen 02's only change is Next destination plus its obsolete accessibility hint/comment; its visual JSX, styles, assets and copy match the approved baseline. See `approved-baseline.sha256`, `preservation.json`. Existing uncommitted shared UI/LocaleSelector and photo files belong to approved earlier work and were not modified in this step.

### Exact changed code boundaries for this step

- `mobile/src/app/account/index.tsx`: opt-in Screen 03 presentation, shared existing guest forms/feedback, contextual social callback/error routing and guest exit.
- `mobile/src/components/AccountOnboardingFrame.tsx`: new presentation-only native frame; no auth/session/data logic.
- `mobile/src/lib/accountOnboardingCopy.ts`: localized presentation text.
- `mobile/src/app/introduction.tsx`: Next navigation only; no visual change.
- `mobile/tests/account-guest-flow.test.tsx`: six additional onboarding behavior cases; existing account regression coverage retained.
- `mobile/tests/account-onboarding-frame.test.tsx`: seven-locale large-text semantic/content/navigation checks with native primitives mocked; not native layout acceptance.
- `mobile/tests/native-screen-chrome.test.tsx`: mock new opt-in frame in legacy chrome coverage.
- `mobile/tests/welcome.test.tsx`: Next assertion updated to optional account route; guest discovery coverage retained.
- This QA directory: screenshots, source hashes, preservation evidence and verification logs.

No auth configuration, backend, schema, dependency, city, payment, entitlement, shared design-system or approved Screen 01/02 visual changes.

## Actual native evidence

Existing local iOS development binary with worktree Metro bundle; not a newly signed release or physical device.

- [English account entry, iPhone 17 Pro](screenshots/ios-standard-en.png), 402 × 874 points / 1206 × 2622 pixels.
- [English sign-in](screenshots/ios-standard-sign-in.png) and [email registration](screenshots/ios-standard-sign-up.png).
- [Small English entry](screenshots/ios-small-en.png), 375 × 667 points / 750 × 1334 pixels.
- [Small German entry](screenshots/ios-small-de.png), [German sign-in](screenshots/ios-small-de-sign-in.png), and [maximum accessibility text](screenshots/ios-small-de-max-text.png), font scale 3.571. Text grows and wraps; content continues in ScrollView while guest exit stays visible. Largest headline uses a smaller base size to prevent splitting German words. Text size restored afterward.
- [Existing guest city discovery reached from Screen 03](screenshots/ios-small-guest-discovery.png).

Observed native actions: Introduction Next opens Screen 03; email choice opens existing signup fields; Back returns to account choice; Sign in opens existing email/password/recovery form; Explore Cities from sign-in reaches existing guest city discovery, retaining locale and coming-soon city status. No actual registration, password change, reset email, social provider, payment or production operation performed.

Accessibility: header/button semantics, explicit labels, no text truncation, native secure password field/show-hide control, ≥48-point new touch targets, separate safe-area footer. Headline #09234D and body #506984 have strong contrast on #FBFDFF / pale-blue wash; existing primary buttons retain existing shared design. Full VoiceOver/TalkBack, keyboard interaction/avoidance, full touch-scroll traversal at maximum text and physical device acceptance remain manual checks. Automation could not conclusively demonstrate scrolling/keyboard appearance; do not treat that as verified acceptance. Android device rendering is unverified.

## Automated verification

All logs in `logs/`. `source-sha256.json` identifies the local code under review.

| Gate | Actual result |
|---|---|
| Full mobile tests | 816 passed, 95 files. Includes existing auth and legacy account regressions, optional onboarding, social callback context, local validation, signed-in entry, OAuth errors, localization and approved-screen navigation. |
| Mobile lint / TypeScript / config | Pass; mobile lint zero warnings. |
| Expo Doctor | 21/21 pass after allowing metadata network access. Initial sandbox DNS checks failed; rerun passed. |
| Android Hermes export | Pass, `/tmp/cw-screen03-final-android`; device acceptance unverified. |
| Root tests | 1,902 passed, 239 skipped; 268 passed / 27 skipped files. Skips are not passes. |
| Root lint / TypeScript | Pass; lint 0 errors, 15 existing warnings. |
| Root production build | Pass with synthetic local auth settings and disposable localhost database required by existing admin pages. Initial sandbox build stalled; retry without a database failed on existing admin requirements; configured local rerun passed. |
| Database generation | Pass; no schema drift/migration generated. |
| Database migrate / seed / verify | Pass against fresh task-owned localhost Postgres16 only: 1 city, 25 places. Task-owned container removed afterward. |
| Diff / preservation | `git diff --check` pass; approved visual baseline preservation assertions pass. |

No production credentials or database used. No real provider sign-in or email delivery acceptance claimed. React review: layout-only component, no nested component definitions or added hooks in conditional branches, existing request guards and authoritative session client retained, no new global state/fetch/provider or package.

## Handoff / approval stop

Screen 03 is ready for owner visual review. Stop here before Screen 04. The remaining acceptance items are visual approval plus manual/native/provider checks listed above; no release-readiness claim. All work remains uncommitted in the isolated worktree.
