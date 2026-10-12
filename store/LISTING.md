# Google Play listing — Bhaag Beta Bhaag!

**App name (≤30):** Bhaag Beta Bhaag! - Chappal Run
**Package:** com.bhaagbeta.game
**Category:** Game → Arcade  **Tags:** Runner, Casual, Offline
**Content rating (IARC questionnaire):** cartoon/comic slapstick only (a dad waves a slipper; no injury, no blood). Expect *Everyone / PEGI 7* (slapstick).
**Ads:** Yes (optional rewarded video only — "Watch ad to escape", max once per run)  **In-app purchases:** No  **Price:** Free
**Target audience (Play Console):** 13+ (choosing ages under 13 puts the app under the Families policy and needs child-directed ad settings).

## Short description (≤80)
Beta broke the TV remote. Papa has a chappal. RUN through India's crazy streets!

## Full description
Uh-oh! Beta broke the TV remote right before Papa's cricket match… and now Papa is coming with the CHAPPAL! 🩴

Run, jump and slide through colourful Indian galis in this hilarious endless runner. Dodge holy cows, auto-rickshaws,
sabzi thelas and buses, duck under shaadi banners, and leap over potholes. Trip once and Papa gets closer. Trip twice… PAKDE GAYE!

🏃 **Swipe to survive** – left/right to switch lanes, up to jump, down to slide.
🛡️ **Desi power-ups**
• Mummy's Shield – Mummy saves you from one hit
• Dadi's Ladoo Magnet – coins fly straight to you
• Doodh Power Jump – one glass of milk and you can jump over a bus!
• Double Coins
🎯 **Missions** – finish missions to raise your score multiplier up to x10
🛒 **Beta Ki Dukaan** – spend coins on new caps and school bags
🎁 **Daily Inaam** – come back every day for bigger rewards
❤️ **Bachao!** – spend coins to escape Papa and keep running
🌅 Day turns to sunset as you run further
📴 **Plays fully offline**, small download, smooth on budget phones
🔒 No forced ads ever — watch one only if you want a second chance. No accounts, no sign-up.

Every Indian kid knows this chase. How far can YOU run before Papa catches you?

## Data safety form (because of AdMob)
- Collects/shares data: **Yes** — via the Google Mobile Ads SDK: *Device or other IDs* (advertising ID), *App activity → App interactions*, *App info and performance → Diagnostics*; purpose **Advertising or marketing** and **Analytics**; shared with Google.
- Data is encrypted in transit: **Yes** (SDK uses HTTPS). Users can request deletion: game progress is on-device only (uninstall deletes it).
- Ads declaration in Play Console: **Contains ads = Yes**.
- Privacy policy URL: host `privacy.html` (e.g. GitHub Pages) and paste its URL.

## AdMob setup (to earn money)
1. Create a free account at admob.google.com → *Apps → Add app* (Android, "not published yet" is fine) → copy the **App ID** (`ca-app-pub-…~…`).
2. In that app: *Ad units → Rewarded* → name it "Escape Papa" → copy the **Ad unit ID** (`ca-app-pub-…/…`).
3. ✅ Done (live IDs set). Put the App ID in `android/app/src/main/res/values/strings.xml` (`admob_app_id`) and the ad unit ID in `src/ads.js` (`rewardedId`), set `testing: false`.
4. `npm run android`, rebuild. Never tap your own live ads — use test mode while developing or AdMob can suspend the account.
5. After publishing, link the Play listing in AdMob and add `app-ads.txt` to your developer website if you have one.

## Graphics checklist
- [x] App icon 512×512 — `icons/icon-512.png`
- [x] Feature graphic 1024×500 — `store/feature-graphic.png`
- [x] Phone screenshots 1080×1920 — `store/screenshots/` (regenerate: `tools/shots.html?scene=menu|run|papa|caught&t=secs`, headless Chrome 540×960 at device scale 2)

## Release steps (one-time setup)
1. Install **Android Studio** (it includes the Android SDK and the JDK it needs).
2. In this folder: `npm run android` — builds `www/`, syncs, and opens the project in Android Studio.
3. Test on a phone: enable USB debugging, press ▶ Run.
4. **Build → Generate Signed App Bundle → Android App Bundle**, create a new keystore (BACK IT UP — you can never update the app without it), build `release`.
5. Play Console → Create app → upload the `.aab` to *Internal testing* first, fill the listing from this file, then promote to Production.
6. Before the first real release: do the **AdMob setup** above (the build currently shows Google's TEST ads, which earn nothing).
7. For every update: bump `versionCode` / `versionName` in `android/app/build.gradle` and `VERSION` in `sw.js`.

## Web version (optional, free)
Push the repo to GitHub and enable Pages; the game is a PWA and installs from the browser ("Add to Home screen").
