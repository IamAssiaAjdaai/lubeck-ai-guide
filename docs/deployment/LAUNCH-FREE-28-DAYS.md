# Lübeck 28-day access policy (#347)

Baseline `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`; implementation candidate, not launch approval. Mobile Core required (iOS + Android); Public Web required for existing media/checkout behavior and disclosure; Admin Web no new feature. No schema or entitlement ledger change.

## Authority and configuration

`src/lib/commerce/launchPolicy.server.ts` reads only server runtime configuration. The public GET `/api/commerce/launch-policy` exposes active state, approved window (when complete), and purchase availability, with `private, no-store`. It exposes no approval reference or operator identity. No query/body/device clock can change authority. City access GET retains its session/account race guard and reports `launch_free`, never a fabricated paid tier. Paid entitlements continue to use the original resolver.

Default: OFF, purchases disabled. All these runtime values must be reviewed together:

| Variable | Required value / meaning |
| --- | --- |
| `CITYWALK_LAUNCH_FREE_ENABLED` | Exactly `1` only after operator GO; `0` for emergency switch-off |
| `CITYWALK_LAUNCH_START_UTC` | Approved UTC instant, strict `YYYY-MM-DDTHH:mm:ss.000Z` |
| `CITYWALK_LAUNCH_VERIFIED_PUBLIC_AT_UTC` | Recorded verified public availability, not merge/build time |
| `CITYWALK_LAUNCH_APPROVED_AT_UTC` | Explicit operator approval instant, at/after verification and at/before start |
| `CITYWALK_LAUNCH_APPROVAL_REFERENCE` | Nonempty internal approval/change reference; never publicized by API |
| `CITYWALK_LAUNCH_AI_CALLS_PER_24H` | Explicit finite shared provider-call budget, integer 1–1000; no default grant |
| `CITYWALK_PUBLIC_PURCHASES_APPROVED` | Defaults `0`; separate future commerce release only. Setting `1` cannot enable purchases while launch mode is `1`, even before/after window or with invalid launch dates |

End is always start + 28 × 24h, inclusive start / exclusive end. Invalid dates, normalization, missing values, reversed approvals or invalid server time cannot activate access. Merge/current date is never used as a start fallback. No launch date was supplied or configured by this work. The checked-in Worker bindings remain OFF/blank; a fresh operator-approved isolated candidate/deployment must receive intended runtime bindings. Do not enable through a `NEXT_PUBLIC_` or Expo environment grant.

## Feature gate matrix

| Capability | Before / OFF | During approved window | Day 29 / switch-off |
| --- | --- | --- | --- |
| Guest core exploration, route planning, foreground walk | Existing free behavior | Existing free behavior | Existing free behavior |
| Lübeck city unlock / start gate | Existing verified paid rights if gate enabled | Guest + registered access from server, `launch_free` | Paid rights restored through normal resolver; no purchase activation |
| Approved private Lübeck premium media/audio | Verified city/Premium right | Guest + registered access; asset city/approval/locale checks still required | Normal verified paid rights only |
| Exact-locale/publication/source/RAG scope | Existing strict rules | Unchanged; no translation/audio fabrication | Unchanged |
| Ask CITYWALK | Existing finite free/paid allowance | Existing finite free/paid allowance; launch does NOT raise guest or registered free daily limit; shared provider cap added | Existing allowance; while launch mode remains on, shared cap still applies |
| Global Premium / lock screen / background Live Walk | Existing verified Premium only | **Not selected for launch grant**; existing purchased rights preserved | Existing verified Premium only |
| Downloads/offline content | Existing approved cache/download capabilities only | No new download entitlement or offline access promise | Existing capabilities; cached public content not remotely erased |
| Web checkout / public product offers | Disabled unless separately approved | Hidden; server service rejects before price lookup/order/provider work | Remains disabled; no scheduled billing/automatic enrollment |
| Native purchase offers / new SDK purchases | Hidden until server and existing store gates permit | Hidden; adapters recheck server before purchase; failures deny | Still disabled pending separate decision |
| Restore, transaction verification, webhooks | Existing verified ownership and idempotency | Preserved; never block pending/earlier transactions | Preserved |
| Staff/admin / private data | Original server authorization | No launch bypass | Original server authorization |

Selected scope deliberately excludes global background Premium until its separate device/privacy acceptance. This is not completion of every #347 release gate. Existing global Premium endpoints are not reinterpreted as city-scoped launch grants.

## AI budget and abuse boundaries

Existing IP abuse limits, authenticated/visitor daily limits and verified grounding remain. Each model SDK attempt, including attribution retry, reserves a shared PostgreSQL advisory-locked slot using one fixed identifier before contacting Groq. Database failure, exhausted cap or invalid budget prevents the call. Failed calls consume slots conservatively. SDK automatic retries are disabled in launch mode. Input context is limited to 32,000 UTF-8 bytes and output to existing 1,024 tokens; no unlimited model use is granted. This is an application request/token ceiling, **not a provider euro-denominated account spending limit**. Operator must approve the corresponding financial ceiling using current contracted model pricing, confirm provider account spend controls and reconcile actual costs before GO. Other applications using that provider account are outside this limiter.

Changing the cap does not change the shared scope/identifier. Rotating the HMAC secret changes limiter identity; include that in operational budget/incident review. Rolling 24h caps are not calendar-day or monthly billing totals. Existing forwarded-header trust weakness is tracked by #348/#354; this branch does not supersede that security work. The fixed global cap does not depend on visitor/IP flags, but isolated runtime/negative abuse acceptance remains a launch blocker.

## Approval and rollback runbook

1. Resolve legal #265/#109, security #348, infrastructure, CI and #187/#33/#112 real-device gates. Complete approved TestFlight/Play Beta and a real field walk; record exact build/SHA per platform. Do not use production for automated testing.
2. Verify actual public availability on required release surfaces. Record proof privately. Operator records GO/reference and approves a start at/after that evidence; absent GO, keep OFF. A retroactive merge timestamp is not evidence.
3. Rehearse strict server dates with synthetic windows in isolated Preview. Test guest, account transitions, forged flags, unavailable backend, expiry and paid purchases/restore using mocks or sandbox only. Verify Worker bindings and no-store delivery on exact deployed SHA.
4. Review daily operational cost and privacy-safe funnel evidence. #53 owns opt-in feedback; #130 owns neutral experience-triggered public review requests; #59 owns reporting. Never ask only satisfied users or offer a reward. Existing consented landing/walk events can support the funnel; installs, activated users, completed walks, opt-in feedback, critical bugs and actual AI costs need verified reporting sources. Missing metrics are unavailable, not fabricated. No new telemetry/feedback collection is silently enabled here.
5. Keep an external operator change record for enable/disable, window, reference, candidate SHA and budget changes. Runtime policy is read-only; it creates no personal audit records. Infrastructure audit/log evidence must accompany actual changes; this is not a new admin audit UI.
6. Emergency rollback: set launch mode `0` and keep public purchases `0` through approved runtime deployment. Verify new requests deny temporary private access while prior purchases and free core still work. Revert candidate code if required using the reviewed deployment rollback process. No database rollback or paid-grant cleanup is necessary.
7. At expiry access ends automatically, not billing. No job creates subscriptions or charges. Existing subscriptions purchased earlier keep their original store contracts; this policy does not cancel them. Before any post-window paid release, obtain explicit commercial/legal/store disclosures and product approval, then separately release purchase activation. Leaving launch mode `1` after expiry deliberately keeps purchases blocked.

Native UI checks can become stale during a mounted screen; every new purchase adapter rechecks the server and protected media checks every request. Offline clients receive no newly authorized launch media. Bytes already delivered/cached cannot be revoked; no fake offline entitlement is stored. Real iOS and Android acceptance remains separate and unverified until performed.
