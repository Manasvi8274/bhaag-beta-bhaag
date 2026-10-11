Write `src/player.js`: the player's lane / jump / slide state machine. PURE logic: no THREE, no DOM.

Import constants: `import { LANES, LANE_SWITCH_TIME, GRAVITY, JUMP_VELOCITY, FAST_DROP_VELOCITY, SLIDE_TIME, PLAYER_W, PLAYER_H, PLAYER_SLIDE_H, PLAYER_D } from './config.js';`

Export exactly these functions:

1. `createPlayer()` returns a new plain object:
   `{ lane: 1, x: 0, y: 0, vy: 0, grounded: true, sliding: false, slideTimer: 0, pendingSlide: false }`
   (x starts at LANES[1]).

2. `applyAction(p, action)` mutates p, returns true if the action did something, false otherwise.
   - 'left': if p.lane > 0 then p.lane -= 1, return true; else return false.
   - 'right': if p.lane < LANES.length - 1 then p.lane += 1, return true; else return false.
   - 'jump': only if p.grounded. Sets vy = JUMP_VELOCITY, grounded = false, and cancels a slide
     (sliding = false, slideTimer = 0). Returns true. If in the air return false.
   - 'slide': if grounded: sliding = true, slideTimer = SLIDE_TIME, return true.
     If in the air: vy = FAST_DROP_VELOCITY, pendingSlide = true, return true.
   - any other string: return false.

3. `updatePlayer(p, dt)` mutates p:
   - Move x toward LANES[p.lane] in EITHER direction (left or right) at speed (LANES[1]-LANES[0]) / LANE_SWITCH_TIME per second,
     never overshooting (snap exactly to the target when within one step).
   - If not grounded: vy += GRAVITY * dt; y += vy * dt. If y <= 0: y = 0, vy = 0, grounded = true,
     and if pendingSlide: pendingSlide = false, sliding = true, slideTimer = SLIDE_TIME.
   - If sliding: slideTimer -= dt; when slideTimer <= 0: sliding = false, slideTimer = 0.

4. `getHitbox(p)` returns `{ x: p.x, y: p.y, w: PLAYER_W, h: H, d: PLAYER_D }` where
   H = PLAYER_SLIDE_H if p.sliding else PLAYER_H. (x is centre, y is bottom.)
