# MKT-UX-PRESERVE-07 — owner review

2026-10-24. Canonical branch: `codex/mkt-consolidate-01`. Remote baseline: `7ff7efa32b24fa65feb556729d171dd3389fbf1a`, Draft #425. Local UX commit: `a44c3772214f427000898b7744111adf3cbf0d14`. Documentation/evidence follows as a separate local commit. No push, merge or deployment authorized or performed.

## Implemented

- Optional editable **Einsatzort / Stadt** uses the already-existing versioned `markets` contract, with stable `owner-service-city` ID and compatibility with historical `owner-city`. Other market entries are retained. Blank removes only the dedicated city entry. UI validates length/control characters; the existing server schema enforces the market-name length and sanitization. No database migration, backend endpoint or schema contract change. This is owner-declared context, not automatic factual verification. It does not add the city to generation facts. Existing manual revision behavior invalidates prior fact confirmation.
- Active Better Auth form reuses existing validation rules and green auth styles. Explicit labeled show/hide action, 44px target, pressed state and controlled input association; visibility/input reset across views. Inline field errors retain stable field names, descriptions, invalid states and focus on the first invalid field. Invalid local input never reaches the API.
- Expired/invalid link handling recognizes installed Better Auth INVALID_TOKEN/TOKEN_EXPIRED errors (and compatible TOKEN_HAS_EXPIRED), both callback query and structured API failure. Recovery removes the stale query, offers a new reset request or return to signin, and never claims successful login. E-mail confirmation recovery uses the existing verified-signin flow and local mail sink. Unknown error strings are not displayed as link content. The client retains an error code in an Error subclass; server contracts/security are unchanged.
- API README now links actual configuration, canonical local/CI runners, workflow and existing evidence. Removed references to missing environment template, missing auth report and removed smoke script. No fixed password or real credentials restored.

## Verification

| Check | Actual result |
| --- | --- |
| Focused auth/profile/documentation regressions | 17 passed |
| Full repository units on clean tracked candidate + scoped new files | 1646 passed, 0 failed, 239 skipped |
| Canonical Marketing unit/security selection | 205 passed, 0 failed, 87 skipped |
| PostgreSQL, ten existing suites | 118 passed, 0 failed, 0 skipped |
| Expanded authenticated browser journey | 327 checks passed |
| Closed authentication/protected routes | 25 checks passed |
| D2 curated demo | 271 checks passed |
| API/UI/core TypeScript, Marketing build, migration repeatability/integrity | PASS; seven existing migrations |
| Scoped lint | PASS, zero errors/warnings in changed source/tests; whole Marketing retains three existing image advisories |
| Diff whitespace | PASS |

The new real-API city test checks save/read, edit, clear, >160-character rejection without advancing revision, cross-tenant read/write denial, stale revision rejection and confirmation invalidation. Existing suites retain verified identity, role scopes, reset anti-enumeration, session revocation, tenant boundaries, quotas, source integrity and exact-version exports. Closed signup is tested server-side regardless of client flags.

The browser runner exercises invalid/expired callback states, password toggle and associated errors, profile city editing and persistence across logout/login. Captures and automated axe-tag checks run at 1440/768/390/375; requested 1440/390 captures were visually inspected. No overflow or automated violations in tested states. Local Chrome, synthetic accounts, fresh isolated loopback PostgreSQL databases, mock providers and outbound guard. No real customer data, external emails or live AI calls. The test briefly enables synthetic local registration, then verifies signup closed after restart. Existing retained rate-limit window is honored; no counters or uncertain cost holds are cleared.

One expanded screenshot test initially assumed every page had a workspace header; it was corrected to recognize auth pages while retaining header checks on workspace pages. The final complete run passed. Full repository units include 11 new passing unit tests; the extra skipped case is the added DB integration when no database is supplied, separately executed successfully above. Counts overlap across gates and must not be summed as unique tests.

New local commits have not run on GitHub. Existing green remote CI applies only to 7ff7efa, not this patch. Root Next build was not rerun for this isolated Vite/API/UI change. Real-device, screen-reader, independent human copy quality and commercial release acceptance remain separate.

## Actual screenshots

| State | 1440px | 390px |
| --- | --- | --- |
| Inline errors / accessible password control | [Desktop](screenshots/auth-inline-errors-1440.png) | [Mobile](screenshots/auth-inline-errors-390.png) |
| Expired-link recovery | [Desktop](screenshots/auth-token_expired-1440.png) | [Mobile](screenshots/auth-token_expired-390.png) |
| Active service-city profile | [Desktop](screenshots/service-city-profile-1440.png) | [Mobile](screenshots/service-city-profile-390.png) |

Only these six inspected synthetic screenshots are committed. Private mail, login/session files, database connection details, exports, raw logs and Human Review materials are excluded.

## Preservation and historical closure

117/117 protected Human Review hashes and all 321 pre-existing held untracked file hashes match. D2 source/assets, Concept A overall architecture, CITYWALK sources, dependency/lockfiles, backend auth settings and migrations are untouched. No branch/worktree deletion or independent score change.

#386 at 699a63ea31c15977ed2fb9d756d3f145cc4d5cb0 and #411 at f1986fdb4018966616ce8fd5fbdd9abcdff6604d were already closed unmerged when this task checked them; archival follow-up comments were added under owner authorization. #414 at 3289e31dfafb44be8d1c76d694d723fa075d4ccd and #415 at 684aa76ff871e4b0f825aa053849ad2c70a86860 were also already closed unmerged by the resumed check and have archival comments. This task did not perform those closures. Historical branches/worktrees are retained; Green B presentation remains archival while reusable green identity persists and D2 is canonical.

#383 and #385 remain open. After owner acceptance of this patch and explicit deferrals, they can be archived as obsolete previews, not claimed as fully equivalent runtime implementations. Historical Website/App/Local selector and monthly marketing-budget entry remain deferred; no channel-selection work was added (existing campaign channel selection is unchanged). Four-step preview onboarding and local simulated auth screens are intentionally not restored. The original auth HTML was already absent from historical #385; its archival gap must not be described as newly solved. Historical approved screenshots/research remain linked by immutable commits rather than copied into live routes:

- [#383 onboarding specification/assets](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/d8fd10b2a8054651991898113139577d224b12c2/docs/design/marketing-saas)
- [#385 auth approval and source gap](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/blob/268f2e2e40b2bdc92b9ded2972e261f66744e523/docs/design/marketing-saas/auth-v1-approved.md)
- [#414 brand research/approval evidence](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/3289e31dfafb44be8d1c76d694d723fa075d4ccd/docs/design/marketing-saas/brand-01)
- [#415 original Green B evidence](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/tree/684aa76ff871e4b0f825aa053849ad2c70a86860/docs/design/marketing-saas/brand-02)

## Exact changed-file boundary

UX/test commit:

- apps/marketing-saas/src/PilotApp.tsx
- apps/marketing-saas/src/businessProfile.ts
- apps/marketing-saas/src/businessProfile.test.ts
- apps/marketing-saas/src/api.ts
- apps/marketing-saas/src/auth/AuthForm.tsx
- apps/marketing-saas/src/auth/AuthForm.test.tsx
- apps/marketing-saas/src/auth/formValidation.ts
- apps/marketing-saas/src/auth/auth.css
- apps/marketing-saas-api/src/auth.integration.test.ts
- scripts/marketing-consolidate-browser.mjs

Documentation/evidence commit:

- apps/marketing-saas-api/README.md
- apps/marketing-saas-api/src/readme.test.ts
- docs/qa/marketing-saas/ux-preserve-07/REVIEW.md
- docs/qa/marketing-saas/ux-preserve-07/screenshots/auth-inline-errors-1440.png
- docs/qa/marketing-saas/ux-preserve-07/screenshots/auth-inline-errors-390.png
- docs/qa/marketing-saas/ux-preserve-07/screenshots/auth-token_expired-1440.png
- docs/qa/marketing-saas/ux-preserve-07/screenshots/auth-token_expired-390.png
- docs/qa/marketing-saas/ux-preserve-07/screenshots/service-city-profile-1440.png
- docs/qa/marketing-saas/ux-preserve-07/screenshots/service-city-profile-390.png

Ready for owner review locally. A separately authorized normal push and exact-head CI are required before treating #425 as containing these fixes. No merge/release approval is implied. External paid pilot remains NO-GO.
