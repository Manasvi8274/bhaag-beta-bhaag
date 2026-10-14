// All tunable game constants. Units: metres, seconds.
export const VERSION = '1.2';
export const LANES = [-2, 0, 2];          // x of each lane centre
export const LANE_SWITCH_TIME = 0.15;     // seconds to move one lane
export const GRAVITY = -40;
export const JUMP_VELOCITY = 13;          // peak ~2.1 m, airtime ~0.65 s
export const FAST_DROP_VELOCITY = -25;    // slide pressed mid-air
export const SLIDE_TIME = 0.6;

export const PLAYER_W = 0.8, PLAYER_H = 1.8, PLAYER_SLIDE_H = 0.8, PLAYER_D = 0.6;

export const SPEED_START = 10, SPEED_MAX = 28, SPEED_RAMP = 0.6; // u/s gained per second while catching up to the level's speed
// Speed levels: passing each score (at x1, so a big multiplier doesn't rush you) is a "Speed Up!".
export const SPEED_LEVELS = [0, 200, 450, 800, 1250, 1800, 2500, 3300];
export const speedLevel = (score) => SPEED_LEVELS.filter((s) => score >= s).length - 1;
export const speedFor = (level) => SPEED_START + ((SPEED_MAX - SPEED_START) * level) / (SPEED_LEVELS.length - 1);

export const STUMBLE_WINDOW = 6;          // second stumble within this = caught
export const CHASER_FAR = 12, CHASER_NEAR = 2.5; // Papa distance behind player
