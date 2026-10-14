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
- **Power-ups:** Mummy's Shield, Dadi's Ladoo Magnet, Doodh Power Jump, Double Coins, and Bhaiya Ki Cycle (ride and smash through everything). Each can be upgraded in the shop.
- **Things to come back for:**
  - Missions that raise your score multiplier.
  - 11 badges and your lifetime records.
  - A daily login reward.
  - **Aaj ka Challenge:** a seeded street that's the same for everyone that day, with the ghost of your best try to race.
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
| `src/ads.js` | Optional rewarded ads: AdMob on Android, H5 Games Ads on the web (off until AdSense approves the site). |
| `src/share.js` | The score card and the share sheet. |
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
