# Anonymous Visitor Sessions

GitHub issue #54 introduces a guest-first visitor identity for product analytics without requiring traveler authentication.

## Domain model

CITYWALK keeps two pseudonymous browser identifiers:

- `visitorId`: a stable anonymous visitor UUID stored in `localStorage`.
- `sessionId`: a browser-session UUID stored in `sessionStorage` and bound to the current `visitorId`.

Neither identifier contains user-provided profile data. They are generated with `crypto.randomUUID()` and are not derived from IP address, browser fingerprinting, GPS, or device characteristics.

## Retention

- Anonymous visitor identifier: 180 days maximum in CITYWALK browser storage.
- Visitor session identifier: 24 hours maximum, and normally shorter because `sessionStorage` is cleared when the browser session ends.
- An expired visitor rotates both visitor and session identifiers.
- An expired session rotates only the session identifier.
- PostHog event retention remains governed by the configured PostHog project/privacy policy; CITYWALK code does not silently override that policy.

## Analytics contract

When PostHog capture is enabled, CITYWALK registers the identifiers as event super-properties:

- `citywalk_visitor_id`
- `citywalk_session_id`

Existing events such as map, AI, audio, tour start/completion, and future feedback events therefore inherit the same anonymous identity without duplicating event storage in PostgreSQL.

The public route tracker adds canonical journey events:

- `city_opened`
- `place_viewed`

The legacy `landmark_opened` event remains untouched for backwards-compatible analytics.

## Privacy boundaries

- Never store or attach raw latitude/longitude, GPS trails, coordinates, authentication tokens, email addresses, or staff authorization state to this identity.
- Location features remain independent from analytics and must continue to work when analytics is unavailable.
- If PostHog capture is opted out, CITYWALK does not register or transmit the visitor/session identifiers to PostHog.
- Browser-storage failures degrade to in-memory pseudonymous IDs so the guest experience continues to work.

## Future account migration

CW-30 / issue #55 owns traveler accounts. After a traveler has authenticated through a server-authoritative account flow, that ticket may use the existing `visitorId` as the migration/link key for eligible guest progress and may connect the PostHog anonymous history to the authenticated analytics identity.

This ticket deliberately does not create traveler accounts, entitlements, payment state, or staff memberships, and it does not reuse Better Auth staff sessions as anonymous traveler sessions.
