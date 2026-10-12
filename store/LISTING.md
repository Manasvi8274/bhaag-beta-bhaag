# Google Play listing — Bhaag Beta Bhaag!

**App name (≤30):** Bhaag Beta Bhaag! - Chappal Run
**Package:** com.bhaagbeta.game
**Category:** Game → Arcade  **Tags:** Runner, Casual, Offline
**Content rating (IARC questionnaire):** cartoon/comic slapstick only (a dad waves a slipper; no injury, no blood). Expect *Everyone / PEGI 7* (slapstick).
**Ads:** No  **In-app purchases:** No  **Price:** Free

## Short description (≤80)
Beta broke the TV remote. Papa has a chappal. RUN through India's crazy streets!

## Full description
Uh-oh! Beta broke the TV remote right before Papa's cricket match… and now Papa is coming with the CHAPPAL! 🩴

Run, jump and slide through colourful Indian galis in this hilarious endless runner. Dodge holy cows, auto-rickshaws,
sabzi thelas and buses, duck under clotheslines, and leap over potholes. Trip once and Papa gets closer. Trip twice… PAKDE GAYE!

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
🔒 No ads, no accounts, no data collected

Every Indian kid knows this chase. How far can YOU run before Papa catches you?

## Data safety form
- Does the app collect or share user data? **No**
- Data is stored only on the device (progress, settings). No encryption-in-transit question applies (no data sent).
- Privacy policy URL: host `privacy.html` (e.g. GitHub Pages) and paste its URL.

## Graphics checklist
- [x] App icon 512×512 — `icons/icon-512.png`
- [x] Feature graphic 1024×500 — `store/feature-graphic.png`
- [ ] Phone screenshots (min 2, 1080×1920 recommended): take on your phone — menu, running with a power-up, Papa close behind, caught scene, shop.

## Release steps (one-time setup)
1. Install **Android Studio** (it includes the Android SDK and the JDK it needs).
2. In this folder: `npm run android` — builds `www/`, syncs, and opens the project in Android Studio.
3. Test on a phone: enable USB debugging, press ▶ Run.
4. **Build → Generate Signed App Bundle → Android App Bundle**, create a new keystore (BACK IT UP — you can never update the app without it), build `release`.
5. Play Console → Create app → upload the `.aab` to *Internal testing* first, fill the listing from this file, then promote to Production.
6. For every update: bump `versionCode` / `versionName` in `android/app/build.gradle` and `VERSION` in `sw.js`.

## Web version (optional, free)
Push the repo to GitHub and enable Pages; the game is a PWA and installs from the browser ("Add to Home screen").
