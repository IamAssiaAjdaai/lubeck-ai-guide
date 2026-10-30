# Next minimal implementation slice — proposal only

**Implementation is NOT AUTHORIZED.** This document requests no implicit code action; stop at test report.

## Recommended first slice: the transient return-intent helper

Smallest isolated production dependency: the reviewed navigation-only live lease and validated resolver, in proposed `mobile/src/lib/plannerReturnIntent.ts`. It must hold only bounded city/native route key/mount token/readiness metadata in memory. No preference/journey/GPS storage, new global settings owner, persistent namespace or provider/API.

On future explicit implementation authorization:

1. Convert lease TODOs I01/I04/I05/I07 to real assertions against that helper; no stub implementations. Validate malformed/bare versioned envelopes, wrong city/key/token, cold runtime, conditional revoke and final owning-stack target count.
2. Implement only the helper to satisfy those assertions. Keep the existing controller, Hub, S08 footer and storage behavior unchanged in this first dependency slice.
3. Run the full mobile tests/types/lint. Do not mark the overall identity flow complete: I02/I03/I08 remain expected failures until a separately authorized real controller/Hub/assistant integration publishes and validates leases. I06 still needs committed-render order tests.
4. Stop for review of that bounded helper and its evidence before integration.

## Following separate dependencies

- Compatible classified slot observation + guarded preview commit in existing walkStorage; preserve bytes/links/namespaces and prevent corrupt or changed-current replacement. Existing read/write compatibility and saved replay/current resume remain distinct.
- One new-draft cursor/Back/edit return and request tickets in the existing NativeWalkFlow; preserve legacy walking/categories/manual/GPS/finish/return-by and Customize/add modes.
- Selected-day/time-zone reconfirmation for HH:MM; existing account duration and deadline contracts unchanged.
- Finally, real S08 planning/browse actions and EN/DE footer; capture small/standard iPhone and Android/native accessibility evidence.

The old Hub test explicitly expects boolean-only Back, while the new expected-failure tests require the reviewed stronger contract. Both intentionally coexist now. Once integration is authorized, the old navigation expectation needs an explicit contract revision with preserved valid-return coverage—not silent deletion/weakening to force green. Likewise convert `it.fails` cases to normal tests only when their actual missing behavior is implemented and verified; unexpected passes should initially fail.

Keep D01–D14 and Screen 14 pending. Do not perform broad tab/search/auth/storage/domain consolidation, activate cities or alter City Pass (€4.99/72h one-time/no renewal). No commit/push/merge/deploy authorization.
