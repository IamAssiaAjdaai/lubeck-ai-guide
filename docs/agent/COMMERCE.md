# CITYWALK Payments, Products & Entitlements

PAY-01 separates payment processing from CITYWALK access rules. MON-01 extends that
model so subscriptions can become a trusted entitlement source without replacing the
existing order/Stripe ledger.

## Trust boundary

- PostgreSQL is the source of truth for products, prices, orders, subscriptions and entitlements.
- A Checkout success redirect is informational only and never grants access.
- Paid access is granted or revoked only after a verified provider webhook is processed server-side.
- Entitlement authorization is server-side through `hasActiveEntitlement` / `requireActiveEntitlement`.
- CITYWALK stores no full card number, CVC or raw payment-method payload.
- Stripe secrets use `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; they must never use a `NEXT_PUBLIC_*` name.

## Product model

\`commerce_products\` describes a logical sellable city pass or feature bundle. \`commerce_prices\`
maps the existing hosted Stripe checkout to provider price ids. \`commerce_product_grants\`
declares the city/feature scopes that become entitlements after a trusted purchase.

\`commerce_subscriptions\` is a provider-neutral lifecycle ledger for recurring native
subscriptions. It records normalized provider/store identity and period state, but does
not itself authorize content. Authorization still comes only from an active
\`commerce_entitlements\` row.

An entitlement is backed by exactly one trusted source:

- \`source_order_id\` for the existing one-time/order path; or
- \`source_subscription_id\` for recurring subscription reconciliation.

The database constraint rejects rows with neither source or both sources. Existing
order-backed entitlements remain valid.

The approved v1 access model and target launch pricing are documented in
\`docs/agent/MONETIZATION.md\`.

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

\`commerce_provider_events(provider, provider_event_id)\` is unique. Duplicate deliveries
return \`duplicate\` without repeating business mutations. Order-backed entitlements have
a unique order/scope key; subscription-backed entitlements have a unique
subscription/scope key. A provider subscription identity is also unique per provider.

## Refund and cancellation rules

- Full refund: order becomes `refunded`; active entitlements from that order are revoked.
- Partial refund: order becomes `partially_refunded`; access remains active.
- Checkout expiration / payment cancellation before payment: order becomes `canceled`; no entitlement is granted.
- Async payment failure: order becomes `failed`; no entitlement is granted.
- Amount or currency mismatch between the server-created order and verified provider event fails closed and grants no access.

## Account deletion

Traveler entitlements and provider-customer mappings cascade with the user account.
Financial order and subscription lifecycle records remain for commerce/accounting
integrity, with their user reference set to null when the user identity is deleted.
This keeps account deletion possible without silently deleting the payment ledger.

## Admin visibility

Only `admin` and `super_admin` have `commerce:view`. The Admin Commerce page is read-only and exposes order/access state without full card data.

## Access model after MON-01

- Global CITYWALK Premium is represented by `feature:premium`.
- A 72-hour City Pass remains a city-scoped entitlement with an expiry.
- The unified server resolver returns `premium > city_pass > free`.
- Existing Lübeck legacy/native sandbox grants remain compatible through the city-pass
  access layer.
- Premium media and AI allowance authorization can accept either global Premium or a
  valid city-scoped pass.
- Free AI remains 3 verified answers per 24 hours; paid access remains bounded at 20.

## Follow-up boundaries

MON-01 does **not** integrate RevenueCat or create live store subscriptions. Follow-ups
own SDK identity/offerings, verified webhooks, store purchase/restore/manage UI and
eventual retirement of the direct native sandbox purchase path. Provider state must
never become the client-side entitlement authority.
