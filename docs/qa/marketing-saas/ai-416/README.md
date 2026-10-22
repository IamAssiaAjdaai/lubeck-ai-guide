# #416 — MKT-AI-QA-01 offline acceptance

**Decision: NO-GO for an external paid pilot.** Offline implementation and deterministic verification are complete. This is not live-model, human-quality, release or pricing approval. **Paid API requests: 0. Spend: €0.** No UI changes, merge, deployment, public access, real email, billing or contact collection.

Base: exact Draft #415 head `684aa76ff871e4b0f825aa053849ad2c70a86860`. Independent branch `codex/mkt-ai-qa-01-offline-acceptance`, stacked on `codex/mkt-brand-02-green-system`. All existing worktrees/branches and green design evidence preserved.

## Read the evidence

- [Generated baseline quality report](BASELINE-REPORT.md): ten businesses × real demo / authored mock selector, transparent proxy distributions and limitations.
- [Complete structured results and engine source hashes](results.json), [versioned synthetic corpus](fixtures.json), [reproduced negative quality/trust findings](negative-findings.json).
- [Commercial-quality assessment and staged improvement architecture](QUALITY-AND-ARCHITECTURE.md): no silent change to the selector/persisted Pack contracts.
- [Human scoring protocol](HUMAN-REVIEW.md), [blank scorecard](human-scorecard.csv), blinded samples in `blind/`; hold back [review key](review-key.json) until scores are locked. **0/20 outputs scored by humans.**
- [Bounded future live-test proposal](LIVE-TEST-PLAN.md): five synthetic runs only after explicit new authorization, max €0.75 reservation/attempt, €3.75 cumulative authorization, operator stop-loss <=€5. Current configured estimate €0.101513, not actual spend or a vendor billing guarantee.
- [Execution record](acceptance-record.json): exact commands, observed tests and known exclusions.

## Corpus and output links

Every business is entirely fictional. Only explicitly confirmed IDs flow through the existing core context/provenance projection; no source website is fetched. Each supplies one goal, audience/channel and 1–4 approved facts plus rejected/unknown statements. Garden-service data is deliberately scarce; unknown seasonal details stay excluded.

| Case | Synthetic business / channel / goal | Real demo | Authored mock |
| --- | --- | --- | --- |
| s01 | Düsseldorf office cleaning / LinkedIn / inquiries | [Pack](samples/s01-demo.md) | [Pack](samples/s01-mock.md) |
| s02 | Köln electrician / Instagram / inquiries | [Pack](samples/s02-demo.md) | [Pack](samples/s02-mock.md) |
| s03 | Hamburg tax office / LinkedIn / visibility | [Pack](samples/s03-demo.md) | [Pack](samples/s03-mock.md) |
| s04 | München physiotherapy / Instagram / visibility | [Pack](samples/s04-demo.md) | [Pack](samples/s04-mock.md) |
| s05 | Berlin B2B IT / LinkedIn / inquiries | [Pack](samples/s05-demo.md) | [Pack](samples/s05-mock.md) |
| s06 | Leipzig building cleaning / Facebook / loyalty | [Pack](samples/s06-demo.md) | [Pack](samples/s06-mock.md) |
| s07 | Freiburg bicycle workshop / Instagram / inquiries | [Pack](samples/s07-demo.md) | [Pack](samples/s07-mock.md) |
| s08 | Nürnberg language school / Facebook / inquiries | [Pack](samples/s08-demo.md) | [Pack](samples/s08-mock.md) |
| s09 | Bremen joinery / Instagram / visibility | [Pack](samples/s09-demo.md) | [Pack](samples/s09-mock.md) |
| s10 | Lübeck garden service / Facebook / visibility | [Pack](samples/s10-demo.md) | [Pack](samples/s10-mock.md) |

The assembler/exporter are production functions, not evaluation reimplementations. The mock's 1600/700 token values are fabricated test metadata. No actual model usage or quality is measured. The existing selector offers 6 hooks, 3 contact CTAs and 7 action texts; 20 outputs contain **0 original editorial words**, half repeat fact bodies, and 140 daily tasks use only 7 wordings. These limits are reported separately from schema/reference checks.

## Executable commands and offline boundary

```sh
npm run marketing:ai:offline                    # regenerate committed deterministic evidence
npm run marketing:ai:offline -- --check         # byte-for-byte reproducibility and source hashes
npm run marketing:ai:offline -- --guard-probe   # six denied transport/process paths
npm run marketing:ai:offline -- --check --require-go # expected exit 2: commercial NO-GO
npm run marketing:ai:test                       # 30 tests; 19 DB cases skip without explicit DB
npm run marketing:ai:typecheck
```

The CLI initializes only the pinned, trusted local TSX/esbuild compiler, then installs the deny-all guard **before loading application/provider/evaluator modules**. The compiler is warmed unconditionally, including on warm caches. Existing compiler workers only transpile trusted local modules; no application/provider code executes there. Runtime fetch, HTTP/HTTPS, TCP/TLS, DNS, UDP, WebSocket, new child processes and new workers are blocked. The evaluation itself must record zero blocked attempts; intentional guard probes run separately. Demo uses an explicit empty environment; mock responses are injected. Ambient API keys/enable flags do not select a live adapter, and unknown arguments (including `--live`) are rejected.

This is defense against accidental network use by the trusted checked-in suite, **not an OS sandbox for hostile arbitrary JavaScript or a replacement for an external firewall**. SDK-adapter tests replace the SDK completely. PostgreSQL service tests forbid the real SDK constructor/fetch and permit only the known loopback QA database socket; the pure CLI denies even loopback. Credential values and provider secrets are never read into reports or printed.

For real local database tests, apply the four unchanged SaaS migrations to a dedicated database and run:

```sh
MARKETING_TEST_DATABASE_URL=postgresql://marketing_qa:local_marketing_qa_only@127.0.0.1:55498/marketing_ai_qa_416 \
MARKETING_DEMO_MODE=true MARKETING_AI_ENABLED=false npm run marketing:test:integration
```

The URL is the repository's existing synthetic local QA convention, not a production credential. Tests create only synthetic accounts/projects and exercise ledger mutations in the isolated QA DB. Serial integration files avoid shared-budget-test interference. No destructive reset, production DB or email delivery.

## Negative coverage and findings

| Required case | Actual boundary exercised |
| --- | --- |
| No confirmed facts, stale context | Core confirmation + actual PackService; no provider generation/charge |
| Unsupported source claim / conflicting rejected fact | Real approved-fact projection excludes its ID/text |
| Prompt-like source injection | Static system/data separation; unapproved injection excluded. Already-approved unsafe text is reproduced and flagged, **not** certified safe. Live prompt-injection resistance is unmeasured |
| Conflicting approved claims | Accepted by current engine; explicit limitation probe/test, not a semantic truth guarantee |
| Unsupported channel, hallucinated/rejected IDs, invalid JSON, extra prose | Real Zod/assembly rejection |
| Duplicate days/alternative hooks | Real assembly rejection |
| Duplicate post hooks/repeated actions | Schema-valid quality failures, explicit negative finding |
| Timeout / uncertain cost | No retries; failed attempt and full reservation retained |
| Missing/partial/invalid usage | Real adapter mock plus service guard; narrow accounting defect fixed |
| Exhausted quota/global budget, >€0.75 cost, >24 facts/500 chars | Service rejects before generation/charge |
| Concurrent reservation / key collision | Actual advisory-lock, running-limit, quota and idempotency behavior |
| Over-reservation cost | Cost recorded; shared blocked flag until operator reconciliation |
| Unreviewed/stale export | Actual in-memory HTTP route rejects reviewed=false/missing and stale version |
| Version history / publishing | Original version immutable; only manual-edit/export events, no publication |

### Narrow regression fixed

Before the patch, a fully mocked SDK response with `input_tokens:100` and absent `output_tokens` resolved with outputTokens=0. The added regression failed (**1 failed / 4 passed**) before the fix. The adapter now rejects absent/invalid partial usage before returning a result; existing PackService keeps its full reservation/attempt, with zero retries. Eight adapter acceptance cases pass after the fix. No public error contract, model settings, prompt, selection schema, assembly behavior or database contract changes.

## Verification and remaining gates

Observed final local checks: **1,546 unit tests passed / 161 skipped**, 239 files passed / 22 skipped. The 19 new PostgreSQL cases are deliberately skipped in the no-DB unit run and separately executed: **28 real PostgreSQL integration tests passed** (9 existing + 19 new). Focused offline tests: **30 passed**, plus the separately executed DB cases. Lint: **0 errors / 8 existing warnings**. QA/API/UI/root typechecks, Vite build and supported root webpack build passed. `db:generate` no drift; local SaaS migrate/verify passed; `git diff --check` clean.

Root build used synthetic build-only settings and `npm run build -- --webpack`. Standard Turbopack was not rerun: the existing managed-worktree external node_modules symlink limitation is documented in #415. CITYWALK DB migrate/verify are outside this isolated subsystem and were not run. Green UI source/assets/design reports and lockfile remain byte-identical to #415. No new dependencies or provider credentials.

The dedicated SaaS CI includes report reproducibility, guard probes, offline tests/typecheck, full local DB negatives and existing green browser journeys. Exact-head remote CI is reported in the Draft PR; local results are not remote acceptance.

**Pending:** blinded human grading (all 20 outputs), live-model quality/actual token costs, a separately approved safe live runner/stop-loss configuration, and all naming, legal, operations, email and commercial release gates. Proposed v2 ledger/original-copy architecture is documentation only. No commercial GO is inferred from passing tests. UI/customer journey unchanged; Mobile Core/iOS/Android and CITYWALK Public/Admin Web have no implementation changes.
