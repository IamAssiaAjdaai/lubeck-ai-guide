# CITYWALK App Icon Pack V1

This pack applies the approved CITYWALK location-pin + walking-route mark to native launcher, splash, browser, and installable-web surfaces.

## Locked identity

- Canvas: `#FAFAF8`
- Navy pin: `#0E2C44`
- Teal route: `#019FA3`
- Geometry: use the approved CITYWALK mark from the Brand System; do not redraw, rotate, stretch, or add a second symbol.

## Native launcher

`mobile/assets/images/icon.png` is the opaque 1024×1024 launcher master. The platform owns the final corner/mask treatment; rounded corners are not baked into the source artwork.

Android adaptive icons use three explicit layers:

- `android-icon-foreground.png`: transparent 1024×1024 foreground with a conservative safe margin.
- `android-icon-background.png`: opaque CITYWALK Canvas.
- `android-icon-monochrome.png`: single-color alpha mask for Android themed icons.

Do not restore the previous blue adaptive background (`#0787BE`).

## Splash

The native splash uses the same launcher master on the same Canvas background. Because both backgrounds are identical, the launch surface reads as the CITYWALK mark rather than a visible square inside a square.

## Web / PWA

- `src/app/icon.svg`: browser/app icon using the approved colors.
- `src/app/apple-icon.png`: opaque Apple web-app icon generated from the same launcher master.
- `public/pwa/maskable.svg`: reduced-size mark with extra safe area for aggressive PWA masks.
- `src/app/manifest.ts`: installable-web identity and theme colors.

## Validation rules

- Native raster launcher/adaptive sources stay 1024×1024.
- Foreground and monochrome adaptive layers retain transparency.
- Launcher/background assets remain opaque.
- App icon source files must not contain platform-specific rounded corners.
- Store screenshots, promotional art, and social creatives may use the wider brand system, but they must not replace the launcher mark with unrelated artwork.
