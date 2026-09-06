# CITYWALK Architecture Context

This document gives coding agents a compact, current mental model of CITYWALK. It is intentionally architectural rather than a changelog. GitHub issues remain authoritative for ticket scope.

## Product

CITYWALK is a multilingual, mobile-first city guide. Lübeck is the first live city and currently provides a catalog of 25 places, curated and personalized tour experiences, map/location features, audio-guide behavior, Hidden Gems, and an AI guide backed by verified knowledge.

The long-term platform includes:

- public web
- native-quality iOS/Android app
- CITYWALK Admin
- shared PostgreSQL backend
- content APIs
- AI/RAG services
- purchases/entitlements
- analytics

The public experience remains guest-first unless a dedicated account/paywall ticket explicitly changes that.

## Application stack

- Next.js 16 App Router
- TypeScript
- React 19
- PostgreSQL
- Drizzle ORM + committed SQL migrations
- Better Auth for identity/session infrastructure
- Vercel deployments/Preview
- PostHog analytics
- MapLibre-based map experience

Always read the installed Next.js documentation referenced by the generated block in root `AGENTS.md` when framework behavior is material to the task.

## Git workflow

- `develop`: integration branch
- `main`: protected product branch; feature work does not merge directly here
- feature/fix/chore branches start from latest `develop`
- PRs normally target `develop`
- CI + Vercel Preview + required manual acceptance precede merge

See `CITYWALK_WORKFLOW.md` for the full handoff process.

## Public routing and locales

The web experience is localized and supports the current CITYWALK locale set through `src/lib/i18n`.

Important locale rules:

- authored content and fallback content must be distinguishable
- fallback text keeps its actual language/direction semantics
- Arabic RTL must remain correct
- audio uses exact-locale behavior and must not silently fall back as if it were authored/approved for the requested locale

## Operational content model

CMS-02 moved city/place/tour operational content into PostgreSQL while preserving a controlled migration path from canonical code data.

Core concepts include:

- `cities`
- `city_localizations`
- `places`
- `place_localizations`
- normalized content tags and place/tag relations
- curated `tours`
- `tour_localizations`
- ordered `tour_stops`

Content publication states are:

- `draft`
- `published`
- `archived`

Operational place status is separate from CMS publication state.

Published tours require a published city and published stops. Place/tour relationship changes must preserve same-city and publication graph integrity.

## Public content source strategy

Server-only content selection supports:

- `code`
- `database`
- `auto`

`code` uses the canonical TypeScript snapshot.

`database` requires a complete valid published database snapshot and fails clearly if the snapshot is incomplete.

`auto` prefers a valid published database snapshot and falls back wholesale to code. It must not silently merge arbitrary partial database content into canonical content.

The public repository/API exposes explicit DTOs and excludes internal actor/staff data.

## CMS import behavior

The Lübeck bootstrap/import is explicit and repeatable. It is not part of Vercel build.

Important properties:

- deterministic
- idempotent
- transaction-safe
- preserves staff-authored content instead of blindly overwriting it
- imports only explicitly authored localizations
- does not materialize fallback translations as authored rows

## Admin authentication and RBAC

CMS-01 provides secure `/admin` access.

Identity/session infrastructure uses Better Auth, while CITYWALK owns staff membership/authorization state.

Staff roles:

- `super_admin`
- `admin`
- `content_editor`
- `reviewer_publisher`

Authorization is capability-based and supports city-scoped staff access.

Key invariants:

- authenticated user does not automatically mean staff
- traveler/customer accounts remain conceptually separate from staff privileges
- roles, scopes, and actor IDs are derived server-side
- unauthorized and unauthenticated behavior remain distinct
- client data cannot grant staff access

## RAG and source trust

The verified RAG knowledge base is an independent trust system.

Critical invariant:

**CMS published != RAG verified**

Do not infer RAG trust from:

- CMS publication
- uploaded media
- a translation existing
- an admin user creating text

Verified source attribution and AskGuide/RAG filtering must remain intact unless a dedicated source/editorial workflow ticket explicitly changes them.

## Audio trust boundary

Approved audio is separate from CMS publication and separate from RAG trust.

Current migration rules:

- existing approved audio behavior remains authoritative during transition work
- exact locale is required
- generated or uploaded audio is not automatically approved
- missing locale coverage must remain visibly missing rather than fabricated

CMS-03 may add media/audio operations, but it must preserve these rules.

## Tours

Two concepts must remain separate:

1. curated/editorial tours stored as content
2. personalized AI Tour Builder output generated from traveler preferences/context

Do not persist dynamically generated personalized tours as editorial tours unless a dedicated product design explicitly introduces that behavior.

## Maps and location

The public experience includes map, GPS/Near Me, distance calculation, location permission handling, and arrival-related behavior.

Location features must:

- degrade safely when permission is denied or unavailable
- not depend on analytics availability
- preserve privacy-oriented messaging
- remain usable across supported locales and RTL

## Analytics

Analytics are useful but non-critical infrastructure. Product behavior should not fail when analytics is unavailable.

Do not send secrets, authentication material, or sensitive internal data to analytics.

## Database and migrations

PostgreSQL + Drizzle is the operational database foundation.

Rules:

- committed additive migrations
- no automatic destructive resets
- use transactions for multi-table consistency
- run migration/verification commands against the intended environment
- distinguish local PostgreSQL from Preview Neon before operational commands
- never treat a local `.env.local` as proof that a command targets Preview

## Vercel Preview

Vercel Preview is part of the acceptance process.

Remember:

- environment variables are deployment-scoped
- an environment-variable update may require a fresh deployment
- Preview Protection/SSO can intercept HTTP testing before the request reaches the application
- inspect runtime logs when deciding whether a request actually hit a route
- Preview DB/storage must be isolated from production

## Media direction

CMS-03 introduces a media library using an S3-compatible object-storage abstraction.

Design direction:

- PostgreSQL stores immutable asset identity + metadata + relationships
- binary assets live in object storage/CDN, not PostgreSQL and not Git
- domain code stays provider-neutral
- credentials remain server-only
- uploaded media has an approval/lifecycle state independent from CMS publication
- public media resolvers expose only approved, safe, attached assets
- legacy image/audio fallback remains during migration

## Mobile direction

Future native-quality mobile work is planned around React Native + Expo rather than a WebView wrapper.

The Next.js app remains useful for:

- Admin
- public web
- backend/content APIs
- shared platform services

Future mobile commerce should respect Apple/Google store requirements and shared entitlement state. Do not introduce mobile purchase architecture inside unrelated CMS tickets.

## Roadmap boundaries

Platform work currently proceeds roughly through:

- CMS-03 Media Library
- CMS-04 editorial/source verification workflow
- CMS-05 translation/audio operations
- anonymous visitor sessions
- traveler user accounts
- products/payments/entitlements
- paywall/city pass
- native mobile foundation and store-readiness work

UX-01 tracks the Home/Explore product-experience redesign separately from CMS infrastructure.

Do not implement later roadmap items early unless they are required for the current ticket's correctness and the scope change is explicitly reported.
