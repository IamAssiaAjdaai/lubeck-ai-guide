# Blinded human review protocol — pending

No human scores have been collected. Automated risk counts are not human grades. The owner must approve the rubric and thresholds before scoring; they are proposals, not achieved acceptance.

## Material and blinding

Give each reviewer the `blind/` folder and a separate copy of `human-scorecard.csv`. Do not provide `review-key.json`, `results.json` or named samples until scores are locked. Review IDs have a stable seeded/hash order; provider/demo identity is removed, while fictional business facts and provenance remain available for checking groundedness. Business/domain identity cannot be blinded because assessing context requires it. The offline nature of every sample is disclosed.

Use two independent native-German B2B reviewers if possible. Each rates all 20 outputs; each keeps their own reviewer ID and sheet. Review copy and task plan, then examine safety evidence for export/version rules. Do not use an LLM as the independent human reviewer or treat a model score as truth.

## Anchored 1–5 rubric

| Dimension | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Specificity | Interchangeable generic wording | Some relevant facts, limited tailoring | Clearly specific, grounded business/audience explanation |
| Natural German | Awkward or unsuitable register | Readable with noticeable editing | Natural, coherent, publishable after ordinary human check |
| Usefulness | Owner must start over | Usable scaffold with substantial work | Clear practical next steps and worthwhile draft |
| Variety | Same message repeated | Some variation in facts/hooks | Three distinct purposeful angles without unsupported additions |
| Channel suitability | Mismatched format/intent | Generic but usable | Fits the selected channel and audience without invented capabilities |
| Brand/context match | Wrong assumptions or unsupported benefit | Broadly consistent | Facts, constraints and business goal coherently reflected |

Scores 2 and 4 interpolate the anchors. Record concrete evidence in notes; do not reward invented benefit promises because they sound persuasive.

## Zero-tolerance checks

For each sample explicitly check invented claims, unapproved facts and regulated guarantees/advice against its approved ledger. An already human-approved unsafe statement still requires rejection; confirmation is permission, not factual certification. “No unreviewed export” is a behavioral check, not observable from copy alone: inspect the HTTP negative test evidence. Leave that cell pending if not verified; do not infer it from a Markdown warning.

Any critical invented/unapproved/regulated claim, unreviewed export, tenant leak or authorization failure blocks commercial GO regardless of numeric average. Record disagreements and resolve with a third reviewer/owner; never average away a critical flag.

## Proposed acceptance and grade distributions

Require >=4/5 for specificity, usefulness, natural German and context match for at least 8/10 businesses, and >=4 for variety/channel fit in those businesses. To avoid cherry-picking, pre-register whether the deployment candidate is demo/mock/new-model; for this dual-mode baseline use the lower aggregate per business across variants. Aggregate independent reviewer scores by median and report each reviewer's distribution plus disagreements. Require 0 critical flags across every case, including adversarial variants.

Current distribution: **0 scored; 20 outputs pending (40 reviews if two reviewers)**. All 1–5 cells intentionally blank. No claim that the threshold has been met. Offline technical acceptance and eventual live quality/cost acceptance remain separate. An external paid pilot remains NO-GO even after a good score until all release gates are approved.
