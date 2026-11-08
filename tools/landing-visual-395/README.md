# CITYWALK original landing — static visual gallery (#395)

**Ready for local visual review. NOT deployed or approved for online publication.**
All new files and generated output are confined to `tools/landing-visual-395/`.
Existing application/landing source, production config, `tools/preview-395`, audit files
and the three release commits remain unchanged. No app server, DB, Hyperdrive, Worker,
provider, cron, paid CI, DNS or cloud resource operation was needed for this gallery.

## Open locally

Double-click `dist/index.html` to open the self-contained gallery in a browser, or use
this file-only, loopback-bound static server from any working directory:

```sh
node /Users/assia/Documents/GitHub/citywalk-landing-runtime-rc/tools/landing-visual-395/serve.mjs
```

Then open `http://127.0.0.1:3950/`. Ctrl+C stops it. If the port is occupied, pass a
second argument, for example `node /absolute/path/to/serve.mjs 3951`.
The server serves only the eight named static files, supports GET/HEAD, rejects writes,
and exposes no application/API, directory listing, source code, provenance or secrets.
The gallery itself has no JavaScript or server requirement and also works as local files.

The four frames retain the full original image aspect ratio. Scroll inside each frame
or use its full-size link to read/zoom the original PNG. Pictured CTAs/FAQ/account/legal
links are pixels, not active controls. The surrounding gallery navigation and full-size
links are the only interactions.

## Screenshot provenance and exact source

Requested candidate: `7b99bf81c7c19010ef6019ac9a31cf974903e3b6` on
`codex/landing-runtime-rc`. Preserved release commits: `53186fd`, `3057e81`, `7b99bf8`.

These are the existing local 19 October 2026 full-page screenshots from
`.citywalk/runtime-rc/home-{320,390,768,1440}.png`, copied **byte-for-byte**, without
resizing, cropping, retouching, recomposition or new image generation:

| Viewport at capture | Full-page PNG | Published-relative path |
|---|---|---|
| 320 × 900 | 320 × 8248 | `screenshots/landing-320.png` |
| 390 × 900 | 390 × 7841 | `screenshots/landing-390.png` |
| 768 × 900 | 768 × 7221 | `screenshots/landing-768.png` |
| 1440 × 900 | 1440 × 4759 | `screenshots/landing-1440.png` |

The recorded capture harness used local `127.0.0.1:3191/`, a disposable uniquely named
loopback PostgreSQL database, a local Vite preview, no real provider credentials and
browser blocking of non-loopback requests. Its recorded results report all four landing
checks passing, no overflow/broken images, and zero external browser requests. The
harness was read, not rerun; its generated binding mutations/DB operations are not
part of this task. All four images were visually inspected against original page source.

`provenance.json` freezes the screenshot SHA-256 values, dimensions, source/output paths,
recorded capture evidence hashes, and 31 current protected source hashes (checked against
both working bytes and requested HEAD). It also checks **42 rendering/build input hashes**
against historical capture base `689cb46c1f252ffdd7875c71d2ba9024ca1b450b`; the landing,
styles, branding, imagery and inputs are identical through the three release commits.
No fresh execution of HEAD or backend acceptance is claimed. Capture-time PNG hashes
were not signed/recorded historically; this task records the existing image bytes now.
No historical founder localhost:3000 reference pixels were available, so exact pixel
comparison to that older rendering remains unverified. Founder review remains necessary.

## Published files and privacy boundary

Only upload the contents of `dist/`:

- `index.html`, `styles.css`, `robots.txt`, `_headers`
- The four `screenshots/landing-*.png` files above

No framework, dependency installation, build command, runtime functions, environment
variables, auth, provider configuration, analytics, forms, embeds, API requests or
external assets are included. CSS uses system fonts. Static HTML/CSS/PNG bytes are
checked for known production Worker/resource IDs, production origin strings, credential
markers and runtime binding names. PNGs have only IHDR/IDAT/IEND chunks, with no text,
EXIF or user metadata. No production configuration or credentials are packaged.

**Original public content remains visible in the screenshot pixels:** CITYWALK branding,
social handles, the public role-based support address and photo-credit text. These are
not live links and are not private operator/account data, but an absolute claim that the
images contain no names or contact information would be inaccurate. No operator name,
private legal address, session/account information or secret was observed. The privacy
review must explicitly accept that existing public footer/attribution content before
online publication; the source PNGs were not redacted to conceal it.

The visible notice labels the gallery visual-only and non-interactive. `robots.txt`
disallows all crawlers. HTML robots metadata and the optional host `_headers` rules add
noindex/nofollow/noarchive/nosnippet, no-store, same-origin image/style CSP, no scripts,
no connections, no forms, no framing and no referrer. **Robots and noindex are not
access controls, confidentiality protection or legal approval.** A unique URL is not
private access either. Host support for `_headers` must be independently checked.

## Verification

```sh
node /Users/assia/Documents/GitHub/citywalk-landing-runtime-rc/tools/landing-visual-395/verify.mjs
```

The checker uses the already installed Playwright runtime and Chrome. Optional overrides
`CITYWALK_PLAYWRIGHT_MODULE` (absolute module path) and `CITYWALK_CHROME_PATH` select
existing local installations; no dependency or browser is downloaded. Browser temporary
data and results stay below `.local/`. The temporary loopback server is stopped after QA.
It is not an app server and never connects to a DB.

Actual results:

- Pinned HEAD/branch and all three release ancestors: pass.
- 31 original source hashes, 42 unchanged historical render inputs: pass.
- Four PNG hashes equal the original captures; dimensions and no textual metadata: pass.
- Exactly eight allowlisted static output files; no symlinks, server bundle or configs: pass.
- All eight files return 200; PNG responses equal the local bytes: pass.
- All four images load at gallery viewport widths 320, 390, 768 and 1440; no horizontal
  page overflow or aspect-ratio distortion: pass.
- All four original-size image links open successfully at their original dimensions: pass.
- Keyboard skip navigation, visual-only/noindex notices, same-origin active links: pass.
- Zero external page requests, browser runtime errors, scripts, forms or frames: pass.
- API/source/env/config/directory requests return 404; writes return 405: pass.
- Production-resource/credential-marker scan: pass (see pictured-public-content caveat).

Detailed results: `.local/test-results.json`. Gallery QA images:
`.local/gallery-{320,390,768,1440}.png`. `publish-manifest.json` records every upload file's
SHA-256 and size. These review records, scripts and README are **not** upload assets.
No original/previous audit results were overwritten. No app-wide test/build, DB command,
real provider check or deployed acceptance is claimed.

## Separately approved hosted visual preview — instructions only

Recommended method: **manual static folder upload to a NEW dedicated Netlify project**,
using its separate generated hostname. Netlify documents that manual drag-and-drop deploys
accept an existing output folder without running a build or requiring Git/CI:
https://docs.netlify.com/deploy/create-deploys/#drag-and-drop
This does not use CITYWALK's production Cloudflare Worker or production origin.

Do not perform these steps until explicit founder approval and privacy/access review:

1. Review these exact PNGs, public footer/photo-credit content, provenance and upload-file
   manifest. Decide whether anonymous public viewing is permitted. Do not assume a unique
   hostname or crawler exclusions restrict access. If restricted/private viewing is
   required, establish and independently test the host's access policy BEFORE uploading;
   if unavailable, stop. Do not use an immediate public Drop upload for private material.
2. Once public static viewing is explicitly approved (or a protected project is ready),
   select a NEW standalone static project/manual deploy. No repository connection, build
   command, functions, environment variables, forms processing, analytics, feedback toolbar,
   paid CI, custom domain, DNS or CITYWALK integration. Do not select an existing site.
3. Upload **only** `tools/landing-visual-395/dist/` (the eight reviewed files), not the
   repository, parent directory, provenance, scripts or `.local` QA data. Manual Drop may
   publish immediately; the upload itself is the separately approved deployment action.
4. Retain the dedicated generated hostname, verify the file hashes where possible and
   check the four images/full-size links, robots, response noindex headers and access policy
   on that hostname. Check browser networking for host-injected scripts/trackers; reject
   the hosted result if any appear. No hosted acceptance is inferred from local QA.
5. Do not add the production domain or change its DNS/Worker/routes. Removal means deleting
   only this new static preview project after approval; no production rollback is needed.

No host account/project has been created or configured, no upload/commit/push/merge was
performed, and no paid CI was used. This task delivers local files and instructions only.
