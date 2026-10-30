# Controlled beta procedure — no build executed

## Backend approval gate

Use an approved isolated Cloudflare HTTPS backend. `https://candidate.invalid` in local config/export checks is a deliberately non-routable placeholder, never a usable QA backend. Existing app config rejects missing/HTTP/local Preview URLs but **does not establish isolation or reject every production host**. The new preflight is an additional operator procedure, not an unbypassable EAS hook or infrastructure attestation.

Backend operator must independently inspect deployment and bindings, then record:

- exact backend deployment ID, full commit SHA, stable origin and approval reference/expiry;
- separate non-production PostgreSQL/Hyperdrive target, storage bucket/prefix and provider credentials; no production fallback in any binding;
- migrated committed schema, explicit non-destructive QA content bootstrap if needed; published Lübeck places, approved exact-locale audio and independently verified knowledge;
- Better Auth trusted native `citywalk://` callback, test email delivery, Apple/Google test provider registration, session and erasure behavior;
- AI key/budget/rate-limit settings server-only; safe 429/503 handling and fail-closed DB behavior;
- HTTPS API returns JSON directly to native clients. A Cloudflare/Vercel login HTML page is platform protection, not an application response. Do not embed a bypass token in EXPO_PUBLIC values;
- public image/audio/map dependencies and their data/availability terms; no raw GPS/tokens in logs.

Keep a non-secret approval JSON outside Git. Template (all placeholders must be replaced by real reviewed values):

```json
{
  "origin": "https://REPLACE-WITH-APPROVED-HOST",
  "isolated": true,
  "backendCommit": "REPLACE-WITH-40-HEX-DEPLOYED-SHA",
  "approvalReference": "REPLACE-WITH-OPERATOR-APPROVAL",
  "databaseEvidence": "REPLACE-WITH-ISOLATED-BINDING-REVIEW-REFERENCE",
  "storageEvidence": "REPLACE-WITH-ISOLATED-BUCKET-REVIEW-REFERENCE",
  "expiresAt": "REPLACE-WITH-ISO-EXPIRY"
}
```

The script checks exact origin match, beta profile, HTTPS/public named host, known CITYWALK production-domain exclusion, expiry and evidence fields. It cannot prove an arbitrary host is isolated, resolve DNS/rebinding, validate operator identity, or inspect EAS remote values. Human review remains required. It prints no manifest or credential values and performs no network request.

## Local and EAS configuration

Local native builds remain the repository default; EAS is an optional controlled distribution path requested for this audit. EAS CLI >=18 is configured but no exact CLI/build-image version is pinned; record the reviewed versions for reproducibility.

From a clean candidate checkout, install root and mobile lockfiles, then:

```bash
cd mobile
export EXPO_PUBLIC_CITYWALK_ENV=preview
export EXPO_PUBLIC_CITYWALK_API_ORIGIN='https://REPLACE-WITH-APPROVED-HOST'
# Leave BILLING and UNLOCK_PREVIEW unset; OBSERVABILITY unset or 0.
npm run beta:preflight -- preview /private/path/citywalk-qa-approval.json
npm run doctor
npm run beta:test
npm run lint
npm run typecheck
npm run test:run
npm run config:validate
```

Review EAS **account and project** Preview variables and profile `env` together. Both `preview` and `store-beta` select EAS environment `preview` and app environment `preview`; neither hardcodes an API origin. Configure only approved non-secret build values. `EXPO_PUBLIC_*` is embedded in the app. Server DB/auth/AI/storage keys never belong there. Map style override is optional public HTTPS configuration; no provider secret in its URL. Apple/Google UI flags are set to 1 by these profiles: verify provider setup or obtain a separate reviewed scope decision. Native observability stays disabled. Never use `production` or `billing-sandbox` for ordinary journey QA.

Compare resolved EAS configuration to the approval record before building; a local shell preflight alone does not verify the remote job environment. Inspect `.easignore` archive in a local temporary directory: exclude .git, .env*, signing files, dependencies and generated native projects; review source archive for secrets and unintended files. Never attach raw environment output to public reports. Inspect remote version state and existing store build numbers; autoIncrement changes remote state.

## Build and distribution steps for a later authorized operator

Commands below are instructions only, not executed or permission to upload. Require current approval record, clean full candidate SHA, test results, reviewed archive and signing owner confirmation first.

```bash
# From mobile/, with an approved recorded EAS CLI version:
npx eas-cli@<reviewed-version> build --platform ios --profile preview
npx eas-cli@<reviewed-version> build --platform android --profile preview
```

`preview`: Release iOS internal/ad-hoc distribution (registered device UDIDs/provisioning required), Android installable APK. Internal installation is not TestFlight/Play acceptance. Restrict build-link access/tester audience and document consent + bug reporting. [Expo internal distribution reference](https://docs.expo.dev/build/internal-distribution/).

After that smoke pass, producing a **store-beta artifact** is a separate operator action:

```bash
npm run beta:preflight -- store-beta /private/path/citywalk-qa-approval.json
npx eas-cli@<reviewed-version> build --platform ios --profile store-beta
npx eas-cli@<reviewed-version> build --platform android --profile store-beta
```

`store-beta`: store-distribution iOS artifact and Android AAB, still Preview backend. Apple Developer/App Store Connect roles, signing team/certificate/profile/entitlements and App Store app must exist. Play Console app/upload-key ownership and app-signing certificates must be verified. Configured `ascAppId=6815815964` is a repository value, not evidence the current operator can access that app. Never reset signing keys, run auto-submit, or use `eas submit` in this task. TestFlight/Play internal uploads require separate explicit authorization. TestFlight external beta may require Apple's beta review.

Inspect produced artifact IDs, SHA-256, architectures, identifiers, minimum/target OS, privacy manifests, entitlements/permissions, non-secret embedded origin and absence of dev transport exceptions. Confirm microphone/recording are absent, iOS background location justified, Android foreground-only behavior, billing disabled at runtime. EAS logs must bind full mobile SHA to resolved public configuration. Record iOS version/build and Android versionCode; do not reuse historical build numbers.

## Device and field execution

1. Assign one physical iPhone and one Android (include at least Android 14/15/16 across device/emulator coverage), model, OS and install source. Include a smaller iPhone and lowest effective supported OS via additional device/emulator coverage. iPad requires separate evidence while support remains enabled.
2. Start with a clean guest install, then repeat upgrade/restart paths. Run MATRIX.csv independently on each platform in all six launch locales for critical screens; EN/DE full journey. Capture video/screenshots with no private account/GPS/token values in shared reports.
3. For FIELD rows walk Lübeck: Holstentor → historic center → return target, safe pedestrian routing, arrival distance/accuracy, drift/poor GPS between buildings, Skip/Shorten/Back and deadline recovery. Run on both platforms; one platform's result cannot accept the other.
4. Pause network at map/route/audio/AI/save boundaries; restore without lost progress or duplicate actions. Use only test accounts and QA media/provider state. Delete a disposable QA account and confirm server session rejection and device purge; deletion is not store-subscription cancellation.
5. Log crashes/device console evidence privately (observability SDK off), strip GPS/PII, file defects with matrix IDs. Stop on privacy/corruption/core-walk Blocker/Critical. Freeze only an exact accepted candidate; rerun affected rows after a fix.

Use a separate evidence row per scenario/platform/build: `scenario_id, result (PASS/FAIL/BLOCKED/NOT_RUN), tester, date+timezone, device, OS, version/build, mobileSHA, backendSHA+deploymentID, originApprovalReference, artifactSHA256, evidenceLink, defectLink`. No default PASS. MATRIX.csv starts entirely NOT_RUN. No real credentials, UDIDs, raw location trail or personal email in Git.
