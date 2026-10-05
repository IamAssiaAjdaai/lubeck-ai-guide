# Landing How it works / Return-by — design review checkpoint

Part of #187. Base: `04fc1386aa2e5f656b0203b4fe869857bca9c231`
(the merge of #206).

## Scope

Public Web only, still behind the existing **`/landing-preview`** review route.

This checkpoint:
- polishes the three-step “How it works” story from the approved landing direction;
- adds a responsive Return-by section;
- keeps the same approved CITYWALK visual system and shared logo from #206;
- does not replace `/`, add a newsletter form, add store links, deploy, or change native code.

Mobile Core, API/auth, Admin, database, Cloudflare routing, DNS and Vercel deployment
policy are unchanged.

## Product truth used for Return-by copy

The marketing copy is intentionally based on already-implemented native behavior:

- the planner accepts an optional return deadline;
- the live walk presentation exposes the requested “Back by” time;
- it exposes projected finish / remaining time;
- it derives ahead / on-schedule / behind status from the live walk state.

Relevant implementation:
- `mobile/src/components/NativeWalkFlow.tsx`
- `mobile/src/lib/liveWalkPresentation.ts`
- `mobile/src/components/NativeLiveWalkCard.tsx`

The landing does **not** promise guaranteed arrival, automatic success, or exact real-world
timing. It explicitly says walking times are estimates.

## Visual boundaries

- The Return-by timing card is an explicitly captioned illustrative example, not a live
  native screenshot.
- The example values (`17:30`, `17:16`, `14 min ahead`, `3`) demonstrate the
  information hierarchy only.
- `/landmarks/holstentor.jpg` is an existing repository asset used for design review.
  Final homepage photography still requires the launch media/provenance review.
- No new external image, map, analytics or network request is introduced by this section.

## Responsive intent

Desktop:
- three equal How-it-works steps with lightweight visual progression;
- Return-by is a two-column editorial section: product explanation / timing example
  beside a Lübeck image.

Mobile:
- steps stack with separators rather than shrinking the desktop row;
- Return-by copy and timing example precede the image;
- all existing 320/390px horizontal-overflow and 200% text checks remain required.

## Validation

Normal CI remains mandatory. The landing workflow additionally:
- builds Next.js;
- checks the actual route in Chromium at 320/390/768/1440px;
- verifies the Return-by heading and non-guarantee disclaimer exist;
- checks keyboard skip navigation, minimum link target height and horizontal overflow;
- captures full-page screenshots plus 200% text;
- builds vinext, verifies the SSR module and performs the existing Cloudflare deploy
  **dry-run only**.

No production deploy, store submission, DNS change, traffic switch or #187 checklist
completion is part of this checkpoint.
