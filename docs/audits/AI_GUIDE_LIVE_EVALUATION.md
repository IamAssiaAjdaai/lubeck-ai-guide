# CITYWALK Guide: local live evaluation and human scoring

Scope: Draft PR #355 only. **No production, no automatic provider calls, no user conversations.**

This harness calls the real local `POST /api/guide` route, which uses the
real content and verified-knowledge pipeline, real prompt, Groq model and
grounding guard. The separate `scripts/evaluate-ai-live.mjs` is only a
standalone model smoke test and is NOT the full CITYWALK pipeline.

## Observed local live cases (2026-10-12, before date-correction prompt fix)

These are **manually supplied results** from two opt-in local calls, not a
reproducible provider trace:

| Fixture | HTTP | Citations | Latency | Human observation |
|---|---:|---:|---:|---|
| `en-supported` | 200 | 1 | 787 ms | Supported answer: 1464–1478 |
| `en-false-date` | 200 | 0 | 1303 ms | **False refusal**: "I don't have enough verified information to answer that." |

The second question asks if Holstentor was built in 1900. Previously retrieved
approved evidence says it was built 1464–1478, so a source-backed correction
should be possible. The visible response cannot distinguish the model's initial
`insufficient_evidence` decision from a grounded candidate rejected by the
strict unsupported-year guard and a final fallback. **Root cause is not proven.**

Mitigation in this audit PR: teach the model to correct date questions using the
verified construction years **without echoing unsupported years**. Preserve the
strict year guard; deterministic tests pin the correction contract and its
limitation. A new one-case live evaluation is required to verify impact.
Do not claim the mitigation worked until that result is reviewed.

## Conversational relevance contract (audit PR only)

CITYWALK should answer the question first, then *optionally* add one short,
naturally related and **cited** fact from verified evidence about the same
subject. The extra fact must help visitors understand the answer; it is not a
generic trivia dump or a reason to mention unrelated previous/future stops.

Example, where the approved Holstentor history chunk already supports all
facts (illustrative target wording, **not a captured model output**):

> No. The Holstentor was built between 1464 and 1478. It also protected
> Lübeck and represented the city's importance during the Hanseatic era.

For unsupported follow-up claims, real-time observations, geography and
cross-stop relationships, the existing strict evidence boundary remains.
The prompt is a style/behavior instruction, not a semantic verification
mechanism; a live human review is still required to confirm actual responses.

## Related historical concepts: city-scoped evidence

A tourist can ask a concept question such as **"What is the Hanseatic era?"**
while standing at Holstentor. The answer must be grounded in a verified
*city-level* historical reference, not restricted to the monument's own
construction and architecture snippets and not fabricated from model memory.

For Lübeck, two curated `__city_context__` chunks are available:
`lubeck-hanseatic-network-context` (medieval merchants and trading cities,
[The Hansa](https://www.hanse.org/en/the-medieval-hanseatic-league))
and `lubeck-hanseatic-city-context` (Lübeck's historic role,
[European Hansemuseum](https://www.hansemuseum.eu/en/)).
Only lexically relevant city background is retrieved. The prompt identifies
this scope separately from current/visited stops and forbids using it to
invent landmark-specific facts or links between landmarks.

Current local tests verify selection, no unrelated retrieval, cross-city
isolation, cited source metadata, and the prompt contract. They do not prove
that the model will answer correctly every time; human-review the live output.

One-case **offline preflight**:

```bash
CITYWALK_EVAL_CASE_ID=en-hanseatic-era CITYWALK_EVAL_MAX_CALLS=1 \
  node scripts/evaluate-citywalk-guide-api.mjs --dry-run
```

Then run with `CITYWALK_RUN_LIVE_AI_EVAL=YES`,
`CITYWALK_EVAL_CAPTURE_ANSWERS=YES`, and the same case ID only when ready
for a real model request (up to two billable attempts). Manually verify that
the answer defines the league, explains the period, connects Lübeck based on
the cited museum source, and does not invent landmark-specific claims.

## Human review: first Hanseatic concept live response

After adding city-scoped verified knowledge, the local opt-in `en-hanseatic-era`
test returned HTTP 200 and a substantive explanation defining the merchant
network and its influence on trade and politics. The factual content matched
the retrieved reference from THE HANSA, and that primary source is publicly
accessible. **But** the answer omitted Lübeck's city-specific significance,
although its source from the European Hansemuseum appeared in the citations.
This is a useful factual definition with a **missing city connection and an
unused citation**, not evidence of a fabricated historical claim.

A second opt-in live run (HTTP 200, 661 ms) returned the same historical
definition and **only the THE HANSA source**, which supports the stated
facts. Its unused museum citation was gone, but the useful verified Lübeck
connection was still missing. This distinguishes citation improvement
from contextual storytelling quality.

After this second observation, the prompt gained a conditional, end-of-context
reminder that identifies the actual retrieved city-background chunk when it
explicitly mentions the current city. The reminder asks for one verified city
connection in concept answers and instructs the model not to cite that chunk
unless the connection really appears in the final answer. The change is
**not yet verified by a subsequent live model run**. Do not label the
connection complete on the basis of prompt tests or source counts alone.

## Before you run

- Check out PR #355 on your local machine. Start the local CITYWALK server
  backed by a development database with the verified Lübeck content.
- Ensure `GROQ_API_KEY` is set in the **server-only** local env, not in Expo or
  `NEXT_PUBLIC_*`. Never paste keys into GitHub Actions or terminal logs.
- Provider calls can incur fees. This script is **disabled by default**, caps
  itself at five HTTP requests, and each server request can trigger up to two
  model attempts. The cap is not a currency ceiling.
- HTTP origin must be localhost; remote/prod URLs are rejected.
- Questions are synthetic fixtures. Never replace with personal chat logs.

## Step 15: zero-cost CLI preflight

Run the exact evaluation harness in **offline dry-run mode** before any
provider-funded test:

```bash
node scripts/evaluate-citywalk-guide-api.mjs --dry-run
```

The preflight validates the loopback target and request cap, lists only
synthetic fixture IDs, and reports `performedHttpRequests: 0` and
`performedProviderCalls: 0`. It does not require `GROQ_API_KEY`,
`CITYWALK_RUN_LIVE_AI_EVAL=YES`, local content, or a running server.
It does **not** measure model accuracy. Automated tests verify this CLI path,
an invalid request limit, and rejection of remote URLs.

A real evaluation still requires explicit opt-in, a local configured
server, and a valid provider key; each HTTP request may trigger two model
attempts. The preflight request ceiling is not a monetary cost cap.

## Select one fixture without repeating previous calls

The optional `CITYWALK_EVAL_CASE_ID` must exactly match an existing
synthetic fixture ID. This skips previously reviewed questions and keeps the
real model-call count small. The following preflight does not use credits:

```bash
CITYWALK_EVAL_CASE_ID=en-false-date CITYWALK_EVAL_MAX_CALLS=1 \
  node scripts/evaluate-citywalk-guide-api.mjs --dry-run
```

The corresponding **opt-in live run** can be launched after preflight with
`CITYWALK_RUN_LIVE_AI_EVAL=YES` and optional
`CITYWALK_EVAL_CAPTURE_ANSWERS=YES`. One request can still trigger up
to two billable attempts. Unknown IDs are rejected before any network call.

## Run one or two real local requests

```bash
CITYWALK_RUN_LIVE_AI_EVAL=YES CITYWALK_EVAL_MAX_CALLS=2 \
  node scripts/evaluate-citywalk-guide-api.mjs
```

Default output contains only fixture IDs, status, timing, citation counts and
whether the response mentions the test year 1900. This is **smoke telemetry**,
not a claim that the text is true.

## Optional private human scoring

```bash
CITYWALK_RUN_LIVE_AI_EVAL=YES CITYWALK_EVAL_MAX_CALLS=2 \
CITYWALK_EVAL_CAPTURE_ANSWERS=YES \
  node scripts/evaluate-citywalk-guide-api.mjs
```

This writes synthetic questions, answers and citation metadata into a private
OS temporary directory. The console shows the local `manual-review.json` path
but does NOT print answer text. The directory is outside the repository,
created with restricted permissions, and must be deleted after use. Do not
upload or commit this file.

For each result in `rows`, review the complete answer against the actual
approved factual chunks. Replace `humanVerdict: "unreviewed"` with exactly
one of:

- `supported`: every material factual claim follows from actual **cited**
  verified evidence, and the question is answered. A safe correction of
  "1900" to "1464–1478" can be supported.
- `unsupported`: any material factual claim is unsupported, contradictory,
  or relies on a fake/irrelevant source.
- `refusal`: does not answer factually and correctly states there is
  insufficient evidence. When evidence *is* sufficient, this is a
  **false refusal**.
- `unreviewed`: cannot yet make a reliable judgment. Never guess a label.

Review `en-supported`, `de-supported`, `en-false-date`, and `en-injection`
as answerable questions. The `en-unanswerable` question asks for a date-specific
paint color not established in the fixture corpus and should refuse if there
is no additional verified support.

Then run (substitute the path reported in your own output):

```bash
node scripts/evaluation/score-citywalk-guide.mjs "/path/to/manual-review.json"
```

Metrics with explicit denominators:
- **Factual support rate:** supported / (supported + unsupported).
  Refusals are excluded from that denominator.
- **Unsafe answer rate:** unsupported / all human-reviewed cases.
- **False refusal rate:** refusals on answerable fixtures / reviewed
  answerable fixtures.
- **Correct outcome rate:** supported answers on answerable fixtures plus
  refusals on unanswerable fixtures / all reviewed cases.

When there are no reviewed cases or no applicable denominator, metrics are
`null`, not 100%. These scores describe a **tiny synthetic set**, not user
accuracy, confidence intervals, or independent expert agreement. Cite sources
for manual verdicts and consider double review for launch decisions.

## Privacy and limitations

- No review content is printed to stdout by default.
- Captured material may still contain model-generated sensitive text; do not
  run this on user data and delete the private temp directory afterward.
- The API does not expose provider token totals/cost; the harness does not
  claim to measure API spend.
- An answer mentioning "1900" might be **refuting** a false claim, so mention
  detection is for reviewer attention only, never automatic failure.
- Provider/network failures, anonymous quotas or missing dev content may cause
  non-200 responses. Investigate these independently of factual quality.
- Live quality benchmarks need more balanced fixtures, bilingual human
  reviewers, proper support attribution and latency/cost instrumentation.
- **Do not merge/launch based solely on a green CI or these scores.**
