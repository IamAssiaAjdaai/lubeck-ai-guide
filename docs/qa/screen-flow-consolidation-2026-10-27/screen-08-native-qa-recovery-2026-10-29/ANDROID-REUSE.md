# Android development-client recovery

The running environment initially had no connected Android device. Existing Pixel_9 and Medium_Phone AVDs were available. Pixel_9 was booted read-only, without saving a snapshot; no data reset occurred. Android 17 / API 37, arm64, 1080×2424 physical pixels, density 420.

The existing `com.citywalk.app` (code 8) and `com.citywalk.app.preview` (code 3) were release clients, not compatible development launchers. `com.citywalk.app.dev` was absent. The correct existing development scheme is **exp+citywalk-mobile**, not exp+citywalk.

Reused local artifact:
`/Users/assia/Documents/GitHub/citywalk-shareable-walks-qa/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

SHA-256: `905941515ce1f4447db78da63af6cb2dc93a3dc3d31c6cbf3918ca1ddbb6db15`

App ID `com.citywalk.app.dev`, version 1.0.0 / code 1, DEBUGGABLE, development launcher present. React Native 0.86.3 matches current; Expo 57 family matches, but some Expo patch versions differ. This proves compatibility for the executed navigation cases, not exact native lockfile parity or release acceptance. The originating checkout and binary were not modified. No rebuild, dependency install, signing, native project edits or cloud build was needed.

Local recipe used (after verifying the development package was absent):

```sh
/Users/assia/Library/Android/sdk/emulator/emulator -avd Pixel_9 -read-only -no-snapshot-save -no-boot-anim -no-audio
adb -s emulator-5554 install /Users/assia/Documents/GitHub/citywalk-shareable-walks-qa/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb -s emulator-5554 reverse tcp:8091 tcp:8091
adb -s emulator-5554 reverse tcp:3000 tcp:3000
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'exp+citywalk-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091' com.citywalk.app.dev
```

No `-r`, `-d`, `pm clear`, wipe, snapshot replacement or release-package install was used. Metro 8091 served this isolated worktree, with its existing local API 3000. Native captures show the actual Slice02 footer and retained state. UI Automator captured semantic controls, checkbox states and screenshots; ADB KEYCODE_BACK exercised actual Android Back dispatch. Helper scripts and semantic action log are preserved in this folder. These are QA tooling, not application implementations or test doubles.

The read-only emulator is left running at retained planner constraints for owner inspection; no snapshot is saved. Its newly installed development package and QA state are ephemeral. Existing AVD disk state and installed release apps were not replaced. On shutdown, use the emulator's normal quit without saving a snapshot.
