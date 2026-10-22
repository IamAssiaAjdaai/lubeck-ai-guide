# Isolated CITYWALK API Preview — preparation only

**Owner review required. No upload/deployment is implemented by these tools.**
Public Web/backend infrastructure: required. Mobile Core and Admin Web: not
implemented here; no device or deployed-runtime acceptance is claimed.

## Target selection verified against installed code

Tested with `cf@1.0.0-beta.12`, `vinext@1.0.1`, `@vinext/cloudflare@1.0.1`
and the locked Cloudflare Vite integration. The installed CLI discovers the
canonical `cloudflare.config.ts` in its working directory/ancestors
(`cf/dist/project-settings-*.mjs`). The Vite plugin reads the canonical file
at its root (`loadCloudflareConfig` in its installed `dist/index.mjs`).
Vinext's typed-config deploy adapter consumes `.cloudflare/output` through
`cf ... --prebuilt` (`buildCfDeployArgs` in `@vinext/cloudflare/dist/deploy.js`).
Its `deploy --dry-run` only checks scaffolding; it does **not** inspect/build
the generated Worker. Wrangler `--config`/`--name` flags are not a substitute
for selecting a typed target.

`prepare.mjs` makes a fresh ignored `.citywalk/cloudflare-api-preview/candidate-*`
workspace from tracked source plus this feature's files, excludes all `.env*`
and `.dev.vars*` files, and writes a canonical config that imports **only**
this Preview config. It never overwrites the repository's production config
or output. It selects the separate Vite config with Vite's supported `--config`
option. Production Vite/Cloudflare config is not imported or executed. This
works without adding a mode branch to production configuration.

The Vite plugin uses supported `remoteBindings: false` and
`types.includeRuntime: false` options. The latter avoids launching Workerd
merely to regenerate compatibility types; separate compiled-Worker testing
uses real local Workerd. Vite production optimization mode is independent of
the Worker's explicit `CITYWALK_RUNTIME_ENV=preview` identity.

## Safe local preparation

Install the committed lockfile with Node 22. Run from the repository root:

```sh
node node_modules/vitest/vitest.mjs run --config tools/cloudflare-preview/vitest.config.ts
node node_modules/typescript/bin/tsc --noEmit -p tools/cloudflare-preview/tsconfig.json
node node_modules/eslint/bin/eslint.js src/cloudflare/preview* tools/cloudflare-preview --max-warnings=0
node --import tsx tools/cloudflare-preview/prepare.mjs --fixture
```

Fixture mode deliberately uses an unprovisioned all-zero Hyperdrive ID,
no credentials and a locked Worker. It is **not** acceptance of a real resource.
The CLI default (without `--fixture`) fails before building unless the owner
privately supplies `CITYWALK_PREVIEW_HYPERDRIVE_ID` from independently verified
Preview resource metadata. Never substitute the production ID. This public
resource identifier is the only operator input carried into the build.

The child processes receive a new empty HOME, no Cloudflare profile/token,
no inherited DATABASE_URL/provider keys and no environment files. TCP, TLS and
fetch are denied by `network-guard.mjs`; local IPC remains available. Existing
Vinext font-cache files are copied and path-rewritten into the workspace;
a missing cache fails offline rather than downloading dependencies. Populate
that cache in a separately reviewed dependency-only step if necessary; do not
remove the network guard or provide production credentials to fix a build.

The preparation command builds a full Vinext Worker/SSR/assets artifact,
checks the **generated** config and exact binding/secret set, then runs:

```text
# Executed internally ONLY in the fresh, verified Preview workspace:
cf deploy --prebuilt --dry-run --worker citywalk-api-preview
```

`--dry-run` is confirmed in the installed cf help and by actual execution.
No upload occurs. The CLI's calculated “Total Upload” size is not a deployment.
The contract rejects production/other Worker names, production Hyperdrive,
wrong resource IDs, extra/fallback/provider bindings, unlocked artifacts,
custom domains/routes, public Worker/version URLs, schedules, queue/email
triggers, extra root resources and SPA fallbacks. All requests run the Worker
first. There is exactly one output Worker. Every output file is scanned for
the known production Worker/Hyperdrive identifiers and SHA-256 manifested.
`report.json` includes revision, config/bundle hashes and the full artifact
manifest digest; `source-manifest.json` records the copied source bytes.
Production config bytes are rechecked unchanged after the dry run.

To test that exact manifested artifact (substitute its printed directory):

```sh
node tools/cloudflare-preview/smoke.mjs .citywalk/cloudflare-api-preview/candidate-EXAMPLE
```

This launches disposable local Workerd and a new loopback TCP tripwire, **not**
a database/container. All ten tested routes must return the generic locked
503 response, with zero tripwire connections and zero outbound HTTP requests.
Synthetic values exist only in this local process. The test disposes its
runtime/listeners. It never contacts a real Hyperdrive, database or provider.

## Initial isolation and missing inputs

- Worker name is exactly `citywalk-api-preview`; no route touches getcitywalk.com.
  `workersDev=false`, `previewUrls=false`, no domains/triggers, and runtime lock
  `CITYWALK_PREVIEW_DEPLOYMENT_LOCK=1` are mandatory. The preparation tool cannot
  unlock it, even when supplied a real Preview Hyperdrive ID.
- The Preview entrypoint has no scheduled/queue/email handler. It lazily imports
  the application only after all guards pass. The locked artifact cannot reach
  any database/storage/provider, including production. No existing scheduled
  job or production entrypoint is modified.
- A hypothetical later reviewed unlock still requires every declared isolated
  binding, an HTTPS `citywalk-api-preview.<account>.workers.dev` auth origin,
  separate strong Better Auth/access secrets, matching Preview-prefixed DB
  name/role and a Preview-prefixed bucket. Unexpected bindings, including
  DATABASE_URL and live provider keys, reject the entire request.
- After that gate, an independent `X-Citywalk-Preview-Token` is required and
  stripped before delegation; session cookies and request semantics remain.
  The initial method/path allowlist is only health, session lookup and selected
  content reads. GET session lookup can refresh sessions in the isolated DB;
  it is not a proof of zero database writes after a future unlock.
- All writes, sign-up/sign-in/recovery/email, image proxy/media, admin,
  analytics, AI/guide, checkout, billing and webhook/provider paths are denied.
  No email, GROQ/OpenAI, Stripe, Apple/Google/RevenueCat, OAuth, analytics or
  erasure provider credential is declared. Do not add real keys to “fix” 503s.
  Webhooks/providers remain unavailable until a separate reviewed change
  establishes independent sandbox credentials/endpoints and explicit approval.
- Legal publication remains OFF; no legal operator identity is supplied here.
  Every response is no-store and noindex. These headers are not access control;
  public URLs remain disabled and the access token is an additional boundary.

Required secret **names**, without values (the artifact checker verifies all):

| Purpose | Bindings |
| --- | --- |
| Separate auth and access | BETTER_AUTH_SECRET, BETTER_AUTH_URL, CITYWALK_PREVIEW_ACCESS_TOKEN |
| Private DB identity pins | CITYWALK_PREVIEW_DATABASE_NAME, CITYWALK_PREVIEW_DATABASE_USER |
| Isolated storage | CITYWALK_MEDIA_S3_ENDPOINT, CITYWALK_MEDIA_S3_REGION, CITYWALK_MEDIA_S3_BUCKET, CITYWALK_MEDIA_S3_ACCESS_KEY_ID, CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY |

Before any future provisioning/upload/unlock, the owner must privately verify:

1. The Preview Worker name is unused or demonstrably belongs to this isolated
   test environment; use Preview-scoped deployment permissions where supported.
2. A distinct Hyperdrive ID has a distinct synthetic database origin, database
   name and least-privilege role. Its origin credentials must be Preview-only.
   A different opaque ID and a name prefix **do not prove** this relationship.
   Hyperdrive's runtime proxy URL does not expose trustworthy origin provenance.
3. The DB is empty/synthetic and its committed schema is prepared under separate
   migration authorization. No migrations or DB reads were performed here.
4. Storage credentials can access only the independently provisioned Preview
   bucket; never reuse production storage access keys or real user media.
5. Auth/access secrets are freshly generated privately, cookies/origins isolated,
   and no real user records or production secret values have been copied.
6. Test webhook/provider credentials and endpoints are independently reviewed
   before a future expansion; providers, paid AI, real email and schedules stay
   disabled for this initial Preview.
7. A restricted Preview URL/access review, resource evidence and explicit owner
   approval precede a separately reviewed unlock/config change and any upload.
   Do not change the lock, checker and binding expectations casually to pass CI.

The known production ID is rejected. Unknown production IDs, reused credentials,
or a wrongly configured Hyperdrive origin cannot be certified from local files.
**The present no-production-DB guarantee applies to the locked tested artifact.**
Real isolated backend operation remains BLOCKED until the private resource
verification and separate owner approval above; dry-run success does not change
that status. No production-readiness claim is made.

## Operator setup and rollback (future approval only)

This PR grants no infrastructure or deployment authorization. After owner
review, provision only independent Preview resources in a separate authorized
operation, record their ownership privately, and supply secrets through the
platform's private secret interface scoped exactly to `citywalk-api-preview`.
Never paste values into chat, shell arguments, PRs or reports. No script here
creates resources, changes bindings, migrates or uploads.

Never run a bare deploy from the repository root: it still selects production.
Future deployment must use a separately approved, verified Preview workspace
and the exact manifested artifact, rechecking target/bindings immediately
before upload. Do not use a `--name` override or mutate a production artifact.
Enabling a workers.dev URL, changing the mandatory lock, or enabling sandbox
providers is a separate reviewed change, not part of this preparation.

No production rollback is necessary: production is unchanged. Before any future
Preview release, record that Preview Worker's own prior version/traffic state.
On unexpected auth/origin/data/provider behavior, stop testing, disable only its
Preview exposure and restore its own known-safe locked version (or remove the
new Preview Worker). Never roll back or delete citywalk-production. Remove only
newly inventoried Preview resources after owner approval/retention review.
Local candidate directories can be removed individually after evidence review;
never prune shared Docker data, databases or existing audit directories.
