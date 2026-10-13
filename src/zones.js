// The street changes every ZONE_LEN metres: its own buildings, decorations and obstacle mix. Pure.
export const ZONE_LEN = 600;
export const ZONES = [
  { name: 'Market Gali', high: 'banner', blocks: ['cow', 'auto', 'cart', 'bus', 'scooter'], lows: ['bricks', 'pothole', 'barricade', 'dog'] },
  { name: 'Railway Colony', high: 'phatak', blocks: ['auto', 'bus', 'scooter', 'cow'], lows: ['pipe', 'bricks', 'barricade', 'dog'] },
  { name: 'Mandir Marg', high: 'banner', blocks: ['cow', 'cow', 'cart', 'auto', 'scooter'], lows: ['dog', 'pothole', 'bricks', 'barricade'] },
];
export const zoneAt = (z) => Math.floor(Math.max(0, -z) / ZONE_LEN) % ZONES.length;
