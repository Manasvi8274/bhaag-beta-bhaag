# Bhaag Beta Bhaag! 🩴

Beta broke the TV remote right before Papa's cricket match. Papa has a chappal. **Run!**

An endless runner through Indian streets, starring stickmen. It runs in the browser (an installable, offline PWA) and as an Android app.

**Play:** https://manasvi8274.github.io/bhaag-beta-bhaag/

## What's in the game

- **Three lanes.** Swipe (or use the arrow keys / WASD) to switch lanes, jump and slide. Trip once and Papa gets close. Trip again within 6 seconds and he catches you.
- **Day turns to night as you run.** Streetlights flicker on, windows and neon signs glow, and stars, moon and kites come out. Some runs get a monsoon spell with thunder and a wet road.
- **Three areas** that change every 600 m, each with its own obstacles:
  - **Market Gali:** chai tapri and tangled wires.
  - **Railway Colony:** with a passing express train.
  - **Mandir Marg:** temple, diyas, string lights and fireworks.
- **Desi traffic:** cows, autos, buses (run up the ramp onto the roof), sabzi thelas, scooter uncle riding the wrong way, sleeping dogs, potholes, shaadi banners.
- **Chasers that fight back:** Papa throws his chappal after a stumble, and after 1 km he also throws from afar. Every 1.5 km he grabs a cycle for a short, hard chase. Mummy throws a belan and Dadi swings a lathi; unlock them in the shop. You can play as Beta or Beti. Chasers shout their taunts in Hindi through the phone's text-to-speech.
- **Festivals:** in Diwali week, every street gets string lights and fireworks (`?festival=diwali` to preview).
- **Power-ups:** Mummy's Shield, Dadi's Ladoo Magnet, Doodh Power Jump, Double Coins, Bhaiya Ki Cycle (ride and smash through everything), Diwali Rocket (fly above the street over a trail of sky coins) and Score Dugna (double score). Each can be upgraded in the shop, and its timer shows on the right while it lasts.
- **Mystery Dabba:** a gift box with coins, a power-up or a Rocket Start inside. Buy Rocket Starts in the shop and launch one in the first seconds of a run.
- **Speed Up levels:** the game gets faster each time your score passes a threshold.
- **Play with others:**
  - **Muqabla (live race):** Quick Match pairs you with whoever else is looking; or make a room and give friends the 4-letter code (a WhatsApp invite link fills it in). Up to 4 players run the same street at the same time and see each other as ghosts. Whoever runs furthest wins. No revives, rocket starts or shop upgrades in a race. If nobody is online you race a clearly labelled bot.
  - **Challenge a friend:** every share carries a link (`?c=…`) to the exact street you ran, with your distance as a checkered line across the road. Your friend plays it in the browser with no install, and can send the challenge back.
- **Things to come back for:**
  - Missions (progress in the pause menu); every 3 done raises your score multiplier and pays a bonus.
  - 12 badges and your lifetime records.
  - A daily login reward.
  - **Aaj ka Challenge:** a seeded street that's the same for everyone that day, with the ghost of your best try to race. Its share text is a numbered result bar.
  - **Shabd Hunt:** collect the letters of the day's word (CHAPPAL, JALEBI…) across your runs for coins and a Rocket Start; the reward grows with a streak of days.
  - A checkered line on the road at your record distance.
  - "Bal bal bache!" bonus coins for last-moment dodges.
  - A share card of the moment you got caught.

## Run it locally

No build step and no bundler: it's plain ES modules plus a vendored three.js.

```sh
python -m http.server 8000     # or any static server
# open http://localhost:8000          (the service worker is skipped on localhost)
# open http://localhost:8000/#debug   (exposes window.bbb: frame(), begin(), run, renderer… for automated checks)
npm test                        # node:test, no dependencies
```

## How it's built

| File | What it does |
|---|---|
| `src/game.js` | Main loop and state machine (menu → playing → caught → over). Glues every module together. |
| `src/world.js` | Street segments recycled under the runner, with one ready-built variant per area. Also the streetlights, swagat arch and train. |
| `src/merge.js` | Bakes static groups into one mesh per material, about 5× fewer draw calls. |
| `src/daynight.js`, `src/sky.js` | Time-of-day keyframes, the rain schedule, gradient sky dome, stars, sun, moon, kites, rain streaks. |
| `src/zones.js` | The three areas and their obstacle mix. |
| `src/spawner.js` | Seeded rows of obstacles, coins and power-ups. Every row is guaranteed passable. |
| `src/player.js`, `src/collision.js`, `src/chaser.js` | Pure game rules, unit-tested. |
| `src/stickman.js` | Rigged stickmen (Beta, Beti, Papa, Mummy, Dadi) with procedural poses. |
| `src/props.js` | Every obstacle and power-up, built from primitives, cached and cloned. |
| `src/progress.js` | The save game: coins, shop, missions, badges, records, daily reward, daily challenge. |
| `src/ui.js` | DOM overlay. Text is set via `textContent` only. |
| `src/audio.js` | All sound is synthesised with Web Audio: dhol + tumbi music, horns, the train, thunder. No audio files. |
| `src/ads.js` | Rewarded ads the player chooses (escape Papa, 2× coins) and an interstitial after each live race (needs `interstitialId`): AdMob on Android, H5 Games Ads on the web (off until AdSense approves the site). |
| `src/share.js` | The score card, the share text, and friend-challenge links (made and parsed here). |
| `src/net.js` | Live races: a ~40-line MQTT client over WebSocket plus the room and matchmaking rules. It uses free public brokers (`BROKERS`), so there is no server to run. They have no uptime promise and no auth; point `BROKERS` at a broker of your own when players grow. |
| `src/voice.js` | Hindi text-to-speech shouts (silent where the phone has no Hindi voice). |
| `src/ghost.js` | Records and replays the daily-challenge ghost. |
| `src/festival.js` | Festival dates (Diwali week). |

**Performance on budget phones:**
- Draw calls are kept around 400–570.
- The light count is fixed and every shader is compiled at startup, so nothing stutters mid-run.
- Adaptive quality lowers sharpness, then shadows, then the real lamp lights if a phone drops under ~45 fps.

## Release

Every push to `master` triggers CI (`.github/workflows/deploy.yml`):
1. Run the tests.
2. Publish the web game to GitHub Pages.
3. Build the Android APK/AAB into the `latest` GitHub release.

Play Store text and release notes are in `store/LISTING.md`. Android is a Capacitor 7 shell; `npm run android` builds `www/` and opens Android Studio.

When the app is public on Google Play (production, not closed testing), set `STORE_LIVE = true` in `src/config.js`: the web game's Install button then sends players to the Play Store page.
