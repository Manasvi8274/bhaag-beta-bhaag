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
| src/input.js | keyboard + swipe -> actions | DOM |
| src/collision.js | AABB tests, obstacle hit classification | yes |
| src/spawner.js | obstacle/coin pattern generation (seeded RNG) | yes |
| src/chaser.js | Papa distance / stumble / caught logic | yes |
| src/stickman.js | stickman mesh + procedural animation | THREE |
| src/world.js | street segments, buildings, recycling | THREE |
| src/game.js | ties everything, main loop | THREE |
| src/ui.js | HUD + menus (DOM) | DOM |
