# Screen 03 visual polish — awaiting approval

25 October 2026. Isolated `/private/tmp/citywalk-global-welcome`, `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Owner has not approved Screen 03. No commit, push, merge, deployment or Screen 04 work.

## Revised composition

![Revised English iOS](screenshots/ios-standard-en.png)

The large decorative circle is replaced by an original vector illustration: an abstract global skyline, walking route, compass and destination pin. It depicts no actual destination or availability. Authored for CITYWALK in this change; no third-party photography, attribution, dependency or license added. Decorative and excluded from the accessibility tree.

The account choice page now groups the illustration, editorial headline, supporting copy, prominent blue email action, inline Sign in prompt, divider and reassuring guest discovery into one scrollable composition. Guest discovery sits below the account choices instead of being separated by a large flexible gap. Email forms omit the illustration and use reduced top spacing; the guest exit remains in a separate safe-area footer above the iOS keyboard. Text grows and wraps without fixed-height clipping; content can extend below the fold at accessibility sizes. No animation introduced.

Brand: Navy #09234D, Blue #155CAF, Off-white #FBFDFF, body #506984. Calculated contrast evidence: `logs/contrast.json`. Reuses existing native UI, locale selector, Georgia/Android serif, form labels, secure PasswordField and native keyboard avoidance. New action targets retain at least 48 points.

## Scope / preservation

Mobile Core required; Public Web and Admin Web not applicable. iOS simulator reviewed; Android source and bundle verified, Android device acceptance unverified. Live develop preflight remains `4a74395838d0064e1fabf21f0f4ac3b9f951ecad` (#446 Preview fixture tooling), with no mobile overlap; no sync/rebase of the owner-requested worktree.

Changes this pass:

- `mobile/src/components/AccountOnboardingFrame.tsx`: illustration and tighter rhythm, inline choice-page guest section, existing separate form footer preserved.
- `mobile/src/app/account/index.tsx`: presentation-only choice prop, email button color, compact Sign in row, guest reassurance next to Explore Cities. No handler changes.
- `mobile/assets/images/account-journey.svg`: original decorative illustration.
- `mobile/tests/account-onboarding-frame.test.tsx`: mock image bridge and exercise choice-page footer across seven locale contracts.
- This QA directory: before-source snapshots, screenshots, preservation checks, hashes and logs.

`locked-screens.sha256` + `logs/preservation.log` prove Screens 01 and 02 are byte-identical to the beginning of this pass. `preservation.json` additionally records that the entire account source before the onboarding presentation block (including auth/session handlers) is byte-identical. No auth provider configuration, city data, routing destination, payment, City Pass rule, schema or shared styles changed. Existing social provider flags remain authoritative; Apple and Google are hidden in these previews. No provider enabled just for design.

## Screenshots and native verification

Existing development binary + current worktree Metro bundle, iOS 26.5; not signed release or physical-device acceptance.

| Device | English | German |
|---|---|---|
| iPhone 17 Pro, 402×874 points | [Standard EN](screenshots/ios-standard-en.png) | [Standard DE](screenshots/ios-standard-de.png) |
| iPhone SE 3, 375×667 points | [Small EN](screenshots/ios-small-en.png) | [Small DE](screenshots/ios-small-de.png) |

[Maximum accessibility text initial viewport](screenshots/ios-small-en-max-text.png), scale 3.571. The headline and supporting text reflow; account and guest controls follow below the fold in the same ScrollView. Full maximum-text touch-scroll traversal was not conclusively observed: the computer-use drag failed with a window-position error. Manual assistive-technology and physical-device acceptance remain required. Simulator text size restored afterward.

[Software keyboard with password focused](screenshots/ios-keyboard-password.png): focusing Password scrolls the form so email, password, Sign in and Forgot password controls are visible above the keyboard. Guest reassurance and Explore Cities remain above the software keyboard. No credentials entered. Initial email focus and keyboard appearance also observed. Small-device keyboard, Android keyboard and full VoiceOver/TalkBack acceptance remain unverified.

Observed native actions in this pass:

- Sign in opens existing email/password form; password visibility changes Show → Hide.
- Empty Sign in displays the localized invalid-email validation; no request sent.
- Forgot password opens existing recovery form; Back returns to sign-in, then account choice.
- Email sign-up opens existing display-name/email/password form; empty submit shows localized display-name validation.
- Explore Cities from registration opens existing guest city discovery in German, with Lübeck available and other cities still coming soon.
- Locale selector switches EN/DE; headings, copy and actions translate and fit at standard/small sizes.

Existing automated tests cover configured social callback routing, sign-up payload/verification notice, sign-in/recovery/resend, failure states, request locking and existing account regressions. No live provider login, account creation, recovery email delivery or real credentials were used; those external auth outcomes are unverified rather than claimed working from a mock. No second authentication system introduced.

## Verification results

- Full mobile suite: **816 passed**, 95 files.
- Final focused account/frame/approved-screen suite after test adjustment: **77 passed**, 3 files.
- Mobile lint: **pass, zero warnings**. TypeScript: **pass**.
- Android Hermes export: **pass**, `/tmp/cw-screen03-polish-android`.
- Diff check and approved-screen hash checks: **pass**.
- Root tests/build, database migration checks and Expo Doctor were not rerun for this presentation-only follow-up; the immediately preceding Screen 03 report records their passing results. This pass changes no backend/schema/config/dependencies. No new CI/production-ready claim.

## Approval checkpoint

Stop at Screen 03 for owner visual approval. Screens 01/02 unchanged; Screen 04 untouched. All work remains isolated and uncommitted. Remaining acceptance: visual approval, full large-text/assistive-technology traversal, small/Android keyboard and actual provider/device checks described above.
