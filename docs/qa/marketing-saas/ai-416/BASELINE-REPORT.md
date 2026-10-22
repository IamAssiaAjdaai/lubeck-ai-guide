# Offline German Marketing Pack baseline

Baseline: `684aa76ff871e4b0f825aa053849ad2c70a86860` · prompt `de-pack-selectors-v1` · fixtures v1. **NO-GO for an external paid pilot.** No model request, paid tokens, real customer data or factual-quality certification.

## Results

All 20 curated outputs pass deterministic structure/reference/provenance checks. This is not a quality grade. Human grades: **0 completed, 20 pending**. Automated risk distribution: `{"HIGH_REPETITION":10,"LIMITED_TEMPLATE_QUALITY":10,"CRITICAL":0}`.

| Scenario | Mode | Contract safety | Fact-angle proxy | Distinct fact bodies | Posts using supported benefit | Automated risk |
| --- | --- | --- | --- | --- | --- | --- |
| s01 | demo | PASS | 2/3 | 2/3 | 0/3 | HIGH_REPETITION |
| s01 | mock | PASS | 2/3 | 2/3 | 0/3 | HIGH_REPETITION |
| s02 | demo | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s02 | mock | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s03 | demo | PASS | 2/3 | 2/3 | 1/3 | HIGH_REPETITION |
| s03 | mock | PASS | 2/3 | 2/3 | 1/3 | HIGH_REPETITION |
| s04 | demo | PASS | 2/3 | 2/3 | 1/3 | HIGH_REPETITION |
| s04 | mock | PASS | 2/3 | 2/3 | 2/3 | HIGH_REPETITION |
| s05 | demo | PASS | 3/3 | 3/3 | 2/3 | LIMITED_TEMPLATE_QUALITY |
| s05 | mock | PASS | 3/3 | 3/3 | 2/3 | LIMITED_TEMPLATE_QUALITY |
| s06 | demo | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s06 | mock | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s07 | demo | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s07 | mock | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s08 | demo | PASS | 2/3 | 2/3 | 1/3 | HIGH_REPETITION |
| s08 | mock | PASS | 2/3 | 2/3 | 2/3 | HIGH_REPETITION |
| s09 | demo | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s09 | mock | PASS | 3/3 | 3/3 | 1/3 | LIMITED_TEMPLATE_QUALITY |
| s10 | demo | PASS | 1/3 | 1/3 | 0/3 | HIGH_REPETITION |
| s10 | mock | PASS | 1/3 | 1/3 | 0/3 | HIGH_REPETITION |

## Architectural ceiling

The assembler permits 6 hooks, 3 contact-acquisition CTAs and 7 task templates. **0 original editorial words** beyond approved fact quotes and fixed text. Across 140 daily tasks only 7 texts occur; business-specific facts do not rewrite the tasks. With the same selection, changing goal, audience or channel changes **0/20** post bodies. These are assembler counterfactuals, not a prediction that a live model would choose identical selectors. Both test modes use deterministic selectors; mock diversity is authored, not measured AI skill.

Fact-angle count is only a proxy based on fixture annotations, not a semantic assessment. Different hooks cannot conceal identical fact bodies. Audience keyword overlap and word counts do not certify audience relevance or natural German. The benefit metric counts only references to explicitly approved benefit facts and never invents a benefit. CTA goal fit, useful owner actions, readability/naturalness, and regulated-sector suitability require blinded human review.

## Known safety limits, separate from curated success

Approved facts are permissioned text, not verified truth. An already approved malicious instruction or unsupported guarantee is copied verbatim: prompt-instruction isolation prevents treating it as system authority, but cannot make the exported quote safe. Conflicting approved assertions have no semantic conflict detector. Repeated post hooks and seven repeated action templates are schema-valid, although poor content. These negative probes must be detected and classified, not mislabeled as safe marketing. See tests and QUALITY-AND-ARCHITECTURE.md.

The raw Markdown renderer and internal PackService.export are not review gates. The HTTP route requires reviewed=true and the current version; tests verify that actual route. Manual edits remain explicitly not automatically fact checked. No publication capability is exercised.

## Cost evidence

Actual requests/spend: **0 / €0**. Demo counters are zero; mock 1600/700 token fields are fabricated test metadata, never actual token measurements. Five future estimates use the existing byte-bound reservation formula at **configured** €1/€6 per million input/output, max 3000 output. Estimated sum: **€0.101513**, hard authorization envelope max €0.75 each / €3.75 total / operator stop-loss <=€5. No live call is authorized by this report. Rates/model sources, assumptions and admission prerequisites: LIVE-TEST-PLAN.md.

## Reproduce

`npm run marketing:ai:offline` writes deterministic outputs. `npm run marketing:ai:offline -- --check` verifies byte-for-byte reproducibility. Successful execution means evidence was collected, not commercial GO; `--require-go` deliberately exits 2.
