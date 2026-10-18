# Legal foundation implementation evidence — 18 October 2026

Branch `codex/legal-launch-readiness`, based independently on current `origin/develop` `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`. Refs #265/#109/#187/#387. The separate launch-policy branch covers #347.

## Change and trust boundaries

See `CITYWALK-LAUNCH-REVIEW-2026-10-18.md` for the legal readiness report, data inventory reconciliation, source links and explicit operator/legal blockers. Existing stable legal routes, Web footer and native Legal & Support links remain. Privacy/Terms/Imprint bodies now require complete operator configuration AND explicit publication approval; draft text and partial identity are withheld otherwise. Robots and sitemap agree with this gate. `legal:check` reports missing field names without printing private values.

No schema/API/admin role change, migration or import. Guest core, support, deletion and account export remain available. No actual operator identity/address was supplied, inferred or published. No production or provider configuration was accessed or changed. Admin staff/audit retention boundaries and server authorization are preserved. No new native implementation was needed for existing stable links. iOS and Android device acceptance are each unverified.

## Actual validation

| Gate | Result |
| --- | --- |
| Full Web tests | 232 files passed / 19 skipped; 1,445 passed / 133 skipped. |
| Focused legal/disclosure tests | 5 files / 21 passed after final disclosure edits; includes withheld partial identity and explicit approval. |
| Root lint | Pass, 0 errors / 8 pre-existing warnings outside legal changes. |
| TypeScript | Pass after Next route type generation. |
| Next build | Pass with synthetic auth configuration and isolated local PostgreSQL. Initial unconfigured build failed at admin prerender for missing auth secret; no production credentials used. |
| Cloudflare/vinext | Build, bundle and binding checks passed; 16 baseline bindings preserved / 7 reviewed additions, one new OFF publication flag. No deploy. |
| `db:generate` | Baseline snapshot drift proposes `shared_walk_links` again despite committed `0026`. Inspected duplicate `0027` output and removed it; no migration in this PR. This gate remains a baseline blocker. |
| `db:migrate` | Pass using committed migrations against a fresh disposable local PostgreSQL DB. |
| `db:verify` | Pass after explicit local canonical seed: Lübeck / 25 places. Empty pre-seed DB initially failed as expected. |
| Lifecycle / deletion / export integration | 4 files / 25 tests passed, including external erasure worker and verified web deletion. Runner creates/drops an isolated test DB on loopback. No real email/provider action or production account deletion. |
| `legal:check` with no operator data | Expected failure: operator fields and publication approval missing. This is evidence that public launch is blocked, not a passing readiness gate. |
| Diff/security review | `git diff --check` passed; no secret env file, private identity, dependency churn, destructive SQL or unrelated code staged. |

Local unit/integration results do not establish live provider erasure, mailbox delivery, production URL availability, store declarations, final legal adequacy or real-device acceptance. Skips are explicitly unverified. Draft publication approval remains OFF. Resolve documented identity, provider/transfer/retention, consumer and device decisions before approval. Production legal deployment and #187 launch require separate operator authorization.

The task authorizes a Draft PR to `develop`; no merge, production deployment, DNS or `main` change is performed.
