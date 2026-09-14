# LAUNCH-01 performance baseline and verification

## Reproducible API and media measurement

Run against a local server or a non-production Preview:

```bash
npm run performance:measure -- --origin=https://preview.example --cities=hamburg,lubeck --locale=en --warm=5
```

The command reports response bytes, first and repeated request time, public cache headers,
content-version/ETag timing metadata, and the bytes of the hero/card variants referenced by
the compact city response. It never sends authentication, GPS, or traveler data.

## Pre-change baseline (2026-09-14)

Measured from the stable Store Beta Preview before LAUNCH-01:

| Endpoint | Bytes | First request | Warm median | Cache-Control |
| --- | ---: | ---: | ---: | --- |
| `/api/content/cities?locale=en` | 1,785 | 3,359 ms | 842 ms | `private, no-store` |
| `/api/content/cities/lubeck?locale=en` | 28,262 | 1,326 ms | 1,014 ms | `private, no-store` |
| `/api/content/cities/hamburg?locale=en` | 11,835 | 1,083 ms | 975 ms | `private, no-store` |

The local PostgreSQL-backed API was also sampled after development compilation: city index
was 866 bytes and 25–34 ms; Lübeck was 17,815 bytes and 36–67 ms; Hamburg was 11,783 bytes
and 35–54 ms. These local timings separate query/serialization work from Internet latency.

### Original image payload audit

| City | Place images | Original bytes total | Largest original | Originals over 350 KB | City hero |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lübeck | 21 | 11,073,120 | 2,120,834 | 15 | 2,120,834 |
| Hamburg | 10 | 32,202,396 | 15,006,632 | 9 | 6,577,016 |

LAUNCH-01 keeps those immutable originals but makes native list/detail/hero rendering request
bounded WebP variants (320/720/1280/1600 px). The measurement command is the acceptance check
for the 250–350 KB card target on the final Preview.

## Local post-change sample (2026-09-14)

Measured after route compilation against the same local PostgreSQL content. Development-mode
compilation outliers are excluded from the warm median.

| Endpoint | Bytes | Warm median | Server content timing |
| --- | ---: | ---: | ---: |
| `/api/content/cities?locale=en` | 1,173 | 139 ms | 172 ms |
| `/api/content/cities/hamburg?locale=en` (compatibility) | 19,560 | 123 ms | 95 ms |
| `/api/content/cities/hamburg/summary?locale=en` | 16,858 | 155 ms | 76 ms |
| `/api/content/cities/lubeck?locale=en` (compatibility) | 19,603 | 193 ms | 154 ms |
| `/api/content/cities/lubeck/summary?locale=en` | 14,398 | 156 ms | 81 ms |

The compact contract removes story, facts, visitor notes, non-card media, and other detail-only
fields. Place detail is fetched only when opened. The resulting reduction is 13.8% for Hamburg
and 26.6% for Lübeck against their full local compatibility responses.

### Generated delivery variants

| City | Variant sample | Assets measured | Total bytes | Largest response | Over 350 KB |
| --- | --- | ---: | ---: | ---: | ---: |
| Hamburg | card (720 px WebP) | 10 | 592,730 | 98,714 | 0 |
| Hamburg | hero (1600 px WebP) | 1 | 318,246 | 318,246 | 0 |
| Lübeck | card (720 px WebP) | 5 representative legacy assets | 336,028 | 120,580 | 0 |

The first transformation can include private-object download and encoding time; transformed
responses are then CDN-cacheable for seven days with 30 days of stale-while-revalidate. Final
Preview measurements must confirm warm CDN behavior.

## Exact-head Preview sample

Commit `6bc6a6d741db6e49a50144a93e120bb0bf524fca` was measured on its READY Vercel
Preview. Vercel removes `s-maxage` from the client-visible `Cache-Control` value after using
it for CDN policy, so the observed `public, max-age=0` plus `X-Vercel-Cache: HIT` confirms
the public CDN path.

| Endpoint | Bytes | No-cache request | Warm median | CDN result |
| --- | ---: | ---: | ---: | --- |
| `/api/content/cities?locale=en` | 253 | 1,564 ms | 69 ms | HIT |
| `/api/content/cities/lubeck?locale=en` | 19,368 | 164 ms | 66 ms | HIT |
| `/api/content/cities/lubeck/summary?locale=en` | 14,398 | 209 ms | 69 ms | HIT |

The deployed compact Lübeck response is 25.7% smaller than the compatibility response.
Its five available legacy card images returned `image/webp`; the largest was 120,580 bytes.
Hamburg was intentionally not present in this Preview database and returned a private,
non-cacheable 404. Hamburg post-change evidence therefore remains the local authoritative
content measurement above; a Hamburg-backed Preview measurement is still required before merge.

## Cache and publication freshness contract

Public city index, compact city, full compatibility city, and place-detail responses use a
short CDN freshness window (`s-maxage=60`) with five minutes of stale-while-revalidate. Each
body has a content-derived ETag and `X-Citywalk-Content-Version`; a changed published snapshot
therefore produces a new version. CMS publication is visible no later than the bounded CDN
window without caching authenticated, account, commerce, or AI responses publicly.

Native public content uses a five-minute fresh window and a maximum 24-hour persisted stale
window. It renders an available memory/persisted value immediately, revalidates stale data in
the background, deduplicates concurrent requests, and uses ETag `304` responses. Storage
failure degrades to in-memory/network behavior. Only public DTOs are persisted.

## Android cold/warm acceptance

Development builds emit sanitized `CITYWALK_PERF` records with the public resource key,
source (`network`, `persisted`, or `memory`), and elapsed milliseconds. On representative
hardware:

1. Cold: clear CITYWALK app data, use a normal 4G connection, open Home, then Hamburg and
   Lübeck. Capture `adb logcat | Select-String CITYWALK_PERF`.
2. Persisted warm: terminate and reopen the app, then reopen each city.
3. Memory warm/back navigation: open a place, return to its city, and confirm the city record
   is served from `memory` without a full-page loader or a second unchanged network request.
4. Confirm useful cold city content is below two seconds and cached Home/city opens feel
   immediate. Record the physical device, Android version, network, and samples with the PR.

Automated tests cover cache source timing, persistence, request deduplication, revalidation,
and cancellation. A physical-device result is still required because emulators and CI cannot
represent launch hardware or mobile-radio conditions.

## Saved-trip production boundary

The Beta local save remains device-only. Production account work still needs server-backed
load/list/delete operations, conflict/version handling, and authenticated cross-device sync.
Public-content caching never stores account data or raw GPS.
