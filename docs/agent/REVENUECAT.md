# CITYWALK RevenueCat foundation

MON-02 adds the native RevenueCat SDK boundary only. It does not activate purchases or
make RevenueCat client state authoritative for protected CITYWALK access.

## Trust boundary

- PostgreSQL entitlements from MON-01 remain the paid-access authority.
- RevenueCat `CustomerInfo` is client UX state only.
- A purchase callback, Offering, package, local entitlement flag, or CustomerInfo object
  must never unlock protected API/media content by itself.
- MON-03 owns verified server event reconciliation into PostgreSQL.

## SDK keys

The React Native SDK must be configured with RevenueCat **public SDK API keys only**.
Secret RevenueCat REST/API keys (`sk_...`) are server credentials and must never be
placed in Expo public environment variables, the native bundle, or GitHub.

CITYWALK uses platform-scoped build environment variables:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

No real key is committed by MON-02. Builds without the current platform key remain
usable; RevenueCat simply reports an unconfigured foundation and returns no plans.

Production/release builds must eventually use the real iOS/Android public SDK keys, not
a RevenueCat Test Store key. Test Store configuration belongs only to development/test
build profiles.

## Identity

CITYWALK is guest-first:

1. RevenueCat configures without an App User ID and creates its anonymous device ID.
2. Better Auth restores or creates the CITYWALK session independently.
3. Once signed in, `nativeAuthClient.useSession()` supplies the Better Auth `user.id`.
4. MON-02 calls `Purchases.logIn(user.id)` when the RevenueCat identity differs.
5. On CITYWALK sign-out, an identified RevenueCat user is logged out and RevenueCat
   returns to an anonymous customer.

Email, display name, locale and other mutable profile fields are never used as the
RevenueCat App User ID.

## Offering contract

MON-02 reads only RevenueCat's current Offering and recognizes these package identifiers:

- `$rc_monthly` → CITYWALK Premium Monthly
- `$rc_annual` → CITYWALK Premium Yearly
- `city_pass_72h` → 72-hour City Pass

Expected store product identifiers for later dashboard/store configuration:

- `com.citywalk.premium.monthly`
- `com.citywalk.premium.yearly`
- `com.citywalk.lubeck.pass72h`

The package normalizer keeps the store-provided `priceString`, currency and numeric price.
Future paywall UI must display the localized store price; the €7.99 / €39.99 / €4.99
figures in product planning are target launch prices, not hard-coded billing evidence.

Unknown/experimental packages are ignored by the v1 normalizer until deliberately added
to the CITYWALK package contract.

## MON-02 exclusions

MON-02 deliberately does not include:

- `purchasePackage` or any other purchase call;
- restore purchases;
- RevenueCat Paywalls UI / `react-native-purchases-ui`;
- Customer Center / manage subscription UI;
- App Store Connect or Play Console product creation;
- webhook handling or PostgreSQL subscription mutation;
- paid-access decisions from client CustomerInfo;
- production deployment or store submission.

Those are follow-up acceptance gates after MON-01 and MON-02 merge.
