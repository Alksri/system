# System Portal — Android app (APK)

A real, installable Android app that contains the **entire** System Portal:

- Every page: dashboard, status, quests, inventory, vision, extraction, army,
  advisor, progress, BMI/diet, food database, meal calculator, exercises,
  study, and the themed 404.
- All 270 hero frames, styles, animations and the ARISE effects.
- Local accounts (PBKDF2), per-user progress, camera check-ins, the diet-plan
  PDF, exercise timers, study timers/blocks/chat — everything.
- **Works with zero internet**: all files live inside the APK. Only Google
  Sign-In needs the network (and it stays off until a real OAuth client ID is
  configured).

## Install on a phone

1. Copy `SystemPortal.apk` to the phone (USB, Bluetooth, Google Drive, or
   download it from the deployed site).
2. Tap the file. Android will ask to allow installs from this source — allow
   it for the file manager/browser you used.
3. Open **System Portal** from the app drawer.
4. Create a local account (or use the built-in admin account printed on the
   login screen). Everything is stored on the phone only.

Requirements: Android 7.0 (API 24) or newer. Minimum ~40 MB free storage.

## Online accounts (registration with email OTP)

The app and the website share one account system: register with your Gmail
on either platform and sign in on the other.

- Registration is a 3-step wizard (`register.html`): profile (name, gender,
  age/DOB, height, weight, activity, goal) → 6-digit code emailed to your
  Gmail → set your password.
- Passwords are stored PBKDF2-SHA-256 hashed on the Netlify project (and
  mirrored locally inside the app for offline sign-in).
- **OTP delivery requires internet.** The OTP is sent by a Netlify Function
  via Brevo. Signing in afterwards works offline, as does everything else in
  the app.
- The account you register is mirrored under `system_portal_users_v1` on this
  device, so the same email + password works on the site and the app.

## What is inside the APK

| Path | Purpose |
| --- | --- |
| `assets/www/` | The complete offline site (HTML, CSS, JS, icons, frames, jsPDF) |
| `MainActivity.java` | Native WebView shell, asset server, camera permission, PDF saving |
| `res/` | Launcher icon, adaptive icon, splash screen, theme |
| `AndroidManifest.xml` | App identity, permissions, activity |

The WebView serves the bundled files from `https://appassets.androidplatform.net`
so `localStorage`, Web Crypto (password hashing) and camera APIs behave exactly
like a normal secure origin. Nothing is fetched from the network at runtime.

## App-specific behaviour

- The hardware **Back** button walks back through page history, then exits.
- **PDF downloads** (BMI & Diet Plan → Download PDF) are written to
  `Downloads/` via `SystemAppBridge.savePdf`, with a toast confirmation.
- **Camera** check-ins work: Android asks for camera permission the first time.
- **Timers** (exercise, breathing, study) keep the screen awake while running.
- External links (Google console help, etc.) open in the phone's browser.

## Rebuild the APK

Prerequisites on the build machine:

- JDK 17+ (`javac`, `keytool`, `jar`)
- Android SDK with `build-tools` (aapt2, d8, zipalign, apksigner) and any
  `platforms/android-*/android.jar`

Then from the repo root:

```powershell
python android\build_apk.py
```

The script:

1. bundles the site into `android/build/assets/www` (all `*.html`,
   `scripts/`, `styles/`, `icons/`, `vendor/`, `manifest.json`, all frames;
   `sw.js` is intentionally excluded because the app is already offline),
2. compiles resources with `aapt2`, Java with `javac`, dex with `d8`,
3. zipaligns and signs with `android/keystore/system-portal.jks`,
4. writes `android/dist/SystemPortal-1.0.0.apk` and `SystemPortal.apk`
   in the repo root.

The signing key is local to this machine (`android/keystore/`). Keep it if you
want future builds to install as updates over the current app; without it you
must uninstall the old app first.

## Verification

```powershell
# structural check of the built package
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\37.0.0\aapt2.exe" dump badging SystemPortal.apk

# signature check
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\37.0.0\apksigner.bat" verify --print-certs SystemPortal.apk
```

## Notes

- Accounts, progress and check-ins live in the WebView's `localStorage` inside
  the app sandbox. Uninstalling the app deletes them, same as clearing app data.
- The APK is signed with a local self-signed certificate, which is correct for
  sideloading. Publishing to Google Play would require Play App Signing.
- Health and nutrition values are reference estimates, not medical advice.
