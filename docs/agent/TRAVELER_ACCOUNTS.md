# Traveler Accounts

GitHub issue #55 adds optional traveler accounts after the guest has already experienced CITYWALK value.

## Identity boundaries

CITYWALK reuses the Better Auth `user`, `session`, and `account` tables for secure identity and credential handling. A traveler identity receives no staff privileges by default. Admin access still requires a separate active `staff_memberships` row and the required capability.

Traveler-specific data lives outside Better Auth core tables:

- `traveler_profiles`: one row per authenticated traveler identity with the preferred locale.
- `traveler_guest_links`: maps the stable anonymous `visitorId` from CW-29 to one authenticated user and records the latest browser-session identifier used during linking.

The anonymous visitor identifier is unique across traveler links. CITYWALK refuses to silently move the same guest identity from one authenticated account to another.

## Guest-first flow

Exploration remains available without authentication. Public localized routes surface a `Save your trip` value moment. Signup uses email, display name, and a 12–128 character password through Better Auth. Signup does not auto-sign-in; the traveler explicitly signs in before the guest trip is linked.

After sign-in, the client sends only the pseudonymous `visitorId`, `sessionId`, and preferred locale to the authenticated `/api/account/link-guest` endpoint. Raw GPS coordinates, location trails, passwords, auth tokens, and staff authorization data are never part of the traveler guest-link model.

## Account deletion and export boundary

The Better Auth `user` row is the account root. Both traveler tables reference it with `ON DELETE CASCADE`, so a future account-deletion workflow can remove traveler profile and guest-link data together with the identity.

A future account-export workflow should export:

1. Better Auth user profile fields that are safe for the traveler to receive (email, display name, verification state and timestamps).
2. `traveler_profiles` preferred locale and timestamps.
3. `traveler_guest_links` visitor/session link metadata and timestamps.
4. Future persistent progress/passport data owned by later tickets.

Credential hashes, session tokens, provider secrets, staff-only authorization metadata, and internal security fields must never be included in a traveler export.

This ticket establishes the identity/linking foundation only. Persistent cross-device tour progress, passport history, plans, entitlements and payments remain owned by their dedicated follow-up tickets.
