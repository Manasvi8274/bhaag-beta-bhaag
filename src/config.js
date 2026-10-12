// All tunable game constants. Units: metres, seconds.
export const VERSION = '1.1';
export const LANES = [-2, 0, 2];          // x of each lane centre
export const LANE_SWITCH_TIME = 0.15;     // seconds to move one lane
export const GRAVITY = -40;
export const JUMP_VELOCITY = 13;          // peak ~2.1 m, airtime ~0.65 s
export const FAST_DROP_VELOCITY = -25;    // slide pressed mid-air
export const SLIDE_TIME = 0.6;

export const PLAYER_W = 0.8, PLAYER_H = 1.8, PLAYER_SLIDE_H = 0.8, PLAYER_D = 0.6;

export const SPEED_START = 10, SPEED_MAX = 28, SPEED_RAMP = 0.15; // u/s gained per second

export const STUMBLE_WINDOW = 6;          // second stumble within this = caught
export const CHASER_FAR = 12, CHASER_NEAR = 2.5; // Papa distance behind player
