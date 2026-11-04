# Issue #395 — restricted Preview hardening (20 October 2026)

**NO-GO for deployment, including a restricted Preview.** This is a local proposal.
The permanent deployment lock remains mandatory even with provisioned-looking resource
IDs and all review labels set to APPROVED. No production publication is authorized.

Worktree: `/Users/assia/Documents/GitHub/citywalk-landing-runtime-rc`.
Branch `codex/landing-runtime-rc`, HEAD `7b99bf81c7c19010ef6019ac9a31cf974903e3b6`.
The three release commits (`53186fd`, `3057e81`, `7b99bf8`) remain ancestors. All 31
protected source/config hashes still match working files AND pinned HEAD. The baseline
file itself is unchanged. No LandingPreview, application, production config, root Next
generated types, existing audit files, or prior `.citywalk` evidence was modified.
All hardening edits and new generated output are below `tools/preview-395/`.

Public Web required; Mobile Core unchanged; Admin Web not applicable. iOS and Android
implementation/device acceptance were not performed. This is not full issue #395
backend/native, legal publication or production acceptance.

## Credentials and application delegation

The boundary authenticates the exact Preview workers.dev host using HTTPS Basic auth.
Missing/short passwords fail closed. After successful verification, it creates a new
Request, removes `Authorization` and `Proxy-Authorization`, and removes the
`CITYWALK_PREVIEW_PASSWORD` binding from the environment passed to the delegate.
The caller's request/environment are not mutated. Tests establish that neither the
raw preview password nor Basic header reaches the delegate through these arguments.
Safe session/locale cookies, URL/query, method, credentials/cache/redirect settings,
RSC/navigation/conditional/range headers and abort propagation are preserved. Context
and resource binding objects retain identity. HEAD responses have no body.

The original application remains first-party code in the same Worker; this is not a
sandbox against code inspecting global runtime state. Cloudflare's Node compatibility
may expose bindings through process.env. Header/environment-argument redaction does
not claim global secret isolation or erase a password supplied separately in arbitrary
caller-controlled fields. Never log the incoming request or Preview binding values.

Every asset is Worker-first. All responses retain noindex/nofollow/noarchive/nosnippet,
private/no-store, same-origin CSP and a synthetic-preview notice. Legal fields explicitly
say SYNTHETIC PREVIEW / NOT LEGAL APPROVAL. Field completeness is not legal approval.
Robots disallows everything and sitemap is empty. No wildcard redirect is introduced;
application redirects to other origins fail closed.

## Reviewed read-only route audit

`routes.mjs` is the positive allowlist. Unknown paths fail with 503 before application
or database delegation, regardless of GET, HEAD or OPTIONS. All write methods fail.
Requests with `next-action`, `x-rsc-action` or method-override headers also fail.
OPTIONS for an allowed path returns a local 204 with `Allow: GET, HEAD, OPTIONS`;
it does not invoke the application/database and grants no cross-origin CORS permission.

Audit basis: actual pinned application handlers and their server dependencies; the
installed Better Auth session implementation; and installed Vinext action handling.
Read-only here means no application data mutation, session refresh or provider action.
Opening a synthetic DB connection, SELECTs, operational error logs and response
construction still occur. Tests of guard dispatch use mocks, not real DB/runtime calls.

| Allowed paths | Audit and behavior |
|---|---|
| `/` | Original LandingPreview and root layout. Layout renders client controls; it does not call server auth. Tracker client cannot reach its API; analytics config is absent. Writes are blocked. |
| `/privacy`, `/terms`, `/imprint`, `/support` | Read-only page rendering and synthetic legal environment. No email delivery. Original mailto/external links remain; do not follow them during review. |
| `/account-deletion` | Page rendering only. Client panel reads a fragment locally; its POST delete-request/delete-confirm calls are blocked before app entry. No deletion is initiated. |
| `/api/health` | `health.server.ts` performs a SELECT probe/config inspection; operational failures log sanitized events. Missing media/email/AI can produce degraded/503. |
| `/api/content/cities`, `/api/content/cities/{slug}`, `/summary`, `/places/{slug}` | Exact route shapes only; valid ASCII slugs. Public repository is forced to `code`; localization/DTO/ETag construction and static verified-source lookup are reads. No automatic content imports, provider calls or publication writes. |
| `/api/content/image` | Validates against the canonical local legacy-image set and variant enum, then redirects only to a same-origin bundled image. No remote optimizer or arbitrary URL fetch. |
| `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json` | Pure association/config builders; identifiers absent, so original handlers return 503. Native association is unverified and Basic auth prevents OS link verification. |
| `/open/{citySlug}/{marketingSlug}` | Dynamic segment validation and native fallback render only. Store URLs absent. Attribution parser reads query values; analytics API remains blocked. No device deep-link activation is performed. |
| Explicit bundled `/brand`, `/images`, `/landmarks` files | Only the ten named files in `routes.mjs`; arbitrary filenames/directories are rejected. |
| `/_next/static/...` JS/CSS/font files | Confined generated static namespace/extensions; supports hydration/styles/fonts without permitting image optimization, JSON manifests or source maps. New build output still needs review. |
| `/robots.txt`, `/sitemap.xml` | Local guard responses; never delegate. |

Important removals from the earlier broad policy:

- `/api/auth/get-session` is NOT read-only: installed Better Auth
  `dist/api/routes/session.mjs` can call `internalAdapter.updateSession`, refresh cached
  cookies and set session cookies; application `auth/factory.server.ts` sets updateAge.
  All auth paths, including verify-email, callbacks and sign-out, are now blocked.
- `/api/account/export` calls `getSession`, so it is blocked too. All other account
  APIs, admin routes, remote media, explore/unaudited pages and future routes are blocked.
- No application OPTIONS dispatch; HEAD reaches only reviewed reads. No server actions
  can be invoked through this preview policy.
- All methods under commerce, guide/AI, analytics and internal publishing routes fail
  closed, including webhooks, native context and Apple/Google notifications. Tests cover
  GET/HEAD/OPTIONS/POST/PUT/PATCH/DELETE. There are no real provider tests or requests.

## Worker, configuration and resource exclusion

`config.mjs` builds a complete independent config, using shared `policy.mjs` text values.
It never imports/spreads the checked-in production config. Exact config equality rejects
unknown bindings, inline secret values, production config changes, cron/workflow/service
or remote storage additions, and asset auth bypasses. Unknown profile fields also fail.
The runtime now uses an exact binding-name/text-value allowlist rather than a provider
name blacklist: unexpected DB URLs, provider keys, OAuth/analytics credentials, storage
endpoints/keys, approval/workflow values and altered content/storage modes fail closed.

- Worker: `citywalk-preview-395-7b99bf8`; exact distinct workers.dev origin only.
  `citywalk-production`, `getcitywalk.com` and production Hyperdrive
  `390958927c2946be8571ec5282b35ce6` are explicitly rejected by preflight.
- Hyperdrive remains `UNPROVISIONED_SYNTHETIC_HYPERDRIVE`. No DB URL binding exists.
  Runtime validates PostgreSQL scheme, reviewed proxy hostname, synthetic database name,
  and absence of connection-string query/fragment overrides before any delegation.
- Synthetic bucket name only: `citywalk-preview-395-synthetic`. No S3/R2 credentials,
  endpoint, service or bucket binding; remote media handlers are not allowlisted.
- Only new Preview-access and synthetic Better Auth secret declarations; no secret values
  are written or changed. Runtime requires a synthetic Better Auth prefix.
- No GROQ, Stripe, RevenueCat, Resend, PostHog, OAuth/store/provider approval credentials.
  No scheduled export, trigger, workflow binding or active automation.

Name checks cannot prove the ownership of an unknown cloud ID or the origin behind
Hyperdrive. Actual provider resource/secret provenance and the Hyperdrive proxy-host
mapping remain unverified. No claim is made that arbitrary future IDs are safe. The
mandatory deployment lock prevents this proposal from authorizing any deployment.

## Supported installed CLI/config selection

Installed cf `1.0.0-beta.12`, Vinext and @vinext/cloudflare `1.0.1` are pinned by preflight.
Their actual source establishes:

- Typed-config `vinext-cloudflare deploy --preview` selects mode `preview`, not a new
  Worker. `--name` throws, and typed cf deployment does not forward `--config`.
- cf consumes prebuilt Build Output and checks its recorded mode; selecting a built
  Worker does not rename/sanitize it. Never reuse existing production Build Output.
- The Vite plugin loads `root/cloudflare.config.ts`; its customization uses deep merge
  and may inherit production bindings. That is not the isolation boundary used here.

`prepare.mjs` instead creates a separate local root with its own conventional typed
config. The actual installed config parser loads that generated file and verifies exact
binding equality. This proves local configuration selection, not successful deployment.
No deployment command or alternate undocumented flag is used.

## Offline verification and generated files

From the requested checkout:

```sh
node --test tools/preview-395/preview.test.mjs
node tools/preview-395/preflight.mjs
node tools/preview-395/preflight.mjs --deployable
node_modules/.bin/tsc -p tools/preview-395/tsconfig.json
node_modules/.bin/eslint tools/preview-395/ --ignore-pattern '**/.local/**'
```

`--deployable` MUST fail. Provisioned-looking IDs and APPROVED labels MUST also fail
with the unconditional deployment-lock error. This hardening does not remove that lock.

`prepare.mjs` writes only `tools/preview-395/.local/project/`, refuses an existing target,
and copies tracked HEAD bytes plus explicitly named preview modules. No dirty source,
dotenv, Git metadata, old build output, mobile or GitHub workflows are copied. The sole
automation-directory exception is the inert `citywalk-approved-content-publisher.mock.json`
fixture required by a TypeScript test import; it is copied but never executed/activated.
Only node_modules is symlinked for installed dependencies. The generated config copy is
replaced with the sanitized Preview config. Exact copied paths are in
`.local/generated-files.json`. Previous `.citywalk/preview-395` output is untouched and
stale relative to this hardening; do not use it.

Run `node tools/preview-395/verify-local.mjs` after preparation. It checks the actual
staged parser result, current preview module bytes, 30 unchanged copied source hashes,
and absence of inherited dotenv/build/workflow state. It runs the documented installed
`next typegen` followed by a complete isolated `tsc --noEmit --incremental false`.
These run with a new HOME/TMPDIR below `.local`, credentials cleared, telemetry disabled,
and `deny-network.mjs` preloaded to reject fetch, sockets, HTTP(S) and DNS. A self-test
confirms requests fail before connection; no provider is contacted. Stale root Next types
are thus resolved in the isolated copy, without editing the root generated files.

A full Next build is not run: layout uses Google fonts, and provider/network access is
forbidden. Type generation does not render/prerender pages or establish workerd/runtime
acceptance. There is no validated deployable artifact. Integration, browser/screenshots,
DB/storage, callbacks, devices and cloud acceptance remain unverified.

Final hardening results:

- 117 isolation tests passed, 0 failed, 0 skipped.
- Draft preflight passed; deployment preflight correctly fails: Unprovisioned Hyperdrive.
- Permanent lock test passes even with provisioned-looking IDs and APPROVED labels.
- Installed staged config parser and exact binding comparison passed.
- Preview TypeScript and preview ESLint passed (0 errors/warnings).
- Offline network-denial self-test, isolated Next type generation and full isolated
  TypeScript passed. Initial isolated TypeScript needed the inert mock fixture; corrected.
- 31 original hashes/release ancestry preserved; 30 copied hashes verified.
- No application-wide test rerun is claimed for this follow-up. Only preview policy and
  tooling changed; prior application-suite results are historical.
- No DB generation/migration/verification or build/deploy/provider operation was run.
- New outputs, logs, exact changed-file hashes and results are in `.local/` (gitignored).

## Requirements before any future restricted Preview deployment

Separate explicit authorization and independent review remain necessary for provisioning,
uploading/deploying and setting new secrets/bindings. Required: new isolated PostgreSQL
instance/database/role with synthetic fixtures only; new Hyperdrive with verified origin
and proxy mapping; separate empty synthetic media bucket if media is later enabled;
new Preview password and synthetic Better Auth secret. Prefer a dedicated nonproduction
Cloudflare account/token without production resource or DNS access. No production dump,
credentials, bucket or resource reuse. No actual resources/secrets were accessed here.

Before upload, independently verify the exact Worker/hostname, resources, secrets,
no triggers, all asset auth gates, emitted bindings, full artifact hash and environment.
Run isolated workerd/browser egress and status tests, original-landing screenshot
comparison, synthetic legal/noindex checks and founder acceptance. Extra routes/media
or account flows require an explicit new allowlist/side-effect review. This proposal
remains locked and is not a complete provider-egress or deployed-runtime guarantee.

## Local removal / future Preview rollback (instructions only)

Local rollback: remove only this task's `.local/project` after review; preserve existing
root `.next`, `.citywalk` evidence, release commits and owner audit files. Other logs may
be retained for review. Remove individual new/modified preview files only if rejecting
the proposal; no Git reset/stash. Nothing needs rolling back in production.

After a separately approved future Preview deployment, deny Preview access first, then
remove only the inventoried Preview Worker/URLs and its new access credentials,
Hyperdrive, synthetic bucket and synthetic DB/role after ownership/dependency/retention
review. Confirm current removal syntax via installed help/operator console at that time.
Do not change production Workers, versions, resources, DNS, bindings or shared secrets.
No removal/deployment command has been executed.
