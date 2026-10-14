# CITYWALK legal, landing and Cloudflare release readiness

Audit date: 14 October 2026. Source of truth: [#187](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/187). This document prepares a separately approved release; it does not authorize deployment, migrations, DNS, billing or store submission.

## Existing functionality reused

- Homepage cutover and `/explore`: #231 / #230. `src/app/page.tsx` uses the existing `LandingPreview`, `LandingClosing` and scoped CSS; localized traveler, account, walk and pass routes remain.
- Canonical origin, homepage/social metadata, robots and sitemap: #235 / #234, `src/lib/site.ts`, root layout and metadata routes.
- Privacy, Terms, Imprint and shared layout/operator contract: #275 / #265. HTTP 200 with missing identity is a **pre-launch placeholder**, with noindex/nofollow and omission from the sitemap. It is not an accepted store policy URL.
- Public Support: #276/#279. `support@getcitywalk.com` is owner-confirmed as receiving mail; #187 also records IONOS mailbox operation. No mail was sent by this audit.
- Verified public deletion: #254 and the existing account lifecycle code. Native cleanup, transactional cascades, staff retention guard and external erasure outbox remain intact.
- Browser consent: #283. Native attribution/funnel disclosure: #284. Native consent alignment subsequently landed in **#287**; it must not be rebuilt as if absent.
- Account JSON export: **#286**, `src/lib/account/dataExport.server.ts`, `/api/account/export` and native account controls. Authentication, account matching, private/no-store download and secret exclusion already exist.
- Implementation-derived inventory and controlled store draft: #281/#289/#288, `docs/legal/CITYWALK-DATA-INVENTORY.md` and `CITYWALK-STORE-PRIVACY-DRAFT.md`.

Scope: Mobile Core required for native consent safeguards, shared for iOS and Android; Public Web required; Admin Web not applicable (existing staff authorization/audit preserved). Native automated checks do not constitute device acceptance on either OS.

## Production mismatch and confidence

Read-only requests on 14 October returned `/` HTTP 200 with title CITYWALK and the German traveler heading “Welche Stadt möchtest du entdecken?”, while `/privacy` returned HTTP 404. These reproduce the reported mismatch without changing production. The direct Worker hostname and active-version metadata were not verified in this session.

Git history shows the landing cutover at `b201da3` on 5 October, legal routes at `3590c0a` on 7 October, and subsequent consent/export work. #187 records an earlier production artifact/deployment at `cfbeb363f8cbc97681b0367a42cba4f0bb033760` and later runtime smoke acceptance. The task supplies observed Worker version prefix `4c18d94c`; this audit cannot independently associate it with a Git SHA.

The local current-code vinext build includes legal pages and preserves API/auth/traveler routes. Missing identity produces a warning/200, not a 404. There is no source-level redirect replacing `/` with `/explore`. `assets.notFoundHandling=none` preserves application routing; adding SPA fallback would conceal errors. The installed deploy tool selects **cf** for `cloudflare.config.ts`, not Wrangler. No Wrangler configuration exists here.

**Conclusion: a stale deployed artifact is consistent with the evidence, but the exact production cause remains unresolved.** `cf workers deployments list --worker citywalk-production --per-page 3` failed with “No authentication token found.” Do not claim an active-version/SHA diagnosis until the owner provides read-only deployment/version evidence. Check the deployed bundle and source SHA before considering routing/environment changes.

## Findings and code-side changes

Already implemented: landing structure, prelaunch controls, legal content foundation, public deletion/support, both consent UIs, export and data inventory. No redesign, fake store links or traveler-origin redirect was added.

Partially implemented: legal publication requires owner identity and reviewed disclosures; store declarations remain drafts; deletion provider execution/backup propagation need operational acceptance. Native consent was present, but failed storage writes could retain a prior grant. The funnel endpoint previously had no explicit consent assertion.

Changes in this branch:

- Legal pages and sitemap wait for `connection()` before reading operator environment so identity/indexing are determined at request time, not frozen by a secret-free Next build.
- Cloudflare declares the individual/Germany launch contract and runtime secret bindings for name/address/postal city. Registration fields are optional; partial register pairs fail validation. No private identity is in source or build values.
- Shared legal navigation adds Support; deletion gets legal navigation and an absolute canonical. Legal/support/deletion copy wraps long contact text at large text sizes. Footer copy honestly reflects prelaunch state.
- Native consent writes are serialized. Withdrawal blocks immediately; failed storage writes attempt to remove the previous grant and remain blocked in the current runtime. UI reads the effective decision and tolerates attribution cleanup failure. If both persistence and cleanup fail, a process restart cannot remember that withdrawal: this storage failure remains a device/operational limitation to test.
- Native funnel rechecks consent immediately before sending and supplies `X-Citywalk-Analytics-Consent: granted`. The server drops requests lacking that assertion with 204/no-store, preserving old-client product behavior. It forwards only validated allowlisted attribution. A client assertion is **not** authenticated proof of human consent, nor an abuse-prevention control. Previously sent/in-flight requests cannot be recalled.
- Cloudflare route/SSR/runtime-binding checks and full-SHA bundle evidence are included in CI and the prebuilt artifact. They prove bundle inclusion only; runtime smoke checks remain necessary.
- Generated Cloudflare global declarations are isolated in `tsconfig.cloudflare.json` to avoid changing browser/Node Response types; generated bundles are excluded from lint. Both typechecks must pass after a Cloudflare build.
- Route browser checks use loopback only, cover positive/negative legal configuration, traveler routes, guest auth/content APIs, export denial and legal text reflow. No screenshots of operator identity are produced.

## Secure owner configuration

Use `.env.example` as the empty contract, not as a release secrets file. Keep owner-managed values outside Git, restrict file permissions (`chmod 600`), and never paste values into issues, PRs, logs or screenshots.

| Variable | Owner action |
| --- | --- |
| `CITYWALK_LEGAL_ENTITY_TYPE` | `individual`, declared by launch configuration |
| `CITYWALK_LEGAL_OPERATOR_NAME` | Supply real name approved for public disclosure |
| `CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS` | Supply a legally usable service/postal address approved for public disclosure |
| `CITYWALK_LEGAL_OPERATOR_POSTAL_CITY` | Supply postal code and city |
| `CITYWALK_LEGAL_OPERATOR_COUNTRY` | Germany, declared by launch configuration |
| `CITYWALK_LEGAL_REPRESENTATIVE` | Not required for this individual contract; required by code for company configuration |
| `CITYWALK_LEGAL_REGISTER_NAME` / `CITYWALK_LEGAL_REGISTER_NUMBER` | Only if applicable; supply both together |
| `CITYWALK_LEGAL_VAT_ID` | Only if actually applicable |

Contact is the fixed, confirmed `support@getcitywalk.com`. Country/type do not prove that an address is legally usable. Structural validation cannot certify identity, registrations or legal adequacy.

Run `npm run legal:check -- /absolute/path/to/owner-managed-legal.env` locally before release; output contains only status/missing field names. Required production runtime values must be configured through the separately approved release process. Optional applicable registration/VAT fields also require explicit Worker bindings in a reviewed configuration before deploying; do not guess them or require invented registrations for an individual.

## Privacy and data-rights acceptance

Use the existing inventory as the category/purpose/system-owner/retention matrix. This audit confirms code boundaries, not production provider settings:

- Guest identifiers/session lifetimes, HMAC rate-limit evidence, auth/profile/guest links and account-saved walks are already inventoried. Guest-first product behavior remains intact.
- Native coordinates can persist on-device in Live Walk; browser coordinates are held for the requested feature. Reviewed analytics sends status/attribution, not GPS trails. AI excludes precise start/finish coordinates; questions/history are sent to Groq. Do not equate local location permission with off-device collection.
- Resend handles account lifecycle email. Support email goes to the IONOS mailbox. Neon holds production database content/account state; Cloudflare serves requests/assets. Public provider categories now include Neon and IONOS.
- Optional browser PostHog and native attribution are separate consent contexts. Decline/withdraw tests must cover both. Maximum native attribution lifetime and PostHog project retention still require owner decisions; no TTL was invented.
- Walk feedback is currently device-local. Broader bug/report collection remains #53. Marketing CMS audit/brand/generation records are staff/business data, not guest analytics; their retention cannot be silently erased by traveler deletion.
- Stripe, native store verification and RevenueCat integrations exist conditionally. Their installed presence is not evidence that public paid processing is activated. Confirm actual release/provider settings; this branch enables no billing.
- Eligible deletion cascades auth/traveler/customer/entitlement records; orders/subscriptions remain detached; external RevenueCat erasure/Apple revocation is queued. Cron is intentionally absent from production config. Confirm an approved worker/cron, required credentials, retries and completion receipts before declaring provider deletion end-to-end. Public web deletion cannot clear disconnected device storage or cancel a store subscription.
- Self-service export excludes auth secrets and device-only data. For broader rights requests, the owner must approve a documented procedure: receive through Support, verify ownership proportionately without requesting passwords, record request/deadline, scope retained/provider/device-only records, use authenticated export where applicable, review staff/legal holds, deliver through a secure channel, and record completion/refusal and follow-up. Do not send a stranger an export based only on a supplied email.

Owner/legal launch blockers: actual public identity/address; reviewed purposes/legal bases, controller/recipient details, EEA transfers and safeguards; provider DPAs and retention/training settings (Groq, Resend, PostHog, Neon, Cloudflare, IONOS); log/support/backup expiry and restored-backup deletion handling; commerce record/legal hold retention; external-erasure-job cleanup and automation; native attribution lifetime; German-language/public legal-copy review; commercial cancellation/withdrawal/tax/refund terms before paid activation. No durations or compliance declaration are inferred.

Store blockers: final App Privacy/Data Safety answers derived from the same inventory, exact Xcode privacy report/manifests and Android merged manifest/permissions, provider activation state, signed release artifacts and real-device iOS/Android consent/deletion/export acceptance. Follow #34/#109/#187 and the existing DRAFT; do not submit or mark these issues complete from local tests.

## Safe release and rollback procedure — owner approval required

1. Complete identity/legal/privacy/provider review above. Record approved source SHA, isolated Preview acceptance, iOS and Android device evidence, and the exact release checklist in #187.
2. On an authenticated owner workstation, **read** the active deployment: `npx cf workers deployments list --worker citywalk-production --per-page 3`; then `npx cf workers versions list --worker-id citywalk-production --per-page 10`. Save the complete active version UUID(s)/percentages, artifact SHA and configuration/binding names without secret values. Obtain missing provenance before attributing the 404.
3. Build a clean approved `develop` SHA with Node 22: `npm ci`, `npm run build:vinext`, `npm run check:cloudflare-build`, `npm run typecheck:cloudflare`, `npm run deploy:vinext:dry-run`. Prefer the manual prebuilt workflow at that exact SHA. Preserve `.cloudflare/output/citywalk-build-evidence.json` and artifact checksum. Secret-free builds are intentional.
4. Rehearse the artifact against explicitly isolated Preview database/storage, approved Preview auth origin and synthetic operator identity. Provisioning that Preview requires separate infrastructure approval. Locally, `vite preview` needs a `HYPERDRIVE.dev.connectionString`; only use a temporary validation copy with loopback PostgreSQL and fake `.dev.vars`. Never archive/deploy that modified local-preview output. No remote binding, production DB or production secrets are needed for local tests.
5. Run landing/legal content and positive/negative identity checks, sitemap/canonical/robots, responsive/large-text checks, APIs/auth callbacks/reset/verification, share/deep links, media, existing traveler paths, and sandbox deletion/export. Verify the exact candidate SHA and provider/outbox behavior. A route returning 200 is insufficient.
6. Compare committed migrations with the production journal **read-only**. This branch adds no schema migration; latest develop has migrations added since the historical deployment. Any needed production migration is a separate reviewed/approved release action with backup/recovery rehearsal. Do not automatically run all pending migrations from this task.
7. Confirm production `BETTER_AUTH_URL=https://getcitywalk.com`, unchanged mobile production API origin, Hyperdrive, media and existing auth/provider bindings. Configure approved legal runtime secrets with the owner; do not bundle identity values. Do not change DNS/routes/domains, activate analytics/billing or enable erasure cron incidentally.
8. **Only after explicit production release approval**, download/unpack the approved artifact in a clean release directory and validate the exact existing secret/config binding set. First run `npx cf deploy --prebuilt --mode production --dry-run --secrets-file /absolute/path/to/owner-managed-release.env`. Inspect output privately. Then the separately authorized deployment command is `npx cf deploy --prebuilt --mode production --tag <approved-git-sha> --secrets-file /absolute/path/to/owner-managed-release.env`. Never run this command as ordinary PR validation. It changes production traffic.
9. Record new full Worker version UUID and Git SHA. Verify `/` marketing content, the five public legal/support/deletion resources with real reviewed identity (privately), `/explore`, localized travelers, `/api/content/cities`, guest auth session, auth callbacks, deep/share links and media; perform authorized sandbox/test-account lifecycle acceptance. Check runtime logs for SSR/1101/Hyperdrive/provider failures without logging credentials/prompts. Keep #187/#109/#265 open until their actual criteria are accepted.
10. If regressions occur, restore the previously recorded version distribution using `npx cf workers deployments create --worker citywalk-production --strategy percentage --versions @rollback-versions.json`, where the owner-managed JSON contains the **full verified** prior UUID(s) and percentages totaling 100. Do not use the abbreviated `4c18d94c`, guess a UUID, or bypass deployment checks. Secret changes can prevent version rollback; stop and review a compatible forward release. Worker rollback does not undo database migrations, provider changes or new data; those require their separate recovery plan.

## Traveler origin strategy

Keep `https://getcitywalk.com` as the public landing/legal surface and stable production mobile/API/auth origin. Preserve `/api/*`, `/explore`, current localized travelers, utilities, sharing and deep links. No wildcard redirect or authentication-origin change is required to release this landing.

`https://app.getcitywalk.com` is an intended later traveler origin, **not verified provisioned**. A separate approved ticket must verify ownership/routing, isolated rehearsal, cross-origin cookies/CSRF/CORS, Better Auth trusted origins and callbacks, mobile linking, asset URLs, share-link continuity and rollback. Prefer additive routing with existing paths still available; only migrate links after both origins are accepted. Do not move mobile APIs merely because a web-app subdomain is introduced.

## Primary references

Operator facts require human review under [DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html). Privacy structure must be reviewed against [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng); no compliance certification is provided. Native changes follow the installed stack and [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/). Store references remain in the existing controlled privacy draft.
