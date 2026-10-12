# Bhaag Beta Bhaag!

3D endless runner (Subway Surfers style) with stickman characters. Beta (son) broke the TV
remote; Papa chases him through Indian streets with a chappal. Target: PWA + Android (Capacitor).

## Gameplay
- 3 lanes (x = -2, 0, +2). Player runs toward -Z; camera behind and above.
- Swipe/arrow left-right: change lane. Up/space: jump. Down: slide (roll).
- Speed starts 10 u/s, rises to 28 u/s over time.
- Obstacles: stone/pothole (jump), clothesline/banner (slide), cow/auto-rickshaw/cart (change lane),
  bus/truck (change lane or ride on top via ramp - later).
- Hitting an obstacle side-on or a low obstacle = STUMBLE: Papa closes in. A second stumble
  within 6 s = CAUGHT. Head-on hit into a tall obstacle = CAUGHT immediately.
- CAUGHT = comic cutscene: Papa grabs Beta, chappal spank, stars, "Game Over".
- Coins (rupee) on the track. Score = distance + coins.
- Power-ups (later): Mummy's shield, Dadi's ladoo magnet, cycle (hoverboard), sneakers (super jump).

## Art direction
- Stickmen: thick black rounded limbs (capsules), sphere head. Beta has a red school tie and cap;
  Papa has a white banian torso shape, big moustache, chappal in hand.
- World: bright, colourful Indian street: pastel houses, shop signboards, wires, potholes.
  Built from Three.js primitives with flat MeshStandardMaterial colours. Fog for distance.

## Code rules (all modules)
- Plain ES modules, no build step, no frameworks. Three.js imported as `import * as THREE from '../vendor/three.module.js'`.
- Game logic modules are PURE (no THREE, no DOM) so they run under `node --test`.
- Units: metres, seconds. Use `dt` (seconds) for every update. Never use Date.now() in logic.
- No global state; export functions/classes. Keep each file under 250 lines.

## Modules
| file | role | pure? |
|---|---|---|
| src/config.js | all tunable constants | yes |
| src/player.js | lane/jump/slide state machine | yes |
| src/collision.js | AABB tests, obstacle hit classification | yes |
| src/spawner.js | obstacle/coin/power-up rows (seeded RNG) | yes |
| src/chaser.js | Papa distance / stumble / caught logic | yes |
| src/powerups.js | timed power-ups | yes |
| src/progress.js | save data: wallet, best, missions, skins, daily reward, settings | yes (storage injected) |
| src/audio.js | procedural WebAudio SFX + dhol loop | no-op without WebAudio |
| src/input.js | keyboard + swipe -> actions | DOM |
| src/stickman.js | stickman mesh + procedural animation | THREE |
| src/props.js | obstacle / coin / power-up models (cached, cloned) | THREE |
| src/world.js | street segments, buildings, recycling | THREE |
| src/fx.js | pooled particles | THREE |
| src/ui.js | all screens (DOM) | DOM |
| src/game.js | ties everything, main loop, adaptive quality, back button | THREE |

## Dev
- `npm test` — 58 unit tests. `npm run serve` — no-cache server on :8123.
- `#play` skips the menu; `#debug` exposes `window.bbb` (frame stepper) for automated checks.
- `sh tools/make-icons.sh` regenerates icons/splashes (server must be running). `npm run android` builds + opens Android Studio.
- Store assets and release steps: `store/LISTING.md`.

## Roadmap status
1. Core — done. 2. Juice — done (particles, shake, speed FOV, flash, vibration). 3. Audio — done.
4. Power-ups — done (shield, magnet, doodh jump, double coins). 5. Variety — day/sunset/dusk cycle done; ramps/bus roofs, zones: later.
6. Meta — done (missions + multiplier, shop skins, daily reward, coin revive). 7. Polish — done (pause, auto-pause, settings, tutorial hints, loading screen).
8. Store — PWA + Android project + icons + privacy + listing done; needs Android Studio build + phone screenshots.
Later ideas: rewarded ad for revive (AdMob), bus-roof running, more zones, Papa skins, leaderboard.
