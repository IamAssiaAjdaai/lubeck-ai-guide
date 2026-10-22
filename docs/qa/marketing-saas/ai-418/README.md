# #418 — MKT-AI-02 offline v2 proof of concept

**Implemented as isolated QA code. NO-GO for production adoption or an external paid pilot. Requests 0; spend €0.** There is no live v2 provider or application route. Green UI, authentication, tenant isolation, API/database contracts, v1 persistence/export, quotas, costs and publishing controls remain unchanged.

Base: exact Draft #417 head `7e67061362762020f97d707898927a82c21b2994`. Dedicated branch `codex/mkt-ai-02-offline-v2`, Draft stacked on `codex/mkt-ai-qa-01-offline-acceptance`. Existing #411/#414/#415/#417 branches and evidence are preserved.

## Evidence

- [Reproducible ten-case comparison and limitations](REPORT.md), [complete proposals, snapshots, claim ledgers and per-case metrics](results.json).
- [Adversarial results](adversarial.json): wrong/rejected IDs, stale snapshots, prompt injection in several languages and zero-width obfuscation, unsupported benefits/services/locations/names, numbers/prices/certificates/testimonials/dates, conditional promises, unsafe approved facts, explicit/implicit contradictions, repeated angles/tasks and benign false positives.
- [Future contract, data/version/review architecture and conservative cost envelope](FUTURE-CONTRACT.md). Proposal only, no actual provider/model performance claim.
- [Blank human scorecard](human-scorecard.csv). Zero real human scores. Each row links by content hash to v1/v2 evidence; this is not a blinded review package. A coordinator should randomize and redact mode labels for an independent human evaluation, keeping a separate key. Do not mistake placeholder transition-test decisions for actual content approval.
- Samples: [office v1](samples/s01-v1.md) / [office v2](samples/s01-v2.md), [IT v1](samples/s05-v1.md) / [IT v2](samples/s05-v2.md), [medical v2](samples/s04-v2.md), [one-fact fallback](samples/s10-v2.md). All 20 samples are synthetic and authored, not model generated.
- Exact local verification is recorded in `acceptance-record.json` after the final gate; remote CI applies only to the PR's exact head.

## What the spike does

`apps/marketing-saas-api/qa-v2/engine.ts` defines a separate strict schemaVersion 2. It projects the actual core-approved context, hashes its approved facts/confirmations/provenance and policy, validates every fact/claim ID, and keeps editorial prose separate from referenced factual segments. Claims can contain original paraphrases, but every paraphrase is explicitly unresolved. The curated candidates deliberately retain exact factual quotes while adding authored, business-specific editorial framing. IDs alone never prove entailment.

All factual sources need truth/conflict review, including exact quotes. All editorial copy, hooks, CTA, tasks and commercial angles need semantic review. Lexical sentinels catch some unsafe statements; broad contradictions, entities/services/locations and subtle implications can escape them. A narrow same-sentence-with-`nicht` contradiction check blocks explicit negation pairs. All other uncertain statements fail to a review queue. Known prohibited content is blocked even if it comes from an approved fact. Benign numbers/metaphors and negated guarantees demonstrate false-positive costs; this is not a production semantic safety classifier.

There are three posts when the fixture has >=3 facts, two for two facts, and one for the scarce garden case. Missing information becomes questions. Alternative hooks are three authored options, not claims of three distinct factual benefits. Seven-day plans and CTAs reflect each case's goal; all publication steps are owner suggestions requiring review and manual execution. No task is executed.

`OfflineReviewHistory` requires exact output version/hash, unchanged current snapshot, server-authorized tenant/project reviewer and per-flag decisions; policy blocks cannot be waived. Edits invalidate approval, history stays immutable, medical/tax requires specialist authority. It is a pure in-memory proposal, not a replacement authentication/audit service. There are no production mutations. The future host must provide authenticated metadata and transactional current-version checks; a checkbox or client permission flag would not satisfy that boundary.

The v1 comparison uses real `assemblePack`/`packMarkdown` with deterministic authored selections over the **unchanged ten #417 scenarios and core confirmation flow**. It compares one v1 candidate with one v2 candidate per business (20 comparison artifacts), not the prior two-provider 20-sample baseline. New evaluation-only v1 Markdown corrects the generic AI label to expressly say mock/no AI generation; production `packMarkdown` and old #417 evidence remain byte-identical.

## Reproduce

```sh
npm run marketing:ai:v2:offline                 # write 24 deterministic artifacts
npm run marketing:ai:v2:offline -- --check      # exact-byte reproducibility
npm run marketing:ai:v2:test                    # focused v2 regressions
npm run marketing:ai:v2:typecheck
npm run marketing:ai:v2:offline -- --check --require-go # expected exit 2
npm run marketing:ai:offline -- --check         # preserve #417 baseline
npm run marketing:ai:offline -- --guard-probe   # six transports/process attempts denied
```

The pinned local TSX/esbuild compiler warms before the existing deny-all guard is installed. Then the entry point imports v2 code; it imports no live provider SDK. Network (including loopback), DNS, HTTP/TLS, UDP, WebSockets, new workers and child processes are blocked by the existing guard. Ambient keys and AI-enabled flags do not create a live mode; unknown arguments such as `--live` fail. Trusted compiler workers only transpile local code. This is protection against accidental network calls in trusted code, **not an OS-level hostile-JavaScript sandbox**. Dependencies are reused, not added.

## Human quality gate and limitations

Have two independent German reviewers score naturalness, specificity, goal fit, genuinely different angles, owner actionability and factual accuracy (1–5). Separate tax/medical review is mandatory. Record any unsupported claim, unsupported implication or misleading benefit explicitly, plus task ambiguity and false-positive review burden. Proposed continuation gate: zero critical unsupported/prohibited claims, no unresolved semantic flags, >=4 in factual accuracy and core utility dimensions for at least 8/10 cases, and explicit acceptance of smaller scarce-fact drafts. This is a proposed research threshold, not achieved commercial acceptance. Reconcile divergent grades before a decision. Do not use an LLM judge as the gold standard.

Current apparent improvements are authored feasibility examples: no live German fluency, goal/channel adaptation, reliability, token use, latency or invoice has been measured. The angle/specificity/action proxies are annotations/string counts. Human review may still make mistakes; every unknown queued for a human is a procedural barrier, not semantic proof. There is no guarantee of hallucination prevention.

## Scope and release status

No UI/source assets, production routes/services, contracts, DB migrations, auth, quota/accounting or lockfile changes. CITYWALK Public/Admin Web and Mobile Core/iOS/Android: not applicable to this isolated offline QA package. No merge, deployment, public signup/pilot, billing, email, automatic publishing or live AI. Local PostgreSQL regression uses a new synthetic loopback database only; CITYWALK production and existing worktrees stay untouched. No Preview deployment is requested or required for a code-only offline experiment. Future integration/release remains separately approved.
