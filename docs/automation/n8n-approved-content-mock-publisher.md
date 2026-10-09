# CITYWALK mock social publisher in n8n

This workflow proves the post-approval state machine for #320 without calling Meta or Instagram.

## Purpose

Local test flow:

```text
Human Review
→ Approved
→ CITYWALK approval webhook
→ n8n validates Instagram + ordered media
→ CITYWALK approved → ready
→ deterministic mock publisher
→ CITYWALK ready → published
→ mock published URL stored
```

The mock publisher does not create an external post. It returns a deterministic URL under `https://mock.citywalk.invalid/` so retries use the same value and exercise CITYWALK's idempotent published transition.

## Import

Import:

`automation/n8n/citywalk-approved-content-publisher.mock.json`

The workflow is intentionally exported as inactive.

Activate it only for local/preview testing.

## Local configuration

The workflow expects CITYWALK on the Mac host at:

`http://host.docker.internal:3000`

The n8n container must expose `CITYWALK_AUTOMATION_SECRET` with the same value used by CITYWALK. The workflow reads it through:

`$env.CITYWALK_AUTOMATION_SECRET`

If your n8n installation blocks environment access in expressions, replace the header expression with an n8n Header Auth credential. Do not commit the secret.

For the end-to-end CMS approval test, temporarily point local CITYWALK to:

`http://localhost:5678/webhook/citywalk-marketing-approved-mock`

through `CITYWALK_MARKETING_APPROVED_WEBHOOK_URL`, then restart the local Next.js process so the environment change is loaded.

The workflow also requires `CITYWALK_MARKETING_APPROVED_WEBHOOK_SECRET` in the n8n container. The validation node compares it with the incoming `x-citywalk-event-key` header before processing the approval event. Do not commit either secret.

## Expected test

Use a social draft with at least one approved public image/video attached.

Then:

1. submit the draft for review;
2. approve it as a human reviewer;
3. confirm n8n receives `marketing.content.approved`;
4. confirm the `Mark Ready` node succeeds;
5. confirm `Mock Instagram Publisher` emits the deterministic mock URL;
6. confirm `Mark Published` succeeds;
7. reload the CITYWALK social item and verify status `published`, `publishedAt` is set, and `publishedUrl` is the mock URL.

Retrying the same n8n execution path is safe for the CITYWALK transitions: ready/published calls are idempotent and the mock URL is stable for the same content id.

## Failure expectations

- unsupported platform: workflow stops before Ready;
- missing media: workflow stops before Ready;
- Ready API failure: workflow stops before mock publish;
- mock/published step failure after Ready: CITYWALK stays Ready and can be retried;
- a retry with the same mock URL succeeds idempotently;
- a different URL after Published is rejected by CITYWALK.

## Not production

Do not use this workflow as the real Instagram publisher. The next step replaces only the mock publisher node with the real Instagram adapter while keeping the validated approval, Ready and Published boundaries.
