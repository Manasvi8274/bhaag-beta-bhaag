Write `src/chaser.js`: Papa's chase logic. PURE: no THREE, no DOM.

Import: `import { STUMBLE_WINDOW, CHASER_FAR, CHASER_NEAR } from './config.js';`

Papa is normally far behind (off screen). When Beta stumbles, Papa jumps close. If Beta stumbles again
within STUMBLE_WINDOW seconds, he is caught. After the window passes, Papa falls back again.

Export exactly:

1. `createChaser()` returns `{ distance: CHASER_FAR, time: 0, lastStumble: -Infinity, caught: false }`.

2. `stumble(c)`: if c.caught return 'caught'.
   If `c.time - c.lastStumble <= STUMBLE_WINDOW`: set caught = true, distance = 0, return 'caught'.
   Otherwise: lastStumble = c.time, distance = CHASER_NEAR, return 'stumble'.

3. `catchNow(c)`: caught = true, distance = 0.

4. `updateChaser(c, dt)`: time += dt. If caught, do nothing else.
   If `c.time - c.lastStumble > STUMBLE_WINDOW` and distance < CHASER_FAR:
   distance += 3 * dt, capped at CHASER_FAR (never above).
   While inside the window, distance stays exactly where it is.

5. `isVisible(c)`: returns true when distance < CHASER_FAR (Papa should be drawn on screen).
