# Native API Preview proposal — LOCKED / owner review required

## Private Hyperdrive connection diagnostic — code-only, OFF

`hyperdriveProbe.ts` defines a read-only `SELECT 1 AS probe` check against a future verified **Preview-only** Hyperdrive binding. It returns only pass/fail, has short timeouts and closes the client. Its default HTTP handler always returns 503. There is no worker configuration, domain, route, schedule, script, CI action or deployed instance that invokes the real probe.

The accompanying tests use mocked clients exclusively; passing them does NOT establish an actual Neon connection or verify TLS. A separate, explicitly approved private invocation plan must verify Hyperdrive config ID, runtime DB role, direct Neon origin, TLS and no production binding before any Cloudflare-side diagnostic. Keep it inaccessible via public worker.dev and domain. The operator must still prove actual Cloudflare Query >0 and accurate result before calling connectivity PASS.



This is a separate design/implementation change stacked on PR #419 at
`c490437a426864df3442ef8df0b4f4fafcb69eb3`. Its branch/configuration/entrypoint
remain unchanged. This alternative target would eventually serve
**https://api-preview.getcitywalk.com**, using only `citywalk-api-preview`.
It is not deployed or usable by a device yet. No database or Cloudflare access
is performed by these tools. Production configuration, API/auth origin and
database are untouched. Do not run a bare deployment from the repository root.

Classification: Mobile Core backend access required (Android implementation and
device acceptance still pending; iOS separately unverified); Public Web backend
infrastructure required; Admin Web not applicable. No mobile app behavior or
production route is changed here.

## Optional one-person offline JWT pilot (not OAuth login)

For an explicitly approved, short-lived developer-only **manual API smoke test**, an offline RS256 signer is available at `tools/native-api-preview/local-tester-jwt.mjs`. This is **not** an Android/iOS login mechanism, a substitute for PKCE on distributable mobile builds, or approval to open the API publicly. There is no unattended token refresh. No private key or token may be in the repository, CI, logs, app binaries or tickets.

Run **only on a trusted operator computer** with a private absolute path outside the repo; keep the generated private key in an operator-controlled secure location. Example (replace local path, issuer, client ID and subject with privately approved values):

```sh
node tools/native-api-preview/local-tester-jwt.mjs init /private/safe/location/citywalk-preview-test.pem
node tools/native-api-preview/local-tester-jwt.mjs token /private/safe/location/citywalk-preview-test.pem https://issuer.example.test/ citywalk-preview-test-client tester-1
```

The first command exclusively creates a private 0600 RSA key and prints **only its public JWKS**. Store/pin this public JWKS as `CITYWALK_TESTER_JWKS` in the Preview environment after independently verifying it. Keep the private PEM secret off GitHub and Cloudflare. Use the same exact issuer, client ID and **one subject** for Preview-only `CITYWALK_TESTER_ISSUER`, `CITYWALK_TESTER_CLIENT_ID` and `CITYWALK_TESTER_SUBJECTS`. The second command prints a sensitive JWT valid for five minutes; never paste it in chat or shell-history parameters. Avoid screenshots containing tokens. Revocation before expiry requires disabling/removing the trusted key or subject. A manual token in a private test client grants only entry to the protected read-only route surface, never traveler authentication/entitlement.

The Worker must remain deployment-locked and the custom domain disconnected until resource provenance, TLS, storage, secrets and safe traffic exposure are separately approved. Do not place the token generator or signing key on a device. For repeatable **mobile** testing, prefer an approved device identity flow (e.g. OAuth public native PKCE) rather than distributing manually signed bearer tokens.

## Tester access decision

Use an independently approved Preview identity provider supporting a **public
native OAuth client**, Authorization Code + PKCE **S256**, exact redirect URI,
and the system browser. No client secret, shared Preview access token or
Cloudflare service-token pair belongs in an APK, Expo public environment,
source, OTA update or build log. This follows [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html).

Future Android wiring (not implemented/activated in this PR):

1. Generate fresh verifier/challenge and state per login; launch the external
   system browser. Register a distinct Preview application/client and exact
   callback; validate state and redirect before exchanging the code. No WebView.
2. Obtain a Preview-only access JWT for this API audience and
   `citywalk:preview:read` scope, issued only to individually invited testers.
   Use the IdP's supported native flow; never repurpose an ID token. Provider
   selection, registration and PKCE/device acceptance require owner approval.
3. Send that short-lived personal token in `X-Citywalk-Tester-Token`, over TLS.
   This deliberately leaves `Authorization` and Better Auth cookies available
   for the separate traveler session. No access token in query parameters,
   deep links, screenshots, analytics or logs. Hold access tokens in memory;
   any separately approved refresh token uses Android secure storage, rotation
   and revocation. Clear both on logout. Stop requests on 401; do not retry with
   production or another base URL. Never forward tester headers across redirects.
4. The Worker validates RS256 against a bounded **offline public JWKS**, pinned
   issuer, exact single audience, native client ID, explicit subject allowlist,
   scope, issuance/expiry (maximum five minutes) and access-token type
   `at+jwt` ([RFC 9068](https://www.rfc-editor.org/rfc/rfc9068.html)). Reject
   unknown keys, symmetric/unsigned tokens and all ID tokens. No remote discovery
   or token-directed JWKS fetch occurs. This PR does not host a token issuer.
5. Remove a tester from the private allowlist and revoke IdP sessions for
   offboarding; existing bearer tokens are replayable until expiry or updated
   allowlist reaches all deployed instances. Pin/rotate only approved public
   signing keys with a short overlap. Never supply private signing keys here.

The perimeter strips tester and obsolete shared-token headers before application
delegation. Traveler identity, staff permissions and entitlements remain the
application's responsibility; a tester token grants none of them. Session
cookies, application Authorization, method, URL, status and response cookies
are preserved. Review cookie Domain/SameSite behavior on the separate host
before enabling any traveler sign-in. No wildcard production cookies.

Initial application surface inherits #419's bounded GET/HEAD/OPTIONS content,
health and get-session paths only. No auth writes, purchases, webhook actions,
AI, outbound email, administrative/media operations or scheduled handlers.
Even a valid tester cannot enable these. `get-session` may refresh a session in
the underlying auth layer; the future DB role and session policy must explicitly
support/review that behavior before native auth acceptance. This is **read-focused
Preview API preparation**, not full traveler sign-in/payment parity. Browser
Origin requests are denied; native HTTP needs no CORS. Adding browser use or
more native routes requires a separate least-privilege review.

## Custom hostname: design only, no DNS side effects

Runtime requires exactly `https://api-preview.getcitywalk.com`; the apex, www,
workers.dev/version URLs, alternate hosts/ports and lookalikes are denied. The
separate typed config keeps `domains: []`, `triggers: []`, `workersDev: false`,
`previewUrls: false` and deployment lock **1**. Its artifact validator rejects
even the proposed domain while this approval is absent. No wildcard route or
static replacement is proposed. Worker-first assets have no SPA fallback.

[Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
automatically create DNS records and certificates. Adding a domain in a config
is therefore an infrastructure operation, not harmless scaffolding. A future,
separately approved change must select only this exact hostname, confirm zone
ownership, absence of conflicting records and existing Worker routes, TLS
certificate readiness and that the apex/mobile production origin is unchanged.
Do not enable wildcard routes or unreviewed workers.dev access. Browser Access
cookies are not assumed to authenticate Android HTTP; no shared Access service
credential is proposed. Abuse/rate limits and token-header redaction must also
be accepted before exposure. Claimed HTTPS Android App Links would additionally
need Preview-only package/signing certificate/Digital Asset Links approval;
this PR adds no production app association or domain record.

## Private resource verification — mandatory before any unlock

`verifyResourceIdentity` is an offline fail-closed comparison of independently
verified private inventories, **not a control-plane lookup or database test**.
Do not paste inventories or credentials into chat, PRs or CLI arguments.
Missing values/attestations block. Require:

- Independent Preview Neon project, branch, endpoint, database and restricted
  role; all different from privately inventoried production identities. Require
  a clean synthetic-only database, never a data-bearing production branch copy.
  Schema readiness/migrations are a later separately authorized operation.
- Independently owned Preview Hyperdrive ID, different from production and
  the unprovisioned fixture. Match its actual configured origin host, database
  and role to Neon. A different ID/name cannot prove isolation. Use Neon's
  **direct non-pooler endpoint**, because Hyperdrive performs pooling; see
  [Cloudflare's Neon guidance](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/).
  Privately verify TLS/hostname/CA, independent credentials, non-superuser,
  no RLS bypass and only reviewed application privileges. No DB grants or
  connections are made here.
- Separate storage bucket, endpoint and scoped credentials; no production read
  access. Independent Better Auth secret and exact Preview URL, webhook/provider
  configuration disabled and no inherited live keys. There is no DATABASE_URL
  fallback. Empty/unexpected bindings fail closed.
- Private `CITYWALK_PREVIEW_RESOURCE_PINS` attestation contains verified branch,
  direct host, DB/role and bound Hyperdrive ID with `syntheticOnly` and
  `originVerified` true. Runtime checks the declared ID against the generated
  bound-ID text and DB/user against the proxy connection string. The runtime
  **cannot see the Hyperdrive origin**: these pins and booleans are assertions,
  not independent proof. Private control-plane verification and a later
  separately approved bounded Preview-only database identity test remain gates.

`CITYWALK_TESTER_ISSUER`, `CITYWALK_TESTER_CLIENT_ID`, `CITYWALK_TESTER_JWKS`,
`CITYWALK_TESTER_SUBJECTS` and the resource pins are server-side bindings. Client
ID/public keys are not shared secrets, but subjects/resource metadata are kept
private. The exact list is in `nativePreviewBindings.mjs`. None is supplied here.

## Exact-commit build provenance

After this change is committed and the tracked tree is clean:

```sh
node tools/native-api-preview/prepare.mjs --fixture
```

This supports the original offline fixture mode. A second **offline, locked, reviewed-ID dry run** can bind a non-production, non-fixture Hyperdrive ID into the generated artifact. It does not query Cloudflare or Neon, does not read credentials, cannot prove that the resource exists or is correctly configured and **never uploads or deploys**. The target still has no routes/domains and deployment lock 1. Only after verifying the specific ID independently in Cloudflare and obtaining approval, run locally (not in GitHub logs):

```sh
CITYWALK_PREVIEW_HYPERDRIVE_ID='<verified-preview-hyperdrive-id>' \\
  node tools/native-api-preview/prepare.mjs --reviewed-preview-id-dry-run
```

Keep the full manifest local, review generated config and require separate gated implementation/approval for real upload. This is **not** a real-resource deployment or acceptance test. Never include secrets or a connection string in the environment variable.

It reads full HEAD/tree from Git, rejects tracked drift and materializes only
Git blob bytes (no working-tree/untracked injection, symlinks or submodules).
It hashes production config without copying or executing it; `.env.example` is
hashed but omitted. It installs dependencies from that committed lockfile with
`npm ci --offline --ignore-scripts` into the new snapshot. Workspace packages
point into the snapshot, never the developer's working tree. Missing cache or
native dependencies fail the build; there is no network fallback. Children
have an empty HOME and explicit environment with denied TCP/TLS/fetch, no
inherited `.env`, DB URL or platform credentials.

The isolated canonical config chooses this native entrypoint; full SHA and
bound Hyperdrive ID become exact text bindings. Build using installed Vinext
and Vite; validate **generated output**, then invoke the supported installed
cf `deploy --prebuilt --dry-run --worker citywalk-api-preview` in the isolated
workspace. This is a dry run only, with no account/credentials/upload. Compare
all artifact hashes before/after. Record full commit/tree, source manifest,
lockfile hash, copied font input hashes, bundle and artifact manifest hashes.
Pre-existing fonts remain separately hashed build inputs, not Git provenance.
No claim of reproducible dependency bytes beyond npm lockfile integrity or
of remote deployed identity is made. Never substitute a fixture artifact for
real-resource acceptance or relabel a dirty build with HEAD.

## Ordered operator approval checklist — STOP at each missing item

- [ ] Review this separate Draft and dependency #419; approve the native token
  contract, route surface and residual bearer replay window. Keep both locked.
- [ ] Privately approve IdP/public Android client, PKCE, redirect, tester
  invitations, key rotation, offboarding and header/log redaction policy.
- [ ] Separately authorize any provisioning; independently verify complete
  Preview/production deny inventories, synthetic data, Hyperdrive origin, TLS,
  least privilege, storage and independent auth. Do not copy live secrets/data.
- [ ] Separately approve schema setup if needed. No migration is authorized by
  this PR. Perform bounded Preview-only identity/schema acceptance only under
  its own permission. Record sanitized results and private evidence references.
- [ ] Approve exact-host DNS/certificate/abuse controls and no production
  route overlap. Domain association requires explicit infrastructure approval.
- [ ] Build committed candidate; review full source/artifact manifest, exact
  generated Worker/bindings, dry-run result and lock. Freeze artifacts. A future
  real-resource artifact needs an explicitly reviewed preparation path.
- [ ] Before any upload, privately record the Preview Worker's own current
  version/traffic/config and rollback authority. No production version rollback.
- [ ] Obtain separate authorization for a reviewed lock change, secret setup,
  upload and domain activation. No unlock switch or deployment command is
  provided here. Rebuild/retest the exact changed commit before exposure.
- [ ] On the authorized deployed version, check 503 locked behavior first;
  later verify individual token success/revocation, no-token/wrong-host rejection,
  app/DB identity, real content and production isolation, with providers still
  disabled. Record Android device/browser login, cookie/session and entitlement
  rejection evidence independently; iOS remains its own acceptance gate.

Rollback/removal, later authorization only: stop tester traffic on unexpected
origin/auth/data/provider behavior; revoke only Preview tester access, restore
the Preview Worker's own known-safe locked artifact/version and disable its
exact custom-domain mapping if approved. Retain private evidence. Remove only
inventoried Preview resources after retention review, never production/shared
resources. No operational rollback is needed now because nothing was changed.

Local gates:
`node node_modules/vitest/vitest.mjs run --config tools/native-api-preview/vitest.config.ts`,
the unchanged #419 focused suite, scoped TypeScript/ESLint, commit-only full
Worker/assets build, generated-artifact dry run and compiled locked smoke.
Actual results belong in the PR; local synthetic tests do not verify Neon,
Cloudflare, IdP configuration, reachable custom domain or Android device use.
