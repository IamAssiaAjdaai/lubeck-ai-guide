# Browser analytics withdrawal — 19 October 2026

**READY for the implemented browser fix and isolated Chrome acceptance. BLOCKED for overall Public Beta/legal release. Production unchanged.** This follow-up supersedes the specific browser withdrawal code finding in [the legal gap review](./LEGAL-GAP-REVIEW-2026-10-19.md); it does not close unrelated legal/provider/commercial decisions. The original review/content changes were preserved byte-for-byte and separated from the consent implementation for commit review.

Scope: Public Web required; no native or Admin UI change. Mobile consent and server aggregate commerce analytics are separate boundaries and remain unchanged. No private operator file, production secret or provider credentials were used. No migration, package, Cloudflare configuration, production cron, billing or workflow change.

## Root cause and implementation

Originally, `setAnalyticsConsent` swallowed write errors, leaving a previous persisted grant readable. The UI then unconditionally reloaded, and browser initialization could use that old grant to opt PostHog back in. This was reproduced in an isolated unit test, not observed as a production incident.

- `analyticsConsent.ts` now publishes a runtime denial **before** storage work. All readers and subscribers see it synchronously. Only a verified explicit opt-in in that document releases the withdrawal latch.
- Writes require read-back verification. Failed denial writes attempt verified removal of the old grant; an absent grant defaults to no analytics. If neither succeeds, the result reports failure and the runtime stays blocked. A session-storage withdrawal marker provides an additional reload guard where available. Failed opt-in cannot enable analytics; failed marker removal also blocks reauthorization.
- `instrumentation-client.ts` subscribes to the same state. Withdrawal immediately calls SDK opt-out and stops exception autocapture. Its `before_send` callback rechecks effective consent for **all** browser event producers, including raw `posthog.capture` calls and exception capture; even an SDK opt-out exception cannot reopen this gate. The sole SDK initialization remains consent/configuration-gated. Explicit verified reauthorization resumes capture without a page reload or a synthetic `$opt_in` event.
- Preferences/banner use real external-store subscriptions. They update in place, never automatically reload, and warn when a choice was not saved. The warning can survive a manual reload protected only by the session marker. It does not claim durable withdrawal when the old grant is still present.
- Browser identity helpers use memory-only identity for requested product continuity without analytics consent. Persistent analytics visitor/session IDs are not created in that state. Withdrawal attempts to remove existing analytics IDs and clears fallback identity; blocked storage can still prevent physical cleanup.

Cross-tab: storage events propagate saved denial/removal; an origin-local BroadcastChannel also propagates withdrawal when the initiating write fails. Receiving active tabs latch denial and attempt persistence themselves. Grant broadcasts are not accepted; a persisted grant from another tab cannot release a document's withdrawal latch. Focus/pageshow refresh subscribers, and capture-time reads remain a second safeguard.

## Files in the consent follow-up

- Runtime: `instrumentation-client.ts`, `src/lib/analyticsConsent.ts`, `src/lib/visitorSession.ts`, `src/components/AnalyticsConsentControl.tsx`.
- Tests: `src/lib/analyticsConsent.test.ts`, `src/lib/analyticsConsent.failure.test.ts`, `src/lib/analyticsInitialization.test.ts`, `src/lib/visitorSession.test.ts`, `src/components/AnalyticsConsentControl.test.tsx`.
- Evidence: this report and `docs/deployment/BROWSER-CONSENT-WITHDRAWAL-ACCEPTANCE.json`.

## Before / after reproduction

`src/lib/analyticsConsent.failure.test.ts` was run against the original baseline in a secret-free snapshot. The stale grant test **failed as expected**: received `granted`, expected `denied`, after both overwrite/removal threw. The same regression passes after the fix, alongside failure cases for reads, storage access, ignored/failed writes, session fallback, clearing a withdrawal marker, SDK initialization, reauthorization, subscriptions and cross-tab propagation. UI tests verify honest failed-save feedback and successful retry without reloading.

## Actual checks

| Check | Actual result |
| --- | --- |
| Focused consent/SDK/UI/identity/disclosure | **7 files / 33 passed** |
| Full core `npm run test:run` | **238 files / 1,500 passed**; 19 DB integration files / 143 tests skipped as expected |
| Full `npm run lint` | PASS — zero errors, eight existing warnings |
| Focused changed-file lint | PASS — zero findings |
| Next route type generation + app `tsc --noEmit --incremental false` | PASS |
| Cloudflare typecheck | PASS |
| `npm run build:vinext` | PASS |
| Cloudflare bundle / binding checks | PASS — nine pages / seven handlers; 16 preserved bindings / six reviewed additions |
| `git diff --check` | PASS |

Vinext overwrites `.next/types/routes.d.ts`; a later standalone app typecheck initially encountered the documented generated-type mismatch. Regenerating Next route types restored a passing app typecheck. No application workaround was added. Full database integration, the alternate Next production build and physical-device/browser-matrix acceptance were not repeated for this browser-only change.

## Isolated built Vinext browser acceptance

A tracked-files-only temporary checkout with the edited source used an explicit environment allowlist and synthetic analytics configuration. Its built Worker ran via Vite preview/local workerd, named `citywalk-local-consent-acceptance`, with remote bindings disabled and a disposable loopback PostgreSQL/Hyperdrive connection. Migrations targeted only that generated database. No production Worker or database was contacted.

Chrome/Playwright intercepted all analytics endpoints at loopback and blocked outbound browser traffic. SDK configuration/extension responses were synthetic; no PostHog project or real provider received events. The installed SDK suppresses automated browsers, so the harness used synthetic normal-browser navigator metadata for the positive-capture check. Initial bot-filtered attempts were not counted as acceptance. This metadata change belongs only to the disposable browser harness.

Passed: no initialization/capture/persistent analytics identity on first visit; explicit opt-in without reload; positive mocked capture; SDK/capture-time denial after failed withdrawal; no automatic reload; unchanged event count while denied; manual reload protected by the session marker with an honest warning; successful denial retry; explicit reauthorization; two-tab failed-write withdrawal via BroadcastChannel, including receiver SDK blocking and rejection of a peer grant in the original tab; storage-event propagation without BroadcastChannel. There were no uncaught page errors in the primary flow. The final run intercepted 11 synthetic capture requests while consent allowed them; none were sent to a real service. All generated rehearsal databases were dropped and the preview stopped; the temporary Worker config was restored after each attempt.

Sanitized results and source hashes: [BROWSER-CONSENT-WITHDRAWAL-ACCEPTANCE.json](./BROWSER-CONSENT-WITHDRAWAL-ACCEPTANCE.json). This is local source/runtime evidence, not a deployed-production acceptance record. The two reviewable commits contain the legal baseline and consent follow-up separately; their final IDs are recorded in the handoff.

## Remaining limits

- A page cannot guarantee a future document's choice if **all** useful storage writes/removals fail. The runtime latch protects the current document; a session marker protects same-tab reload only where that storage works. When an old grant cannot be removed and no marker can survive, a new tab/browser restart can read it. The UI warns, performs no automatic reload and offers retry. No durable-save claim is made.
- BroadcastChannel/storage events are best effort and limited by browser support, storage partitioning, suspension and delivery timing. If denial cannot be persisted and broadcasts are unavailable, another existing tab may retain its old grant. Closed/new tabs cannot receive an earlier transient broadcast. This is not cross-device consent synchronization. Concurrent explicit grants can become the stored choice for future documents, while already-denied documents retain their local latch.
- SDK opt-out/capture filtering cannot recall data already sent or cancel every in-flight request. Failed physical deletion can leave storage records on disk despite disabled capture. Provider-side retention/erasure remains a separate operational/legal decision.
- **NOT TESTED:** Safari/Firefox/private-mode/physical devices, browser crash/restart recovery with permanently denied storage, live PostHog/real provider behavior or production traffic. Unit exceptions and isolated Chrome injection are not a production incident claim.

No commit/push/deploy is an authorization to release. PR #393 stays Draft. No merge, deployment, production configuration, cron, payment or GitHub Actions billing change was performed.
