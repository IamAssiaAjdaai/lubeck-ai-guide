# CITYWALK API Preview — Cloudflare custom-domain release gate

**Target:** `https://api-preview.getcitywalk.com` -> isolated `citywalk-api-preview` Worker.
**State:** NOT PROVISIONED / NOT DEPLOYED. Keep `CITYWALK_PREVIEW_DEPLOYMENT_LOCK=1`, `workersDev=false`, `previewUrls=false`, `domains=[]` and `triggers=[]` until a separately reviewed release change.
This is an operator checklist, **not deployment authorization**.

## Evidence already verified (2026-10-24)
- Operator's Cloudflare dashboard shows no project matching `citywalk-api-preview`; it shows `citywalk-visual-preview` and `citywalk-production`. Visual Preview is **not** the API Preview backend.
- A separate Neon project `citywalk-preview-db` exists; its `citywalk_preview_app` database contains 25 places, one city, 43 content sources and 42 place/source links, but **synthetic-only provenance is not established**. The `user` and `session` tables are empty.
- The existing `citywalk_preview_app_runtime` role can SELECT a subset of content (15 tables); it cannot SELECT users/sessions or write places. PR #439 removed the incompatible `/api/auth/get-session` route from the Preview allowlist.
- Native Preview source is committed and CI tests its locked security contract. `tools/native-api-preview/prepare.mjs --fixture` produces **offline dry-run fixtures only** and cannot provision or deploy a live Worker.

## Stop gates — verify privately, in order
1. **Cloudflare account/zone:** record owner-approved account and zone internally; inspect all existing DNS records and Worker routes for `api-preview.getcitywalk.com`. Verify no record or route conflict; do not edit the apex, www, production API, `citywalk-production`, or `citywalk-visual-preview`.
2. **Neon target:** privately pin distinct Neon project, branch, **direct (non-pooler) endpoint**, `citywalk_preview_app` DB and a restricted runtime role. Independently confirm production resource identities differ, least-privilege grants, synthetic-only source/import provenance and schema/migration compatibility. Do not clone production data or run migrations without separate approval.
3. **Hyperdrive:** create a **new Preview-only Hyperdrive**, bound to that direct Neon endpoint with TLS, database and runtime user. Compare the actual Hyperdrive origin/role/database against independent Neon inventory in Cloudflare control plane. Never reuse Production Hyperdrive or fixture ID; don't commit connection strings, IDs requiring privacy, credentials or inventories.
4. **Other bindings:** independently isolated media bucket/credentials and auth secret; no production environment fallback, webhook, AI, payments, mail or storage credentials. Validate exact artifact binding list and offline JWKS, issuer, audience, subject allowlist for **one personally invited tester**.
5. **Preview code and artifact:** prepare a separate, exact-revision *real-resource capable* build path with an explicit production-resource denylist and generated artifact attestation. The existing fixture-only prepare script must NOT be passed off as a real deployment path. Keep CI without production/deploy credentials by default; require human-reviewed, Preview-only release approval before a live build or remote operation.
6. **Safe worker creation:** after gates 1–5 are met and explicit Preview-only deployment approval, create/deploy `citywalk-api-preview` *without* public workers.dev or custom domain initially; verify locked response and bound resources via account inventory. No production worker edits.
7. **Domain activation:** only then approve `api-preview.getcitywalk.com` as that Worker’s **Custom Domain** (Cloudflare can automatically create DNS/certificate). Do **not** manually point A/AAAA to a guessed IP or bind it to visual Preview / production. Verify HTTPS certificate and exact host; verify apex and other routes remain unchanged.
8. **Acceptance:** unauthenticated / wrong-host / wrong-issuer / uninvited / expired tokens denied; approved tester short-lived RS256 access token succeeds on authorized *read-only* paths; write, session, staff, payment, webhook and provider routes denied. Confirm no browser CORS or token leakage, and on-device Android PKCE before claiming mobile ready.

## No-go conditions
- Unknown or copied production content; missing private source rights attestation; missing Hyperdrive origin proof; missing IdP client/PKCE acceptance; unsafe DNS/route overlap; non-locked artifact; any required secret missing; test failures. Leave domain absent and Worker locked.
- Production `main` stays protected. No develop-to-main blanket merge or production release is part of this procedure.

Track the remaining gates in GitHub issue #438. PRs #436, #437 and #439 contain the currently approved locked Preview boundaries.
