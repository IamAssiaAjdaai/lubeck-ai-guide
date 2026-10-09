# AUTO-03 (#321) — Content QA acceptance checklist

This checklist is for the first **Marketing Pages + Social** CMS QA integration.
The generic QA engine also exists independently of the Marketing UI.
Do not close #321 or claim browser acceptance based only on CI.

## Automated gate (disposable database only)

In the existing GitHub CI PostgreSQL job, the \`cms:test:integration\` command
runs both the existing CMS suite and
\`src/lib/admin/marketing/qaEvidence.integration.test.ts\`
with \`CMS_DB_INTEGRATION=1\`. The new suite refuses a non-local database
host, uses unique fixture IDs and cleans up its own records.

Acceptance invariants covered:
- The list of eligible places contains a published, same-city place only when
  an active English verified knowledge chunk is linked to a valid source.
- The bounded fact package includes source IDs and labels, not source URLs.
- Cross-city and unknown-place lookups fail closed.
- Expired or future-verified sources cannot support QA.
- Inactive or other-locale chunks cannot support English marketing QA.
- A source record alone (without a verified chunk) is not evidence.

These are **actual SQL-path checks**, unlike earlier mocked and projection-only
unit tests. They do not verify provider behavior, browser rendering or approval
flows end to end.

## Manual browser acceptance (not yet verified)

Use an **isolated, non-production** instance and disposable/test staff accounts
with genuine city scopes and a dedicated Marketing draft. Do not run the test
against production CMS, database, media, credentials or publishing automations.

1. Sign in as a city-scoped content editor. Open a draft Marketing Page and
   Social draft. Confirm "Run QA" appears on supported pre-approval statuses,
   and never on approved/published content.
2. Enter a missing required field, weak CTA or oversized caption; **save**
   and run QA without a place selection. Verify actionable deterministic warnings
   and explicit non-certification; no Groq request should occur without evidence.
3. Correct the content, save, rerun QA, and verify previous warnings are replaced
   by the new result, not silently preserved. Changing the place selector must
   clear the previous report.
4. Select an eligible published place from the same city; verify only that
   place's verified **English** sources can appear as bounded evidence. Ensure
   warnings remain advisory, not a blanket citywide or multilingual fact check.
5. With a separate reviewer account, check the QA button for \`in_review\`.
   Verify an account without city scope and an ordinary traveler account cannot
   access the QA action or its data.
6. Reject a stale, expired, inactive, wrong-city or forged place selection at
   the **server**; the panel should show a generic safe error with no secrets.
7. Approve/publish only through the existing human workflow; confirm **Run QA**
   never changes CMS status, publishes content, attaches media or triggers n8n.
8. Verify keyboard focus, small-screen layout and the error/pending/empty states.

## Optional provider acceptance (requires separate approval)

Groq stays off by default. To test its bounded contract, use an isolated
test environment, non-production credentials and explicit spend authorization.
Confirm 3/10min/staff, 12/day/staff and 60/day/global quota failures do not
cause provider requests. Verify malformed output, network errors and unknown
evidence references fail closed and expose no secrets. Never turn it on
merely to make a test green.

## Honest completion status

- Generic deterministic + bounded AI QA: implemented.
- Optional budgeted server-side Groq: implemented, **disabled by default**.
- Marketing Page and Social Run QA screens + verified place selection: implemented.
- PostgreSQL trust boundary integration: covered by the added CI suite.
- Live browser Preview and human authorization acceptance: **not yet evidenced**.
- Place/Tour admin Run QA surfaces: **implemented in draft PR** targeting
  `develop`, with deterministic-only Place QA and optional, one-stop-bounded
  verified English Tour QA. They are not browser-accepted or merged yet.
- Place/Tour manual test plan: select a saved `draft` or `in_review` entity;
  check required/long copy, a missing or expired place source, empty tour
  stops and explicit stop durations longer than the tour estimate. Verify
  `in_review` reviewer access, same-city restriction, and that `approved` /
  `published` never show QA controls. In the Tour editor select a verified
  **published** stop; confirm fact citations are restricted to that single
  stop and the panel explains other stops are not certified. Non-English
  locale must offer no English-only verified stops. Never test Publish.
- Place/Tour actual browser acceptance is **still unverified** and not implied
  by CI, just as the earlier Marketing UI acceptance was done separately.
- Per-warning human accept/acknowledgment persistence: **not implemented**;
  current flow shows warnings but leaves human actions in the existing workflow.
