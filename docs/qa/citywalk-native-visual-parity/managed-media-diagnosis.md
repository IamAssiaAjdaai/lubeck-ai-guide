# Managed media read-only diagnosis — 2026-09-25

> **Historical report; status reconciled 2026-09-27.** Later owner evidence confirms audible English with Silent mode ON, Pause/Resume, no English playback in the tested German flow and return to English. The compact no-German-audio notice supersedes the older card/Read-button retest below; its final visual confirmation remains pending. Storage diagnostics/upload work is separately held and not part of Commit 1. See the [current acceptance ledger](README.md#current-checkpoint-status--2026-09-27). Implementation is now in Commit 1; no new device/build/deployment evidence is claimed by this documentation cleanup.

> **Historical investigation:** Read the dated follow-ups before treating the initial 502 as current. The latest recorded remote checks (2026-09-26) delivered the tested managed image and audio range successfully; owner subsequently confirmed audible English on iPhone. No fresh remote probe or repair attribution is claimed by this checkpoint. The pending diagnostic implementation remains separate from accepted native fixes. See [checkpoint review](reviewed-checkpoint.md).

## Environment and scope

Tested **remote develop Preview**, not a local backend: `${DEVELOP_PREVIEW_ORIGIN}`.
Vercel resolves this alias to deployment `<deployment ID retained locally>`, commit `7e6abee18cb625eb81a40f889ad9bbdcac00d88b`, branch `develop`, READY. This differs from local HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2` plus uncommitted work. The deployed media route, eligibility repository, storage adapter/environment validator and image transformer are byte-identical to the inspected local versions (`git diff --quiet <deployment SHA> -- <media paths>` returned 0).

The origin matches the earlier observed iPhone runtime and current internal EAS profile configuration. A fresh read-only Metro probe during this investigation found no connected CITYWALK runtime; no new device observation is claimed. Requests below came from this Mac to the remote Preview. No configuration, credentials, storage, content or application-code changes. No builds, deployment, publication, commit or push.

## Current request evidence

Requests followed metadata-provided application paths; no signed storage URL or private object path was used or recorded. `x-vercel-id` is the application/platform request correlation, **not** an upstream storage request ID. Timestamps are UTC request starts. All 502 bodies were exactly the application's generic `Media delivery is temporarily unavailable.` response, 42 bytes, `Cache-Control: private, no-store`, Vercel cache MISS.

| UTC | Request | Status | Content type | Bytes |
| --- | --- | --- | --- | --- |
| 2026-09-25T19:44:28.374Z | cities DE | 200 | application/json; charset=utf-8 | 613 |
| 2026-09-25T19:44:31.832Z | summary DE | 200 | application/json; charset=utf-8 | 14599 |
| 2026-09-25T19:44:32.989Z | Holstentor DE | 200 | application/json; charset=utf-8 | 2046 |
| 2026-09-25T19:44:34.069Z | published Holstentor fallback | 200 | image/jpeg | 2502963 |
| 2026-09-25T19:45:49.836Z | approved city original | 502 | text/plain; charset=utf-8 | 42 |
| 2026-09-25T19:45:51.870Z | approved city card | 502 | text/plain; charset=utf-8 | 42 |
| 2026-09-25T19:45:57.019Z | approved city hero | 502 | text/plain; charset=utf-8 | 42 |
| 2026-09-25T19:45:57.434Z | Holstentor fallback card | 200 | image/webp | 120580 |
| 2026-09-25T19:48:26.020Z | Holstentor EN audio availability | 200 | application/json; charset=utf-8 | 2201 |
| 2026-09-25T19:48:26.327Z | Holstentor exact EN managed audio range | 502 | text/plain; charset=utf-8 | 42 |

Vercel runtime logs independently recorded image 502 requests at 19:45:50, 19:45:56 and 19:45:57 UTC and audio 502 at 19:48:26 UTC on the same deployment. No corresponding storage exception name, upstream HTTP status or provider request ID was exposed. The media catches log errors **only when `NODE_ENV === "development"`**; the inspected deployed code consequently gives no production-mode exception details. General runtime-error groups contained a PostgreSQL SSL warning and an unrelated historical Guide error; neither proves a cause for media delivery.

## One approved image: traced boundaries

1. **Published metadata:** DE `/api/content/cities`, Lübeck summary and Holstentor detail all return 200. The city attachment publishes image asset `d90f55b7-14ff-4fb5-b196-b7afec17d825`, purpose `hero`, declared JPEG, 2,443,967 bytes, and original/thumbnail/card/detail/hero application URLs. The asset key is a public identifier, not an object-storage key.
2. **Application media route:** `/api/media/[assetKey]` resolves `getPublicMediaDeliveryAsset`, enforcing approved upload, public access, non-archived asset, non-empty object reference/size and published same-city usage. Failing eligibility returns 404. The observed generic 502 is produced later inside the delivery catch, so eligibility rejection is not the observed path. Actual object existence and byte integrity are not established by these metadata checks.
3. **Storage boundary:** `getMediaObjectStore()` validates `CITYWALK_MEDIA_STORAGE=s3` and the five required S3 configuration fields, then constructs the private S3 adapter. `readObject` issues SDK `GetObject` using the stored reference and optional Range. Credentials remain server-only and `forcePathStyle` is enabled. This is the code path, **not evidence that a request reached storage**: configuration validation can throw before the request. No authenticated remote environment values or provider logs were available through the connected project/log tools; no CLI installation, credential retrieval, environment pull or guessed storage endpoint was attempted.
4. **Optional transformation:** originals stream directly; `?variant=card/hero` reads original bytes and then uses Sharp rotate/resize/WebP. The original fails too, so transformation is not required to reproduce the failure. The independent Holstentor fallback card transform succeeds (200 WebP); this does not prove that this managed object's bytes would decode successfully if obtained.
5. **Response:** original/card/hero all return the application's generic 502, not 404, with no-store. No private storage information escapes to the client.
6. **Native consumption:** Home's city card selects approved city `variants.card`; `NativeContentImage.onError` switches to the existing published Lübeck/Holstentor fallback. If that also errors, it replaces the image with a labelled static placeholder rather than continuing the image-loading surface. Correct-place cards/detail use their own published fallback; no photo substitutions were added. City Hub's V2 hero is a bundled illustration. A working fallback is **not repaired managed delivery**. Fresh device rendering of these error paths remains UNVERIFIED in this round.

## Cause classification

| Candidate | Conclusion |
| --- | --- |
| Missing storage object | **Unproven.** The adapter maps provider HTTP 404/NotFound to application 404. Observed 502 does not match that straightforward missing-object path. A provider can conceal absence behind another error, so absence is not ruled out absolutely. |
| Incorrect metadata/reference | **Unproven.** Published attachment and delivery eligibility resolve; the referenced object's existence, identity and checksum still need an authorized private lookup. |
| Credentials/permission failure | **Unknown.** No upstream error/status available; no credential change justified. |
| Endpoint/configuration/connectivity | **Unknown.** Required config validation and SDK request failures share this catch. Remote config presence/correctness is not observable in the available tools. |
| Image transformation | **Not the sole cause.** Untransformed original and separate audio both fail. Managed-image decoding remains untested. |
| Native client rendering | **Not the cause of these HTTP failures.** Independent Mac requests and server logs reproduce them before native rendering. Physical fallback/audio error UI still needs device evidence. |
| Established boundary | **Server managed-object delivery exception, exact underlying cause unknown.** Do not label this an S3 outage or expired credentials. |

## Audio checked separately

Holstentor **English detail** publishes one exact-English, public application-route MP3, declared size 1,657,137 bytes. A `Range: bytes=0-1023` request returns **502**, not 206/audio bytes. No playback PASS. **German Holstentor detail** has no exact-German audio attachment; its unavailable state is a separate content limitation, not permission to use English audio. Summary responses intentionally omit place/tour audio, so their empty audio collections are **not** evidence of city-wide missing audio. No unapproved, premium or different-language asset was requested.

Native `selectExactLocaleAudio` requires the exact locale and application media path. `NativeAudioPlayer` handles its reported error with unavailable text and Retry; retry recreates the player. Automated bridge checks pass, but actual playback and actual device failure recovery remain UNVERIFIED.

## Required owner/operator action before a fix

No configuration/storage mutation is yet justified. Ask the Preview operator to perform these **read-only** checks on the deployment above:

1. In Vercel's project environment settings, filter **Preview/develop** and confirm that this deployment received `CITYWALK_MEDIA_STORAGE` (`s3`), `CITYWALK_MEDIA_S3_ENDPOINT`, `CITYWALK_MEDIA_S3_REGION`, `CITYWALK_MEDIA_S3_BUCKET`, `CITYWALK_MEDIA_S3_ACCESS_KEY_ID` and `CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY`. Check branch overrides, HTTPS endpoint/region compatibility and intended isolated Preview storage. Report only presence/validity and environment scope; do not send values or screenshots containing secrets.
2. Using authorized private DB/storage access, resolve the public city asset key above and check the object's existence plus read permission for the **same Preview service identity**. Correlate provider audit/request logs with 19:45:50–19:45:57 UTC (image) and 19:48:26 UTC (audio). Return only a sanitized provider error code, HTTP status, UTC time and request correlation. Do not reveal bucket/key, endpoint credentials or signed URLs.
3. If the provider has no request, distinguish environment validation, DNS/TLS/connectivity and signing before proposing a change. If existing logs cannot do that, a separately approved diagnostic deployment with narrowly sanitized error classification may be needed; none was prepared or deployed here.

After evidence establishes the cause, obtain approval for any required environment/credential/object correction and subsequent Preview deployment. Never make storage public or bypass eligibility/entitlements. Local backend edits do not update this Preview.

## Validation and device retest

Existing focused checks rerun because this investigation specifically audits recovery and delivery behavior:

- Native media selection/image fallback/audio-map error recovery: **11 passed / 3 files** (`tests/content-image.test.tsx`, `tests/native-media-loading.test.tsx`, `tests/media.test.ts`). Bridges mocked; no physical playback claim.
- Server route/storage/environment checks: **13 passed / 3 files** (`src/app/api/media/[assetKey]/route.test.ts`, `src/lib/media/storage/s3ObjectStore.server.test.ts`, `src/lib/media/storage/environment.server.test.ts`). Local mocks do not establish remote storage health. Existing Vite configuration warnings were emitted; no unhandled test errors.
- No source change; all 138 prior source-manifest entries remain unchanged. TypeScript, lint, full suites, migrations and builds were not repeated. The previous 353-mobile-test/TypeScript/lint pass remains historical. `git diff --check` passes.

Exact iPhone steps, without deleting storage:

1. Reopen the same Development Client project. On Home, view the Lübeck city card. With the current 502, verify the published city fallback appears and no indefinite image-loading state remains; select Lübeck and confirm accepted first-tap navigation stays intact.
2. Open Holstentor Detail and verify its own photo loads. In **English**, tap Listen: currently expect unavailable/error plus Retry, not successful playback. Tap Retry once and record whether it exits loading correctly. Report any stuck state; no physical PASS inferred.
3. Switch to **German**, reopen Holstentor Listen and verify a clear unavailable state without English audio substitution.
4. Only after an approved service repair is deployed, recheck managed original/variant 200 and exact-English audio range 206, then verify audible English playback separately on iPhone. Fallback appearance alone cannot prove the managed image was repaired; correlate the network request. No Android or store/release acceptance follows from these checks.

## Follow-up: owner confirms key presence — 2026-09-25

Owner clarification: “i check the vercel and storage s3 key they are there”. Record this as **owner-confirmed presence**, not a successful authenticated storage read or verified Preview/develop scope. No credentials requested or printed.

Read-only deployment lookup still resolves the develop alias to `<deployment ID retained locally>`, created **2026-09-24 12:51:19 UTC / 14:51:19 Europe/Berlin**, commit unchanged. Vercel environment edits apply only to new deployments ([official documentation](https://vercel.com/docs/environment-variables)); this makes scope and edit timing concrete checks, **not an established cause**. Owner asked to confirm Preview/develop scope and whether variables changed after that timestamp. No redeployment requested or performed.

The local `.env.local` has no `CITYWALK_MEDIA_*` entries; the example file lists the required names. Local absence says nothing about remote values and is not a Preview diagnosis. Existing Vercel project/deployment/log tools expose no authenticated environment values or provider object reads. A seven-day delivery-error log search returned no results with a retention warning; the request-specific query added no upstream error evidence. Missing search results are not proof of successful storage access. All application code, including accepted Add stop/navigation, remains untouched.

## Requested live recheck — 2026-09-25, 20:46–20:47 UTC

Rechecked the configured remote develop Preview. Managed city original/card/hero and exact-English Holstentor audio still fail; the correct-place fallback card still works. This does not establish that keys need replacement. No secret values or configuration were changed.

| UTC | Request | HTTP |
| --- | --- | --- |
| 2026-09-25T20:46:53.447Z | approved city original | 502 |
| 2026-09-25T20:46:57.841Z | approved city card | 502 |
| 2026-09-25T20:46:58.363Z | approved city hero | 502 |
| 2026-09-25T20:46:58.713Z | Holstentor fallback card | 200 |
| 2026-09-25T20:47:01.606Z | Holstentor EN audio availability | 200 |
| 2026-09-25T20:47:03.081Z | Holstentor exact EN managed audio range | 502 |

Owner-facing configuration guidance: Vercel → lubeck-ai-guide → Settings → Environment Variables, select Preview and develop if branch-specific. Add missing or correct verified incorrect values under the exact names `CITYWALK_MEDIA_STORAGE` (`s3`), `CITYWALK_MEDIA_S3_ENDPOINT`, `CITYWALK_MEDIA_S3_REGION`, `CITYWALK_MEDIA_S3_BUCKET`, `CITYWALK_MEDIA_S3_ACCESS_KEY_ID`, `CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY`. Provider-specific values must come from the storage provider and existing isolated Preview bucket, not guessed values or a Vercel API token. Existing names should be edited rather than duplicated. Do not paste secrets into chat. These variables are server-only. A subsequent approved Preview deployment is required to apply changes; none was initiated. No application-code edits or repeated test suites for this read-only recheck.

## Database check requested by owner — 2026-09-25, 21:12–21:13 UTC

**Local database:** connected using the existing `.env.local` DATABASE_URL (loopback), with `default_transaction_read_only=on`; transaction read-only status verified. PostgreSQL 16.15. Required catalog/media tables present. All **14 applied migration hashes match all 14 repository migrations**, with none missing/different. The repository's SELECT-only `npm run db:verify`, also run with writes disabled, passed: **2 cities / 44 places** — Lübeck 25 (17 See, 5 Eat, 3 Fun), Hamburg 19 (16 See, 1 Eat, 2 Fun). No migrations, seeds, imports or content changes performed.

Local `media_assets` has **0 rows**. The known public Preview city image asset and Holstentor audio are absent locally. Therefore local DB results cannot verify Preview media records or storage references. The local content source is configured as database. No connection URL, credentials, private object references or user/account rows were printed.

**Remote Preview:** independently rechecked the public EN Lübeck summary at `2026-09-25T21:13:01.466Z`: **HTTP 200**, 25 places, one managed city image attachment. Correlation: `<request correlation retained locally>`. This is API evidence only, not a direct remote DB integrity/migration check. It confirms the Preview data differs from the local managed-media table; the earlier managed-object 502 diagnosis remains unresolved.

## Owner-requested repeat check — 2026-09-25, 21:20 UTC

Local PostgreSQL read-only connection passed again: 14/14 migration hashes match; 2 cities / 44 places (Lübeck 25, Hamburg 19); managed-media table remains empty. No database changes. Remote Preview was checked separately; results remain unchanged:

| UTC | Request | HTTP |
| --- | --- | --- |
| 2026-09-25T21:20:22.190Z | approved city original | 502 |
| 2026-09-25T21:20:28.078Z | approved city card | 502 |
| 2026-09-25T21:20:28.491Z | approved city hero | 502 |
| 2026-09-25T21:20:28.836Z | Holstentor fallback card | 200 |
| 2026-09-25T21:20:22.308Z | Holstentor EN audio availability | 200 |
| 2026-09-25T21:20:28.095Z | Holstentor exact EN managed audio range | 502 |

No code, environment, credential, content or deployment changes. The local database pass does not establish remote storage health; managed image/audio delivery remains unresolved.

## Preview Admin new-audio trace — 2026-09-25, 21:36 UTC

Owner selected `public/audio/marienkirche-en.mp3` (746,931 bytes) for **Marienkirche / English**. Target is the develop Preview origin documented above. Holstentor audio must remain unchanged.

**BLOCKED before stage 1:** the existing headed QA browser session remains at `/admin/login`. Owner staff sign-in is required before using the authorized Admin upload workflow. No upload intent, browser PUT, finalize, review, attachment promotion or content publication has been attempted. This is an authentication prerequisite, not evidence of a storage failure.

| Stage | Result |
| --- | --- |
| 1. Upload intent | BLOCKED — staff sign-in pending |
| 2. Browser PUT | UNVERIFIED — not attempted |
| 3. Finalize HEAD | UNVERIFIED — not attempted |
| 4. Finalize Range GET | UNVERIFIED — not attempted |
| 5. Pending review | UNVERIFIED — no new asset |
| 6. Approve/review | UNVERIFIED — not attempted |
| 7. Exact-place/locale candidate | UNVERIFIED — not attempted |
| 8. Make live | UNVERIFIED — not attempted |
| 9. New public media delivery | UNVERIFIED — no new asset |
| 10. Native exact-locale selection | UNVERIFIED — no new live asset |

Code trace: `MediaUploadForm` creates an intent, performs the browser PUT, then invokes finalize. `finalizeAuthorizedUpload` performs HEAD and Range GET before updating the asset to `pending_review`; the finalize route then attaches the candidate at audio position 1 when supplied a place and locale. Thus candidate attachment actually precedes approval in this workflow. Server HEAD/Range results cannot be distinguished from a generic finalize error alone; that limitation must remain explicit if encountered.

The earlier local diagnostic implementation remains paused, unvalidated and undeployed. No application-code changes were made for this Admin trace. Existing work is preserved. No commit, push, build, deployment, configuration change or production access.

## Preview Admin upload: first failure established — 2026-09-26, 00:21 Europe/Berlin

Owner reported `Created active global CITYWALK super admin.` The existing QA browser was independently observed signed in at the **develop Preview** Admin media page. No bootstrap was run by the agent. Local source remains branch `fix/citywalk-native-device-acceptance`, HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2`, with existing uncommitted work. This attempt tested the remote alias, not local code; the deployment SHA was not re-resolved in this round.

Audio operations showed **Marienkirche / English: Missing**, with no existing live/candidate link in that cell. Its upload link selected city 1, place 3, kind audio, locale en. The genuine Admin form was populated with the owner-specified `marienkirche-en.mp3`, **746,931 bytes**, browser MIME `audio/mpeg`, access public/free. Initial automation clicks did not generate requests; after confirming that fact, activating the existing form submit button generated **one** upload-intent request. No manual API replacement or storage request bypass was used.

**First failure: stage 1, upload intent — HTTP 400.** The visible error, matched against fixed application messages before recording, was:

```text
CITYWALK_MEDIA_S3_ACCESS_KEY_ID is required for media operations.
```

- Request: `POST /api/admin/media/upload-intents` on the develop Preview origin above.
- Start: **2026-09-25T22:21:00.833Z**; completion: **2026-09-25T22:21:01.108Z**.
- Form exited busy state and displayed the error. No retry was attempted after this failure.

| Stage | Result |
| --- | --- |
| 1. Upload intent | **FAIL — HTTP 400, required storage access-key-ID value unavailable** |
| 2. Browser PUT | BLOCKED — no request issued |
| 3. Finalize HEAD | BLOCKED — finalize not invoked |
| 4. Finalize Range GET | BLOCKED — finalize not invoked |
| 5. Pending review | BLOCKED — no successful upload intent |
| 6. Approve/review | BLOCKED — not attempted |
| 7. Marienkirche English candidate | BLOCKED — not attached |
| 8. Make live | BLOCKED — not attempted |
| 9. New public media delivery | BLOCKED — no new live asset |
| 10. Native exact-locale selection | BLOCKED — no new live asset |

**Established class: `media_config_missing`.** This names the observed class; it is not a newly deployed diagnostic log. The inspected environment validator throws this exact message when `CITYWALK_MEDIA_S3_ACCESS_KEY_ID` is absent, empty or whitespace after trimming. Store initialization is a default argument to `createAuthorizedUploadIntent`, before upload-record insertion and signed-URL creation. The request therefore failed before any provider authentication, PUT, HEAD or Range GET. It does not establish that the provider rejected a key or that bucket permissions are wrong. Missing, misnamed, incorrectly scoped or not-yet-applied configuration cannot be distinguished by this response alone. The secret-key value and downstream storage health remain unverified.

The shared environment validator also gates public managed-object delivery, so this is a concrete configuration blocker relevant to that investigation. Historical image/audio 502 requests were not retried here, and their individual provider errors are not retrospectively proven by this upload result. No successful new asset exists for the requested old/new safe-metadata comparison.

**Required operator action:** check the exact `CITYWALK_MEDIA_S3_ACCESS_KEY_ID` name and non-empty value for the serving Vercel project's **Preview/develop** environment, including branch overrides and whether the serving deployment received it. Use the intended isolated Preview storage identity; do not share the value or change bucket permissions. If correcting the value/scope or applying a pending edit requires a new Preview deployment, obtain approval for that separate action. Editing `.env.preview.local` on this Mac does not update the running Vercel environment. No environment correction or deployment was performed in this session.

Stopped at the first failing stage as requested. Holstentor and Marienkirche publication state were not changed by the agent. No storage code or configuration edits, unrelated publication, production access, commit, push, build or deployment. This round changed only this report; the preceding diagnostic code remains paused, unvalidated and undeployed. No unrelated DB checks or test suites were repeated. No credentials, private object references, signed URLs or raw provider response bodies were recorded.

## Owner-requested retry — 2026-09-26, 02:33 Europe/Berlin

Retested the same develop Preview Admin with the existing signed-in browser. Marienkirche's English operations cell still showed **Missing**, with no live/candidate link. Uploaded the same owner-selected local file (746,931 bytes, `audio/mpeg`), targeting city 1 / place 3 / `en` / public audio. Local branch and HEAD remain unchanged. No configuration or deployment was performed by the agent; this result concerns the remote alias, whose deployment SHA was not re-resolved in this round.

| Stage | Result / evidence |
| --- | --- |
| 1. Upload intent | **PASS — HTTP 201**, returned asset ID **21** |
| 2. Browser PUT | **FAIL — browser fetch rejected with `Failed to fetch`; no HTTP status available for PUT** |
| 3. Finalize HEAD | BLOCKED — no finalize request |
| 4. Finalize Range GET | BLOCKED — no finalize request |
| 5. Pending review | BLOCKED — not finalized |
| 6. Approve/review | BLOCKED — not attempted |
| 7. Marienkirche English candidate | BLOCKED — finalize-time attachment not reached |
| 8. Make live | BLOCKED — not attempted |
| 9. New public media delivery | BLOCKED — no new live asset |
| 10. Native exact-locale selection | BLOCKED — no new live asset |

Safe request evidence:

- Intent start **2026-09-26T00:33:42.050Z**, completion **00:33:43.589Z**.
- Browser storage fetch start **00:33:43.591Z**, rejected **00:33:44.182Z**. UI exited its busy state and displayed `Failed to fetch`.
- Captured PUT and its matching-URL OPTIONS preflight have timestamp **00:33:43.634Z**. URL equality was checked in memory; neither the URL nor object reference was printed or written to this report.
- **OPTIONS returned 200**. Captured request Origin matched develop Preview and requested PUT. Response `Access-Control-Allow-Origin` matched that origin; allowed methods included PUT and allowed headers included `content-type`.
- The captured PUT has **no response status**, and its detailed browser record exposed no usable status/error classification. Console classification yielded no CORS/DNS/TLS signal. Older network entries were excluded by this attempt's timestamps; their failures are not evidence for this attempt.

**Current conclusion:** the earlier missing-access-key-ID blocker is cleared for intent creation in this request. Successful intent creation/signing does **not** prove provider acceptance of the credentials. The first failing boundary is now browser-to-storage upload. Observed preflight headers satisfy the origin/method/content-type checks, so do not diagnose a missing CORS rule from `Failed to fetch` alone. Provider permissions/signature, the actual PUT response's CORS headers, connectivity/TLS and other transport failures remain unproven. The browser failure also does not prove whether any bytes reached storage; do not assume the object is absent or complete.

Asset **21** is the newly created upload record; finalization was not called. The creation code initializes it as `uploading`; its post-failure database state was not independently queried. Preserve this identity for the next investigation rather than creating another intent blindly. No review, live promotion, archival or deletion was performed. Holstentor remains untouched, and no new public audio was published. There is no successful new asset for the old/new metadata comparison.

Stopped at stage 2. **Next diagnostic action:** authorized storage/operator logs for the exact UTC window above should establish whether the actual PUT reached the provider, its sanitized HTTP/error code, and whether the error response included the allowed-origin header. If no matching provider request exists, browser network/security evidence is needed to distinguish transport blocking from a rejected request. Return only safe status/code/time/correlation information—no signed URL, object key or secrets. No credential or bucket-permission change is justified yet.

Only this report was changed in this retry. No application/storage code, environment, credentials, permissions, database administration, production access, build, commit, push or deployment. No unrelated test suites or local DB diagnosis were repeated. Earlier unvalidated diagnostic code remains paused.

## Current read-only delivery recheck — 2026-09-26, 20:08 UTC

**The historical 502 is no longer reproduced for the tested published assets.** All requests below target the configured remote develop Preview, `${DEVELOP_PREVIEW_ORIGIN}`, from this Mac. The native internal build profiles still configure that origin. No connected iPhone runtime or new device rendering was observed in this round.

Read-only Vercel lookup resolves the alias to **`<deployment ID retained locally>`**, READY, source **CLI**, created **2026-09-26T19:21:33.914Z**. Git metadata references develop / `7e6abee18cb625eb81a40f889ad9bbdcac00d88b`. CLI metadata alone does not prove the uploaded source equals that commit or the current local working tree; no such equivalence is claimed. Local branch/HEAD remain `fix/citywalk-native-device-acceptance` / `efe8cf62f408181f0f4ca922f32e53e712a982a2`, with the existing staged checksum setting and untracked diagnostics preserved. No deployment was performed here.

| UTC request start | Request | HTTP | Content / bytes |
| --- | --- | --- | --- |
| 20:08:38.276 | Lübeck summary DE | 200 | JSON / 14,599 |
| 20:08:38.336 | Holstentor detail EN | 200 | JSON / 2,201 |
| 20:08:38.338 | Holstentor detail DE | 200 | JSON / 2,046 |
| 20:08:41.237 | Approved city original | **200** | JPEG / **2,443,967** |
| 20:08:41.238 | Approved city card | **200** | WebP / **60,282** |
| 20:08:41.238 | Approved city hero | **200** | WebP / **308,020** |
| 20:08:41.239 | Published Holstentor fallback | **200** | JPEG / **2,502,963** |
| 20:08:41.242 | Holstentor fallback card | **200** | WebP / **120,580** |
| 20:08:41.244 | Holstentor exact-English managed audio range | **206** | audio/mpeg / **1,024** |

All image/audio requests were Vercel cache **MISS**. Audio returned `Content-Range: bytes 0-1023/1657137`. No generic delivery-error response was returned. Runtime logs for this deployment and the 20:08:35–20:09:15 UTC window independently show three managed-image **200** requests and one managed-audio **206** at 20:08:42. Correlation IDs above identify application/platform requests, not storage-provider requests. Raw log messages, credentials and private storage references were not exposed.

### Historically failing city image, now traced successfully

1. **Published metadata:** current summary still exposes public asset `d90f55b7-14ff-4fb5-b196-b7afec17d825`, image/hero, JPEG, declared 2,443,967 bytes and application variant paths. This is the same public image identity previously failing.
2. **Application route:** metadata-provided `/api/media/[assetKey]` original/card/hero paths now return successful media responses. The inspected route resolves approved, public, non-archived, published same-city usage before delivery; no approval/authentication rule was bypassed.
3. **Storage boundary:** inspected delivery code validates storage configuration and issues `GetObject` through the S3 adapter using the server-only reference. The current original returned its complete declared byte count. This establishes successful managed delivery for this asset, without exposing the reference or directly querying private storage. Provider-request IDs and deployed implementation bytes were not independently obtained.
4. **Transformation:** inspected variant code reads original bytes and transforms them through Sharp. Both requested variants now return WebP with nonzero byte bodies; their success is separate from the unchanged static fallback. No local transformation change was made.
5. **Response:** original **200**, card **200**, hero **200**, all cache MISS. These are managed-route results, not fallback results.
6. **Native consumption:** current local Home selects the approved image card URL. `NativeContentImage` retains the published city fallback on primary error and a static labelled placeholder if both fail. City Hub keeps its bundled V2 hero. Correct-place cards/detail keep their own fallback. Actual new iPhone rendering and failure-state transitions remain **UNVERIFIED**; no accepted UI was changed.

### Classification and remaining limits

| Candidate | Current evidence |
| --- | --- |
| Missing storage object | No current missing-object failure for this image or the tested audio range; bytes were delivered. This does not audit other assets. |
| Incorrect metadata/reference | Image identity and declared byte count match current response; no current reference failure. Visual/editorial identity and all other records were not audited. |
| Credentials/permission | Effective managed reads succeeded for these requests. No credential values, identity permissions or write access were inspected or changed. |
| Endpoint/configuration | Current read path succeeds. Historical missing-variable/region findings must not be assumed to persist. Exact corrective changes between deployments are not established here. |
| Image transformation | Card and hero return successful WebP responses; no current transform failure reproduced. |
| Client rendering | No current server HTTP failure; physical rendering/playback still need owner evidence. |
| Historical cause / repair attribution | **Unknown for the original 502s.** Earlier upload evidence and current success do not prove which change repaired delivery. In particular, the local PUT checksum setting is not proof of the cause of previous GET failures. |

### Separate audio result

Current English Holstentor detail publishes exact-English public asset `0a553f78-c231-457c-a021-3b3211431cdc`, audio/mpeg, declared 1,657,137 bytes. Its application-route range request now succeeds with **206 / 1,024 bytes** and the expected total size. This is byte-delivery evidence only: no full-file decode, audible playback or native playback PASS is claimed. German detail still exposes **zero exact-German audio attachments**. The native selector requires an exact locale and application media route; English must not substitute for missing German audio. Existing audio failure handling displays unavailable text and Retry when the player reports an error; retry recreates the player.

### Changes, owner action and exact physical retest

- Appended the five owner-confirmed iPhone passes to the QA ledger, with unknown device/build/time/locale fields left unknown. No Android/release claim.
- Updated only QA documentation in this round. No current application-code cause was reproduced, so no source fix or additional regression was added. Existing uncommitted/staged/untracked work remains intact.
- No service configuration, credential, permission or storage action is required by these successful checks. Do not rotate/change configuration merely because the historical report recorded 502.
- No unrelated tests, TypeScript, lint, migrations or builds were rerun for documentation/read-only checks. Historical automated counts remain historical.

Retest on the physical iPhone, without deleting app storage:

1. Reopen the existing CITYWALK Development Client project using this same develop Preview. View the Lübeck Home city card; confirm an image appears and loading ends. Tap Lübeck once and confirm Explore opens at the top. Seeing a fallback alone does not prove the managed image rendered; correlate the card media request where observable.
2. Open **Holstentor** and confirm its own published photo appears. In **English**, open Listen, tap Play, and verify **audible English audio**; then pause and resume. Report any stuck loading or player error with the screen/locale/time. If an error occurs, tap Retry once and record the outcome; do not fabricate a failure or clear storage.
3. Switch to **German**, reopen Holstentor Listen and confirm a clear unavailable state with **no English audio substitution**.
4. Report image/audio device results separately. The server 200/206 checks do not confer native, Android or release acceptance.

No commit, push, build, deployment, store submission, content publication or external mutation by the agent.

## English silence and German availability — 2026-09-26, 21:10–21:24 UTC

### Owner evidence and environment boundary

Owner confirms Lübeck and Holstentor images render and Explore opens at the top on first selection. Owner initially reported English narration inaudible while Pause/Resume controls responded. Follow-up: “the audio is workin the iphone was in Silent mode and can work even the iphone in Silent mode”. Record **audible English playback PASS, owner reported**, and Silent mode as the owner-identified condition. This is not yet a physical PASS for the new local Silent-mode fix. No timer advancement, speaker/Bluetooth/AirPlay route, current binary version, device model or screenshot was supplied. The earlier German answer “no” remains ambiguous; English substitution is **not established**.

Local branch remains `fix/citywalk-native-device-acceptance`, HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2` plus preserved staged/unstaged/untracked work. Existing Metro process (local PID omitted) serves this repository's `mobile/` directory on port 8081; its read-only debugger listing was empty twice during this round. No competing Metro, forced reload or storage reset. Consequently the phone's installed native version, loaded JS/source identity and runtime API origin could not be freshly read. The configured HTTPS develop Preview remains `${DEVELOP_PREVIEW_ORIGIN}`; network evidence below is from this Mac to that remote environment, not from a local backend or phone. No deployment/configuration change was made.

Installed local dependencies: Expo **57.0.25**, expo-audio **57.0.5**, React Native **0.86.3**. Audited installed SDK JS and Swift plus [Expo 57 audio documentation](https://docs.expo.dev/versions/v57.0.0/sdk/audio/). Prior native-binary observations are historical; local package versions do not establish the installed phone binary's versions.

### Same approved English source: complete delivery

Public asset ID **`0a553f78-c231-457c-a021-3b3211431cdc`**, Holstentor, locale `en`, purpose `audio`, declared MIME `audio/mpeg`, expected size **1,657,137 bytes**. No replacement asset or different-language source used.

| UTC request start | Request | Result |
| --- | --- | --- |
| 21:10:55.601 | Holstentor EN metadata | 200; same exact-English asset |
| 21:10:58.304 | Holstentor DE metadata | 200; requestedLocale `de`; audio collection empty |
| 21:10:59.931 | Full approved English audio GET | 200; 1,657,137 bytes; Content-Type `audio/mpeg`; Content-Length `1657137`; Accept-Ranges `bytes`; no Content-Range |
| 21:11:06.189 | Same source, `Range: bytes=-1024` | 206; 1,024 bytes; Content-Range `bytes 1656113-1657136/1657137`; matching Content-Length/MIME |

Mac `afinfo` reports MP3 mono, 44,100 Hz, 128 kbps. Complete `afconvert` decoding to 16-bit PCM succeeded: **102.530612 seconds**, RMS **-20.55 dBFS**, peak **-5.49 dBFS**, **98.5% nonzero samples**. Download SHA-256: `654c2df4ac02dd954f0e2eb2afc657eb8ca68dbb763e7e8e78489e87c241333d`. This proves a decodable, non-silent full file, not independent recognition of the spoken language or device audibility. Audible playback evidence comes from the owner. Temporary MP3/WAV and sanitized request evidence remain under `<local-only temporary artifact>`, outside repository changes.

### Established application cause and targeted fix

Before this change native code never configured an audio session. Installed Swift `AudioMode` defaults `playsInSilentMode` to **false**; its mode setter chooses an ambient category in that case, and chooses playback for `playsInSilentMode: true` with recording disabled. This matches the owner's Silent-mode observation. Native `play()` already activates the session. Do not mistake a working Play/Pause UI for audible sound.

- `mobile/src/lib/narrationAudioSession.ts`: configure `setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false })` on explicit Play before native activation. Concurrent initialization shares its pending promise; failures remain retryable.
- `mobile/src/components/NativeAudioPlayer.tsx`: await setup with local busy/error recovery; use real SDK status for controls/time; block duplicate pending Play; guard unmounted attempts; key the attempt by source and retry so an old pending request cannot start a released source. Continue SDK-managed release instead of introducing a second player. No forced volume/mute/route change, microphone permission or background capability.
- `mobile/src/lib/audioDiagnostics.ts`: opt-in development-only, in-memory sampling capped at 60 seconds, 1 Hz. Whitelist public asset UUID, requested/asset locale, loaded/buffering/error boolean, playing/time/duration, mute/volume, session-setup state and mounted-player count. Never log raw source URLs, errors, credentials, GPS or content. Release builds cannot enable it; nothing auto-starts or uploads.
- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx` passes the selected attachment locale to the diagnostic registration. Image, Add stop, navigation and RTL behavior remain untouched.

For a future connected development debugger, explicitly invoke the diagnostic module's exported `startAudioDiagnostics(30000)`, perform Play/Pause/Resume, then inspect `readAudioDiagnostics()` and call `stopAudioDiagnostics()` if finishing early. These exports can be evaluated from the module's debugger scope; there is no public UI or auto-enabled logger. Observed player count changes help check replacement/cleanup. `sessionSetup: ready` means the configuration promise resolved, **not** direct OS-session activation evidence. Expo exposes no public getter for native session activation or speaker/Bluetooth/AirPlay routing; the latter requires owner observation. **No live samples were captured this round**, and actual phone time advancement/mute/volume remain unobserved.

### German is a separate content limitation

Fresh exact-German metadata still has **no German audio**. Existing selection requires matching locale, audio kind/purpose and an application media URL. `usePublicPlace` includes locale in both its cache key and request; it immediately hides a prior key's response and ignores late completion after locale change. Place Detail keys the player by city/place/locale; selecting Listen with no exact audio renders the localized unavailable message. The current German wording is “Audio in dieser Sprache ist bald verfügbar.” No translation copy was changed here.

Added regression evidence confirms EN → DE removes the English player even when a fixture presents English media, and a late English cache request cannot overwrite German content. This is automated evidence, **not a physical no-substitution PASS**. The owner still needs to describe the actual German screen; do not invent a German rendering defect or fix one speculatively.

### Validation and handoff

- Focused native checks: **40 passed / 6 files**, zero unhandled errors (30.14 seconds): `native-audio-playback`, `audio-diagnostics`, `native-media-loading`, `media`, `native-v2-regressions`, `content-loading-retry`.
- Mobile `npm run typecheck`: **PASS**.
- Mobile `npm run lint`: **PASS**, zero warnings.
- Tests cover status-driven controls, awaiting Silent-mode setup, setup failure/retry, no delayed playback after unmount/source replacement, one live mocked player after retry, missing German audio, late English response exclusion, diagnostic opt-in/bounds/redaction/release gating. Native bridges are mocked; Android device acceptance is not claimed.
- Scoped diff check passes. Whole-tree diff check reports pre-existing trailing whitespace in `.env.example:32`; preserved rather than editing unrelated environment work.
- Exact implementation/test files changed in this round: the four source files listed above plus `mobile/tests/native-audio-playback.test.tsx`, `mobile/tests/audio-diagnostics.test.ts`, `mobile/tests/native-v2-regressions.test.tsx`, `mobile/tests/content-loading-retry.test.tsx`. QA updates are this file and `README.md`. No backend, service configuration, dependency, build, publication, commit or push.

Next single task: reload the same Metro project without deleting storage, leave **Silent mode ON**, open **English → Holstentor → Listen → Play**, and confirm actual audible narration plus Pause/Resume. Then stop English, switch to **Deutsch**, reopen Holstentor → Listen and report the exact visible message/player state. Expected current content is localized unavailable without English playback. Do not mark the new Silent-mode behavior or German device scenario PASS until owner evidence arrives. A JavaScript fix in this tree does not change any existing EAS/release build or remote Preview.

## German no-attachment UI: traced cause and local fix — 2026-09-26

Owner now confirms on the physical iPhone: English narration audible with Silent mode ON; Pause; Resume from the same position; no English playback in the tested German flow; working playback after switching back to English. These are **PASS, owner evidence**, not Android acceptance. German unavailable messaging was **FAIL — not clear/visible** before this fix. Exact device/build/time/screenshot metadata was not supplied. The new message UI remains **UNVERIFIED pending physical confirmation**.

### Actual failing render path

1. Active Walk's existing Listen action opens `/city/[citySlug]/place/[placeSlug]` with the current city/place and `focus: audio`.
2. Place Detail requests locale-aware metadata. The latest independently checked Preview German Holstentor response has no exact-German audio attachment; this task does not change or republish that content.
3. `selectExactLocaleAudio` correctly produces no source. Loading metadata still uses the place skeleton, separately from missing audio. Metadata request errors still use content recovery.
4. Before this fix, ordinary Place Detail omitted audio-unavailable UI entirely unless `params.focus === "audio"`. On the Listen path the generic localized `StatusMessage` did render, but **outside the View that registers `sections.current.audio`**. That View existed only for a real audio source. Consequently `focusSection()` returned early for the missing track: no audio offset existed, so Listen could leave the message below the viewport.
5. Existing German copy was localized generic unavailability, not a missing translation. It did not clearly identify “no German attachment” as distinct from a playback/network error. No screenshot established the exact viewport in the owner's failing run; the code trace proves the missing scroll target and conditional omission rather than inventing a device-specific rendering cause.

### Minimal changes

- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`: render the same audio layout target for a player or no-attachment card. No-track card is present on ordinary detail too. It has a localized title/body and no player/spinner/Retry. Optional Read directly scrolls the current screen to its existing story offset, only if the story is nonblank; it does not open another place or rewrite routing. Story text and requested/resolved locale/fallback metadata are preserved.
- `packages/i18n/src/locales/{de,en,da,sv,nl,es,ar}.json`: add `place.audioMissingTitle`, `place.audioMissingDescription`, `place.readText` for all launch locales and Arabic. German: “Noch kein Audioguide auf Deutsch”; “Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.”; “Text lesen”. These are UI labels, not claimed audio translations. Existing audio error copy is unchanged.
- `packages/i18n/src/adapters.ts` and `mobile/src/lib/localization.ts`: expose these shared keys to native messages. No Web consumer behavior changed.
- `mobile/tests/native-v2-regressions.test.tsx`: exercise actual Place Detail with empty attachments, missing-story handling, layout events/Listen focus, same-place Read for Holstentor and Marienkirche, metadata loading distinction, all seven UI locales, and EN → DE → EN source/availability consistency. Native layout is mocked; pixel visibility needs the physical retest.

The pre-task SHA-256 snapshot of existing tracked/untracked working-tree files confirms that accepted audio player/session/diagnostics, storage, navigation, images and Add stop files are unchanged. Only the implementation/test files above and the two QA documents changed in this round. No credentials, DB records, publication, media assets, dependencies or configuration changed.

### Validation

- Mobile affected suite: **50 passed / 5 files**, zero unhandled errors, 28.93 seconds: `native-v2-regressions`, `native-audio-playback`, `native-media-loading`, `media`, `content-loading-retry`.
- Shared i18n suite: **42 passed / 2 files** (`i18n`, `ci-check`), 15.27 seconds. Existing Vite configuration warnings remain; no suppression or config change.
- Catalog checker: **435 keys per locale**, zero errors in `de/en/da/sv/nl/es/ar`.
- Mobile TypeScript: **PASS**. Mobile lint: **PASS**, zero warnings.
- Scoped diff/whitespace checks: **PASS**. Unrelated existing `.env.example` whitespace remains untouched. An initial mobile test invocation from the root selected no files because the root excludes mobile; corrected to the mobile directory before recording the passing result above.

### Historical card/Read-button retest — superseded by compact notice

1. Reload the current Metro project without clearing app storage. Select **Deutsch**, open the current Holstentor stop and tap **Listen** from the active walk. Verify the audio card is brought into view with the exact German title/body above; no audio player, indefinite spinner or Retry should appear for this missing attachment.
2. Tap **Text lesen**. Verify Holstentor's existing story is brought into view. Its actual content and fallback language must remain truthful. Ordinary German Holstentor Detail should also contain the no-audio card when scrolled to its audio section.
3. Switch back to English, reopen the same Holstentor audio and confirm audible narration with Silent mode ON, then Pause/Resume from the same position. The German no-track card must disappear when an exact-English source is available.

This earlier card/Read-button UI was subsequently replaced by the compact no-audio notice documented in `audio-copy-overlay-heroes.md`; do not use this superseded checklist for the current UI. The final compact-notice visual check remains unverified. This was a local JS/UI fix; no remote backend update or native build was made. No commit, push, build, deployment or publication.
