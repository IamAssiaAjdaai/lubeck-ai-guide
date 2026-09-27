# @citywalk/i18n

One shared static UI catalog for the six launch locales (DE/EN/DA/SV/NL/ES), with Arabic compatibility for Web, iOS and Android. No city/place/tour editorial records belong in these dictionaries.

```ts
import { t, isRTL, getLocaleLabel } from "@citywalk/i18n";

const label = t(locale, "walk.add");
const step = t(locale, "planner.step", { step: 2 });
```

Keys are typed from English JSON. Lookup falls back to English, then safely to the key. Missing translations warn in development; production does not throw. Locale metadata drives layout separately from text.

`@citywalk/i18n/adapters` provides key-only compatibility views for existing screens. New UI code should use semantic keys directly. `@citywalk/i18n/content` resolves authored dynamic records with requested → English → explicit canonical fallback and honest locale metadata; never use that prose fallback for audio.

See [architecture, migration and audit](../../docs/architecture/shared-i18n.md) for adding locales, legacy Web coverage, native literal exceptions and validation.
