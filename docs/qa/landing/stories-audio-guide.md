# Landing Stories / Audio / Ask CITYWALK — design review checkpoint

Part of #187. Base: `4b827f9987c641b55e4e60d103acbd8a6fc3330b`
(the merge of #207).

## Scope

Public Web only, still behind **`/landing-preview`**.

This checkpoint adds the approved “Stories / Audio / Ask CITYWALK” section and does not
replace the public homepage or add any store/download/signup behavior.

Mobile Core, API/auth, Admin, database, Cloudflare routing, DNS and deployment settings
remain unchanged.

## Product truth used for marketing copy

The section is based on existing native behavior:

- Place Detail renders authored story content when present.
- Place Detail selects audio only for the exact selected locale and shows an unavailable
  state otherwise.
- Ask CITYWALK is exposed only for guide-eligible places.
- Guide answers can include source references, while verified place sources are also
  surfaced on Place Detail.

Relevant implementation:
- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`
- `mobile/src/components/NativeAudioPlayer.tsx`
- `mobile/src/app/city/[citySlug]/guide/[placeSlug].tsx`
- verified knowledge/source boundaries documented in `docs/agent/CITYWALK_ARCHITECTURE.md`

The landing therefore avoids claiming:
- audio exists for every place or every language;
- Ask CITYWALK is available everywhere;
- the guide is a general-purpose “ask anything” assistant.

## Visual boundaries

- The three cards are explanatory marketing cards, not native screenshots.
- The Ask CITYWALK conversation is explicitly labelled an illustrative example and has
  no interactive controls.
- Existing local Holstentor and Marienkirche images are reused for design review only.
  Final homepage media/provenance acceptance remains a separate launch step.
- No external media, map tiles, analytics, AI calls or other network requests are added.

## Responsive intent

Desktop uses three equal cards. Mobile stacks the cards at a readable width and keeps
the existing 320/390px overflow and 200% text acceptance checks.

## Validation

Normal CI remains mandatory. The landing browser workflow also verifies:
- the Stories / Audio / Ask CITYWALK heading is present;
- the availability disclaimer is present;
- no horizontal overflow at 320/390/768/1440px;
- keyboard skip navigation and minimum link target heights;
- 200% text reflow;
- vinext build, SSR module guard and Cloudflare deploy **dry-run only**.

No merge, production deploy, store submission, DNS change, traffic switch or #187
checkbox completion is part of this checkpoint.
