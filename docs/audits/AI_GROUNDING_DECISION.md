# CITYWALK AI grounding audit — decision record

Status: **P0 validation incomplete; do not interpret green unit tests as proof of factual correctness.**
Target: PR #355 -> develop. This record describes current code behavior, not a production benchmark.

## Verified deterministic baseline

CI for commit `8124f99` completed successfully. The labeled fixture suite
`src/lib/guideGroundingEvaluation.audit.test.ts` contains 12 synthetic cases
against one Holstentor evidence chunk (1464–1478).

| | Unsafe output | Safe output |
|---|---:|---:|
| Guard flags | True positive: 4 | False positive: 1 |
| Guard allows | False negative: 3 | True negative: 4 |

- Precision: 4/5 = **80%**
- Recall: 4/7 = **57.1%**
- False-positive rate: 1/5 = **20%**

These are fixture-set measurements, **not estimates of real-user error rates**.
The dataset is small, curated, and not representative of multilingual travelers.

### Known blind spots

1. Four-digit years cited correctly can coexist with fabricated people, materials, causes, or events.
2. Dates expressed in words are not checked.
3. Safe contextual modern years can be blocked (false positives).
4. The date guard checks presence in a cited chunk, not whether the year is attributed to the correct event.
5. Prompt-injection tests assert prompt construction; they do not test real-model resistance.

## Next P0 verification gate (must precede a production reliability claim)

1. Create a human-labeled, independent evaluation set per supported launch locale:
   factual questions, unsupported facts, refusal cases, multi-stop context,
   adversarial instructions, and conversational follow-ups.
2. Record provider/model version, retrieved chunk IDs, answer, grounding status,
   labeled factual support, latency, token usage, and estimated cost.
   Never log sensitive conversation text, precise GPS, provider keys, or full prompts
   into unrestricted telemetry.
3. Measure unsafe-answer rate, hallucination recall, false refusals,
   localization quality and p50/p95 latency with confidence intervals.
4. Test on actual Groq model calls in a controlled non-production environment,
   with a hard budget ceiling and no user data.
5. Manually review sampled failures and pass the agreed release thresholds.

## Recommended design

- Keep deterministic routing, time estimates, entitlements, and navigation
  separate from language-model assertions.
- Preserve the existing grounded-answer/fallback path.
- Prefer a **claim-level support check** against *cited* chunks for factual
  responses; include the verifier's uncertainty state. If a response cannot
  be verified reliably, return the safe insufficient-evidence message.
- Evaluate the verifier on clean and adversarial examples before placing it
  inline in the API; record additional latency and costs.
- Do not try to solve semantics by layering arbitrary regex patterns.
- Improve the prompt injection testing using actual model outputs, not only
  checks that instructions appear in a prompt.

## Merge decision

**Hold production acceptance.** It may be reasonable to merge an explicitly
scoped unit-test-only change after CI passes, but the current PR also alters the
live guide prompt and response guard. Require reviewer sign-off and real-model
regression/evaluation for these behavior changes. No deployment, production
configuration update, or billing changes are authorized by this record.
