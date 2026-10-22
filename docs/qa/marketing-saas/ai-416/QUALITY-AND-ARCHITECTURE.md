# Commercial quality, trust limits and proposed improvement

## Decision

**NO-GO for an external paid pilot at €79/€149.** Passing this offline suite means the evidence and technical boundaries work; it is not a commercial content-quality approval. Live-model performance and human utility scores remain unmeasured. No UI copy, selector/assembly behavior or persisted Pack contract is changed. One narrow adapter cost-safety defect is fixed: missing partial usage can no longer be silently converted to a zero-token cost.

## What is measured

The versioned corpus covers all ten issue scenarios. Each has a goal, audience, supported channel, 1–4 approved claims, rejected/unknown claims, explicit fact IDs, synthetic `.example` provenance, approval actor/time, regulated-risk annotations and benefit/angle annotations. The existing core creates context revision 1 and confirms only the approved IDs into revision 2. No website is retrieved.

Two baselines per business: the actual deterministic demo provider and an **authored mock selector**. The latter varies valid selections to explore the template envelope; it is not an imitation of measured OpenAI behavior. Both use the real `assemblePack` and `packMarkdown` contracts. Samples are expressly prefixed OFFLINE/SYNTHETIC; the renderer's provider label does not turn a mock into a live result.

Automated measurements:

- Fact-angle proxy: number of distinct fixture-annotated fact-angle sets across posts, excluding hook variation. These labels are authored annotations, not inferred semantic truth. Target >=3 is a proposed variety check, not proof of quality.
- Distinct fact bodies: repeated approved text after removing hook and CTA. Ten of twenty outputs repeat a fact body; the one-fact garden case cannot obtain three genuine factual angles from selectors alone.
- Audience-term coverage: literal annotated keyword overlap only. It can detect omissions but cannot certify an audience-aware benefit or brand match.
- Supported benefit use: count posts referencing facts explicitly annotated as a benefit/process advantage. No inferred commercial/health/tax benefit is invented. Where there is no approved benefit fact, lack of benefit text is a constraint, not permission to manufacture one.
- Owner action proxy: count tasks beginning with the seven explicit German imperative verbs. This detects an owner action syntactically, not whether a real owner considers it useful.
- Daily task variety: seven unique task strings within the current normal plans; across all 140 tasks there are only seven wordings. Seven repeated instances of one action are schema-valid and tested as poor quality.
- CTA consistency: selected CTA is appended consistently, but all three choices ask for contact. Retention and visibility are not represented in the wording of this CTA library; fit needs human judgment.
- Readability proxies: words per post, mean words per sentence and maximum characters, not a natural-German grade. Awkward generic hooks in medical/tax contexts need actual editorial review.
- Conditional sensitivity: holding selection constant, changing goal/audience/channel changes 0/20 post bodies. The provider could choose different existing facts/templates; it cannot write a new channel-specific explanation. This does not assert that a live model always returns the same selection.
- Original editorial content: computed as residual words after removing the chosen library hook, exact referenced facts and CTA; baseline zero. The safety check also verifies that posts comprise only these known pieces.

`BASELINE-REPORT.md` and `results.json` contain every output and proxy distribution. `human-scorecard.csv` has **no prefilled scores**. Automated risk classes are not 1–5 human grades, and there is no LLM-as-judge.

## Limitations vs regressions

| Finding | Class / current behavior | Acceptance consequence |
| --- | --- | --- |
| Invalid JSON, extra free prose, unknown/rejected IDs, unsupported channels, duplicate day/alternative-hook IDs | Real schema/assembler rejects | Must remain passing negative tests |
| Zero approved facts, stale revision, exhausted quota/budget, concurrent/idempotency conflicts | Real service rejects before provider generation or quota charge | Verified against isolated PostgreSQL; construction of a provider object occurs earlier than fact admission, while `generate` does not |
| Timeout, unknown charge or missing usage | Failed attempt retains full reservation; no transparent retry/refund | Necessary cost safety, not useful content |
| Actual usage exceeds reservation | Failed output, cost recorded, shared budget blocked | Operator reconciliation required; no promise that application reservations cap the vendor invoice |
| Human-approved unsafe guarantee/instruction | Quoted verbatim even though not treated as a system instruction | Critical review/policy gap; reproduced in `negative-findings.json`, not counted as a safe output |
| Approved/rejected conflicting assertions | Rejected ID excluded | Does not establish truth of the approved counterpart |
| Two conflicting approved assertions | Both accepted; no semantic contradiction detector | Mandatory fact review; explicit regression probe documents absence of validation |
| Duplicate post hooks or repeated daily actions | Schema-valid; content evaluator flags repetition | Quality failure, not a schema bug fixed by this branch |
| Tone/forbidden-claim context | Present in fixture BrandContext but not forwarded in current PackInput | Source/context storage is not model policy enforcement; regulated approval remains blocked |
| Raw Markdown and internal `PackService.export` | Render/export without a review boolean | Real HTTP route is the reviewed=true/current-version boundary. Negative tests target that route; helpers must not be misrepresented as a gate |
| Human edit | Arbitrary edited prose retains original fact references and an explicit warning | References are provenance of the original generation, not an automatic claim check for edits |

The partial-usage regression was reproduced with a failing mocked test before the fix: `input_tokens=100` with missing `output_tokens` previously produced a successful result with outputTokens=0. The adapter now rejects missing/invalid counts, and the existing service retains full reservation/attempt without retry. Constraints are strengthened; no public API or database contract changes. A generated schema object can be perfectly valid and still lack commercial usefulness. The manually selected facts and fixed library cannot support a claim of original, individually written marketing copy. Whether a planning-template product warrants the proposed prices requires user testing; these prices remain hypotheses.

## Proposed architecture — separate approval required

### Option A: retain selectors and narrow the promise

Position as a factual campaign scaffold requiring owner editing. Add independently reviewed goal/channel/action variants and genuine use-case validation. Library expansion still has a finite quality ceiling and is not original AI copy. No UI or pricing change is implemented here.

### Option B: original German draft with a versioned claim ledger

1. Keep the current v1 selector engine and persisted Pack untouched. Introduce a separately approved v2 draft contract with explicit schema version and additive migration/dual-reader/export tests. Never store a new structure silently as a v1 Pack or discard old versions.
2. Pass only server-authorized, approved fact snapshots plus goal, channel, audience and separately validated tone/forbidden-claim policy. Keep 24 facts/500-char and input-size limits unless separately reviewed. All source material remains untrusted; no crawling/tools/actions delegated to the model.
3. Separate immutable source quotes from original editorial segments. A claim ledger records each factual segment, its approved fact IDs, snapshot/hash and claim category. IDs validate provenance membership; **they do not prove entailment or truth**.
4. Deterministically reject unknown IDs, mismatched snapshots, unauthorized facts, unsupported numbers/prices/dates/certifications, instruction-like source fragments and disallowed regulated claims. Entity/number/rule checks are useful defenses, not a complete semantic verifier. Ambiguous paraphrases fail to a review queue; no claim of a fully enforceable semantic truth guarantee.
5. Use a separate unsupported-claim/contradiction review stage with calibrated adversarial cases. A model-based checker, if later authorized, may assist but cannot be the gold standard or sole approval authority. Blinded human reviewers remain mandatory, especially for medical/tax content.
6. Require review of the exact current output version before manual export. Store audit facts and source snapshots separately from editorial status; preserve immutable history. Reset review after editing. Consider a version/hash-bound review record in a separately approved contract instead of treating a client boolean as evidence of actual reading.
7. Preserve all server-side auth/tenant gates, SSRF controls, quota/idempotency/advisory locks, token/rate ceilings, uncertain-cost reservations, no retries and manual publication. Run v1/v2 contract, semantic adversarial and cost tests before any staged rollout; no automatic publishing.

Risks: false-positive content rejection, false-negative entailment, misleading citation confidence, additional tokens/latency, provider drift, and the need for a versioned migration. A fact-claim ledger reduces ambiguity; it does not solve factual accuracy by itself. No part of v2 or a live judge is implemented by #416.
