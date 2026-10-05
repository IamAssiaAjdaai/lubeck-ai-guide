# CITYWALK Monetization

This document records the approved v1 monetization direction and the server access
model. It is product/domain guidance, not a source of localized App Store or Google Play
prices.

## Launch pricing direction

| Plan | Target launch price |
| --- | ---: |
| Free | €0 |
| Lübeck City Pass · 72h | €4.99 one-time |
| CITYWALK Premium Monthly | €7.99 / month |
| CITYWALK Premium Yearly | €39.99 / year |

No free trial is planned for launch. The Free experience is the product's acquisition
and trial surface.

Native subscription UI must display the localized price returned by the store / trusted
purchase SDK. Do not hard-code the monthly or yearly EUR target into purchase UI or use
it to validate provider evidence.

## Access tiers

CITYWALK has three authorization outcomes:

1. `free` — no paid entitlement;
2. `city_pass` — paid access scoped to one city and normally time-limited;
3. `premium` — global Premium entitlement, with precedence over a city pass.

The canonical global Premium entitlement is:

`feature:premium`

A 72-hour city pass remains a city entitlement such as:

`city:lubeck`

The server resolver order is `premium > city_pass > free`. The client must never choose
or assert its own tier.

## Current feature policy

Launch policy should preserve a useful guest-first core rather than paywall the basic
walking experience.

Free:
- browse live city content;
- build and use the basic walk flow;
- basic Live Walk behavior;
- selected stories/audio where published as free;
- 3 verified AI Guide answers per 24 hours.

Paid city access or Premium:
- protected premium stories/audio for an entitled city;
- 20 verified AI Guide answers per 24 hours;
- future premium discoveries/content when actually implemented.

Do not advertise unlimited AI. Do not advertise offline access until an offline feature
is implemented and accepted. Do not advertise unlimited cities; Premium should be
described as access across available CITYWALK cities.

## Trusted purchase sources

PostgreSQL remains the access authority.

Order-backed access:
- existing Stripe one-time purchases;
- existing native sandbox/legacy order records;
- future trusted one-time City Pass reconciliation where appropriate.

Subscription-backed access:
- recurring provider subscription records normalized into
  `commerce_subscriptions`;
- entitlements reference the subscription through `source_subscription_id`.

Every entitlement has exactly one trusted source: one order or one subscription.

A checkout return, RevenueCat CustomerInfo object, StoreKit/Play client callback or UI
flag is not sufficient to grant server access.

## Subscription lifecycle model

`commerce_subscriptions` stores provider-neutral normalized lifecycle state:

- provider and stable provider subscription identity;
- provider product id and store;
- sandbox/production environment;
- optional original transaction identity;
- normalized status;
- current period end;
- whether renewal is expected.

The normalized status set is:

`active | grace_period | billing_issue | paused | canceled | expired | revoked`

Status alone does not authorize content. The entitlement row remains the authorization
record, including its expiration/revocation state.

Cancellation must not imply immediate loss of already-paid access. Later RevenueCat
reconciliation must keep entitlement expiry aligned with the trusted provider period.

## RevenueCat follow-up

MON-01 contains no RevenueCat integration.

Planned follow-ups:

- MON-02 — RevenueCat native SDK, Better Auth user id as App User ID, offerings and
  localized store product presentation.
- MON-03 — authenticated/HMAC-verified RevenueCat webhook normalization and idempotent
  PostgreSQL reconciliation.
- MON-04 — native paywall, purchase, restore and manage-subscription flows plus Apple and
  Google sandbox acceptance.
- MON-05 — remove obsolete direct native purchase machinery only after the replacement
  path is accepted.

Existing Stripe checkout and legacy entitlements stay compatible during the transition.
