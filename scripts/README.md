# Landmark audio generation

This tooling runs only during development or content production. The Next.js runtime never calls a text-to-speech provider.

## Commands

- `npm run audio:coverage` reports exact-locale coverage without calling Google APIs.
- `npm run audio:generate -- --dry-run` reports what would be generated without API calls or file writes.
- `npm run audio:generate` (or `--provider=google`) generates only missing targets using Google Application Default Credentials.
- `npm run audio:generate -- --provider=edge` generates test-review audio through Edge TTS without an API key.

Google Cloud remains the intended production provider. Set `GOOGLE_APPLICATION_CREDENTIALS` to an approved service-account JSON file stored outside this repository before Google generation. Edge output is development/test audio only: manifest entries are explicitly marked `"provider": "edge-tts-test"` and are not production-approved. Existing recordings are never overwritten by either provider.

The Edge adapter uses the TypeScript `edge-tts.js` client. It lists live provider voices and streams the returned MP3 bytes into the same validated, atomic publishing path used by Google generation.

Voice selection is deterministic. Google matching voices are ranked by family in this order: Chirp 3 HD, Studio, Neural2, WaveNet, Standard, then other supported voices. Edge selection fetches the provider voice list, requires an exact-locale Neural voice, prefers declared female/neutral voices when available, then sorts voice names alphabetically. No Edge voice names are hardcoded.

Generated files are first written and validated as temporary MP3s, then atomically published under `public/audio/<landmark>-<locale>.mp3`. Non-secret provenance and a SHA-256 hash of the exact localized `landmark.story` source are stored in `audio-generation-manifest.json`.
