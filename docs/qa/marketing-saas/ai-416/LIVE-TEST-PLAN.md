# Future bounded live test — proposal only, no execution

**No live request, credit spend or credential setup is authorized by #416.** The offline CLI has no live switch, refuses unknown arguments, ignores ambient enable flags and blocks runtime network/child execution. This document is not an executable live runner.

## Documentation snapshot and proposed candidate

Checked **2026-10-22 Europe/Berlin** using official documentation, without an API call: [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) lists Responses, Structured Outputs, snapshot `gpt-5.4-mini-2026-03-17` and standard text pricing **USD $0.75 input / $4.50 output per million tokens**. [Official pricing](https://developers.openai.com/api/docs/pricing) is the price reference. This is a proposed bounded selector-test candidate, not a claim of German copy quality or account availability. Recheck model access, rates, snapshot and service tier immediately before any separately authorized run. Do not substitute a model silently.

No cache, batch or promotional discount is assumed. Proposed **configured** EUR rates: €1 input / €6 output per million. They conservatively round above published USD rates converted at an explicit hypothetical 1.20 EUR/USD budget factor (not a market FX quote). If actual exchange, taxes, tier/region uplift or vendor prices invalidate that margin, halt and re-approve the configuration. No vendor invoice/FX amount has been measured.

## Five representative synthetic runs

Exactly one request each, sequentially: s01 office cleaning (B2B inquiries); s03 tax office (regulated information); s04 physiotherapy (medical visibility); s06 building cleaning (customer retention); s10 scarce-fact garden service. They span the three goals/channels and both regulated categories. No ten real-customer requests or automatic repeats.

Use the existing selector prompt/schema, max 3000 output tokens, 20-second timeout, no SDK retries, tools or storage. Per-run reservation follows the actual service formula `ceil((UTF8_JSON_prompt_bytes + 1024) × inputRate + 3000 × outputRate)` in micro-EUR. Byte count is a conservative input-token estimate, not tokenizer measurement. Current fixture-specific bounds and exact sum are in `results.json` and the generated baseline report: **€0.101513 configured estimated total**, not actual spend.

Hard authorization envelope: **<=€0.75 maximum reservation per attempt; <=€3.75 cumulative authorized reservation for five attempts; operator stop-loss <=€5**. Lower actual estimates do not authorize more attempts. No retries after timeout/invalid output. A failed or uncertain request still consumes one of five attempts and retains its reservation until reconciliation.

## Compatibility and prerequisites

- Starter allows 4 attempts and a €5 tenant budget; it cannot admit all five in one organization/month. Use a separate synthetic **Growth** tenant (12 attempts, €12 budget), with at least five unused slots and sufficient remaining budget. Never reset production usage to accommodate a test.
- Existing default shared ceiling is €10. Before a live test, use a separately reviewed isolated operator runner that injects the existing `PackService` constructor's `globalBudget=5_000_000` (micro-EUR), rather than pretending an unsupported environment variable changes the server's default. This branch does **not** enable or implement that live runner. Lower the project's/operator's external spend controls as appropriate and verify the stop rule before sending anything.
- Run sequentially (max concurrency 1, below current 2), five calls within the six/user/minute and twelve/org/minute ceilings. Stop on any admission failure; never work around quota/rate/idempotency limits.
- Obtain explicit owner authorization for the five fixtures, exact snapshot, rates/FX allowance, maximum sums, operator stop-loss and credential reuse/setup. Secure credentials must be handled separately; never paste them into this report or the offline artifacts.
- Verify exact requested vs resolved model and charge rates. Current code records resolved model but does not prove it has the configured price. Any mismatch or missing usage halts the test; do not call configured-rate estimates measured vendor cost.

## Recording and stop conditions

Record actual returned input/output token usage, the request's immutable ID/status, model/snapshot, configured rate estimate, reservation, elapsed time, error/retry counts and separately reconciled vendor charge. Output token usage includes whatever the provider bills under its published rules; validate rather than assuming character counts are tokens. No real API usage or charge is available in this offline branch.

Stop after five admissions or any missing usage, uncertain transport error, invalid/schema/policy output, unsupported fact, unresolved model mismatch, over-reservation usage, near/over €3.75 authorization or €5 operator threshold. Retain reservation/attempt and investigate; never grant an automatic refund/retry or republish content. Existing global blocked flag handles over-reservation after a result, and new tests verify it.

Application reservations and an operator stop-loss are **not a guaranteed vendor billing hard cap**; errors, delayed billing or price/model drift require external monitoring and reconciliation. If the operator cannot enforce the approved risk envelope, the live test remains blocked. A separate reviewed live-run implementation is a prerequisite, not something this offline suite silently permits.

Successful live tests would still require blinded human scores and all legal, privacy, email, operations, public-access and commercial-release gates. No deployment, publishing, public collection, billing or real customer traffic is part of this plan.
