import { LANES, LANE_SWITCH_TIME, GRAVITY, JUMP_VELOCITY, FAST_DROP_VELOCITY, SLIDE_TIME, PLAYER_W, PLAYER_H, PLAYER_SLIDE_H, PLAYER_D } from './config.js';

export function createPlayer() {
  return {
    lane: 1,
    x: LANES[1],
    y: 0,
    vy: 0,
    grounded: true,
    sliding: false,
    slideTimer: 0,
    pendingSlide: false,
  };
}

export function applyAction(p, action) {
  switch (action) {
    case 'left':
      if (p.lane > 0) {
        p.lane -= 1;
        return true;
      }
      return false;
    case 'right':
      if (p.lane < LANES.length - 1) {
        p.lane += 1;
        return true;
      }
      return false;
    case 'jump':
      if (p.grounded) {
        p.vy = JUMP_VELOCITY;
        p.grounded = false;
        p.sliding = false;
        p.slideTimer = 0;
        return true;
      }
      return false;
    case 'slide':
      if (p.grounded) {
        p.sliding = true;
        p.slideTimer = SLIDE_TIME;
        return true;
      }
      p.vy = FAST_DROP_VELOCITY;
      p.pendingSlide = true;
      return true;
    default:
      return false;
  }
}

// groundY: height of whatever is under the player (0 = road, ramps and bus roofs are higher).
export function updatePlayer(p, dt, groundY = 0) {
  const laneStep = (LANES[1] - LANES[0]) / LANE_SWITCH_TIME;
  const targetX = LANES[p.lane];
  const step = laneStep * dt;
  p.x += Math.sign(targetX - p.x) * Math.min(Math.abs(targetX - p.x), step);

  if (p.grounded) {
    if (groundY > p.y) p.y = groundY; // carried up a ramp
    else if (groundY < p.y - 0.01) { p.grounded = false; p.vy = 0; } // ran off a bus roof
  }
  if (!p.grounded) {
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y <= groundY) {
      p.y = groundY;
      p.vy = 0;
      p.grounded = true;
      if (p.pendingSlide) {
        p.pendingSlide = false;
        p.sliding = true;
        p.slideTimer = SLIDE_TIME;
      }
    }
  }

  if (p.sliding) {
    p.slideTimer -= dt;
    if (p.slideTimer <= 0) {
      p.sliding = false;
      p.slideTimer = 0;
    }
  }
}

export function getHitbox(p) {
  const H = p.sliding ? PLAYER_SLIDE_H : PLAYER_H;
  return {
    x: p.x,
    y: p.y,
    w: PLAYER_W,
    h: H,
    d: PLAYER_D,
  };
}
