# CITYWALK Payments, Products & Entitlements

PAY-01 separates payment processing from CITYWALK access rules.

## Trust boundary

- PostgreSQL is the source of truth for products, prices, orders and entitlements.
- A Checkout success redirect is informational only and never grants access.
- Paid access is granted or revoked only after a verified provider webhook is processed server-side.
- Entitlement authorization is server-side through `hasActiveEntitlement` / `requireActiveEntitlement`.
- CITYWALK stores no full card number, CVC or raw payment-method payload.
- Stripe secrets use `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; they must never use a `NEXT_PUBLIC_*` name.

## Product model

`commerce_products` describes a sellable city pass or feature bundle. `commerce_prices` maps a CITYWALK price to a provider price id. `commerce_product_grants` declares the city/feature scopes that become entitlements after payment.

PAY-01 intentionally does not choose the final Lübeck package or price. CW-26 owns that product decision. A product and price must both be active in the database before the checkout endpoint can sell them.

## Purchase flow

1. Guest-first exploration remains available without login.
2. A traveler signs in at an intentional premium value moment.
3. The client sends only the CITYWALK `priceId` to `/api/commerce/checkout`.
4. The server reloads the active product/price from PostgreSQL and creates a pending order.
5. Stripe Checkout opens with the server-owned Stripe Price ID and CITYWALK order id metadata.
6. Returning from Checkout does not unlock anything.
7. `/api/commerce/webhooks/stripe` verifies the raw request and Stripe signature.
8. The verified provider event is inserted with a unique provider event id and processed in the same database transaction.
9. A verified paid event grants the product's declared entitlements.

## Idempotency

`commerce_provider_events(provider, provider_event_id)` is unique. Duplicate deliveries return `duplicate` without repeating business mutations. Entitlements also have a unique order/scope key so a second successful payment event for the same order cannot duplicate access.

## Refund and cancellation rules

- Full refund: order becomes `refunded`; active entitlements from that order are revoked.
- Partial refund: order becomes `partially_refunded`; access remains active.
- Checkout expiration / payment cancellation before payment: order becomes `canceled`; no entitlement is granted.
- Async payment failure: order becomes `failed`; no entitlement is granted.
- Amount or currency mismatch between the server-created order and verified provider event fails closed and grants no access.

## Account deletion

Traveler entitlements and provider-customer mappings cascade with the user account. Financial order records remain for commerce/accounting integrity, with their user reference set to null when the user identity is deleted. This keeps account deletion possible without silently deleting the payment ledger.

## Admin visibility

Only `admin` and `super_admin` have `commerce:view`. The Admin Commerce page is read-only and exposes order/access state without full card data.

## Future extensions

- CW-26 can create/activate the real Lübeck city-pass product, price and grants.
- Product grants support city-specific access and reusable feature bundles.
- Optional `duration_days` supports time-limited passes.
- The provider column and provider adapter boundary allow a later payment provider without making provider state the entitlement source of truth.
- Subscriptions and native-store purchases remain out of scope for PAY-01.
