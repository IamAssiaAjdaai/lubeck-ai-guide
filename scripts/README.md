# Content production operations

## Lübeck City Pass provisioning

`npm run commerce:provision-lubeck-pass` explicitly provisions the inactive
72-hour `city:lubeck` product and grant from the shared City Pass configuration.
The same platform authorization remains keyed by the supplied city slug; this
script is intentionally Lübeck-specific only because Lübeck is the first launch
configuration. It does not create a price, activate a
product, seed production data, or contact Stripe.

After creating an approved Stripe **test-mode** Price, a trusted operator may
configure it explicitly:

`npm run commerce:provision-lubeck-pass -- --provider-price-id=price_test_... --unit-amount=699`

Add `--activate` only when the test catalog is intentionally ready. The amount
is display/catalog metadata and never participates in entitlement checks. Never
put live provider identifiers or secrets in this repository.

## Verified AI knowledge operations

Verified AI evidence is stored separately from ordinary CMS content and source
references. Adding a chunk requires an existing CMS place and an HTTPS source
already linked to that place. These commands are local/server-only operations;
there is no public mutation endpoint.

- Add: `npm run knowledge:manage -- add --city=<slug> --place=<slug> --source=<https-url> --locale=en --text=<verified-text> --topics=history,architecture`
- Remove: `npm run knowledge:manage -- remove --id=<chunk-uuid>`

Only active chunks for the exact city, place, and knowledge locale can enable or
ground the public AI Guide. Publishing CMS prose or attaching a source does not
automatically make either one verified AI evidence.

## Landmark audio generation

This tooling runs only during development or content production. The Next.js runtime never calls a text-to-speech provider.

## Commands

- `npm run audio:coverage` reports exact-locale coverage without calling Google APIs.
- `npm run audio:generate -- --dry-run` reports what would be generated without API calls or file writes.
- `npm run audio:generate` (or `--provider=google`) generates only missing targets using Google Application Default Credentials.
- `npm run audio:generate -- --provider=edge` generates test-review audio through Edge TTS without an API key.
- `npm run media:backfill-audio-duration` reads private uploaded audio through the configured storage adapter and fills only missing, reliably extracted duration metadata.

Google Cloud remains the intended production provider. Set `GOOGLE_APPLICATION_CREDENTIALS` to an approved service-account JSON file stored outside this repository before Google generation. Edge output is development/test audio only: manifest entries are explicitly marked `"provider": "edge-tts-test"` and are not production-approved. Existing recordings are never overwritten by either provider.

The Edge adapter uses the TypeScript `edge-tts.js` client. It lists live provider voices and streams the returned MP3 bytes into the same validated, atomic publishing path used by Google generation.

Voice selection is deterministic. Google matching voices are ranked by family in this order: Chirp 3 HD, Studio, Neural2, WaveNet, Standard, then other supported voices. Edge selection fetches the provider voice list, requires an exact-locale Neural voice, prefers declared female/neutral voices when available, then sorts voice names alphabetically. No Edge voice names are hardcoded.

Generated files are first written and validated as temporary MP3s, then atomically published under `public/audio/<landmark>-<locale>.mp3`. Non-secret provenance and a SHA-256 hash of the exact localized `landmark.story` source are stored in `audio-generation-manifest.json`.

The media-duration backfill is an explicit server-side operational command. It does not alter media lifecycle, approval, attachments, locale, or publication state. Missing objects and ineligible records are skipped; an extraction failure is counted without stopping the remaining assets.
