# MONARCH — one app, everything included

The website (system-portal.netlify.app) is on the **website only** side.
The installable Android app you put on your phone is **MONARCH**.

## What's inside (works fully offline)

- **MONARCH** home: player card with original crest, level + rank (E→S),
  XP / HP / MP bars, ability points, workout streak, stats for workouts and quests
- **Workout**: multi-exercise sessions, weight × reps per set, auto PR detection,
  Push/Pull/Legs/Full Body plans, volume totals, history
- **Quests**: active quests completable in one tap — XP, gold, ability points
- **Stats**: STR/AGI/VIT/INT/PER attributes, derived HP/MP, rank ladder, ability points
- Every tool from the site in the **More** tab (open them inside the app):
  Exercises · Study · BMI & Diet · Food Database · Meal Calculator
  Status · Vision (camera check-ins) · Advisor · Progress · Inventory
  Awakening · Extraction · Arise · Shadow Army

## Sign in

- Local accounts (works offline) — create one once, it stays on the device.
- Google sign-in / account creation activates as soon as a real Google OAuth
  Client ID is added to `scripts/config.js` (see step below).
- The built-in admin account from `scripts/config.js` works for testing.

## Google sign-in (when you have the client ID)

1. https://console.cloud.google.com/apis/credentials → Create OAuth 2.0 Client ID
   (Web application).
2. Authorised JavaScript origins:
   - `https://system-portal.netlify.app`
   - `https://appassets.androidplatform.net`
   - `http://127.0.0.1:8091` (for local testing)
3. Paste the client ID into `scripts/config.js` → `googleClientId`, redeploy,
   rebuild MONARCH (`python monarch\build_apk.py`).

## Build the APK

```powershell
python monarch\build_apk.py
```

Prerequisites: JDK 17+, Android SDK with build-tools and any `platforms/android-*`.
Output: `monarch/dist/MONARCH-1.0.apk` and `MONARCH.apk` in the repo root.

- Package: `com.alksri.monarch`, label **MONARCH**
- Main activity: `com.alksri.monarch.MainActivity` (WebView shell)
- All 20 pages, 270 hero frames, icons, crest and generated art are bundled.
- min Android 7 (API 24). Offline-capable; no network except Google sign-in.

## Sharing this app

Signed with a local self-signed certificate (`monarch/keystore/monarch.jks`,
kept untracked by git). Fine for sideloading on your phone. Publishing on the
Play Store would require Play App Signing and a Google developer account.
