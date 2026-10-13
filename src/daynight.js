// Time-of-day keyframes. A run starts in the day; night falls ~40 s in and lasts ~45 s, then dawn.
// night: 0 = full day, 1 = full night (drives streetlights, windows, stars).
export const CYCLE = 130;
const K = [
  // t (s), sky top, horizon (= fog), sun colour, sun, hemi, night
  [0, 0x3f95e6, 0xbfe3ff, 0xfff1d6, 1.7, 1.1, 0],
  [25, 0x3f95e6, 0xbfe3ff, 0xfff1d6, 1.7, 1.1, 0],
  [32, 0x4a5aa8, 0xff9e5e, 0xff9a52, 1.1, 0.85, 0.25],
  [40, 0x060a20, 0x18204a, 0x8fa6ff, 0.16, 0.2, 1],
  [85, 0x060a20, 0x18204a, 0x8fa6ff, 0.16, 0.2, 1],
  [95, 0x5c6fb5, 0xffbf94, 0xffc890, 1.0, 0.8, 0.3],
  [105, 0x3f95e6, 0xbfe3ff, 0xfff1d6, 1.7, 1.1, 0],
  [CYCLE, 0x3f95e6, 0xbfe3ff, 0xfff1d6, 1.7, 1.1, 0],
];

const mix = (a, b, f) => {
  let out = 0;
  for (const s of [16, 8, 0]) out |= Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * f) << s;
  return out;
};

export function skyAt(t) {
  t = ((t % CYCLE) + CYCLE) % CYCLE;
  let i = 0;
  while (K[i + 1][0] < t) i++;
  const a = K[i], b = K[i + 1], f = (t - a[0]) / (b[0] - a[0]);
  const lerp = (n) => a[n] + (b[n] - a[n]) * f;
  return { top: mix(a[1], b[1], f), horizon: mix(a[2], b[2], f), sunColor: mix(a[3], b[3], f), sun: lerp(4), hemi: lerp(5), night: lerp(6) };
}

// Real-world clock for the menu: night between 7 pm and 6 am, so the menu matches the player's evening.
export const menuTime = (hour) => (hour >= 19 || hour < 6 ? 60 : 10);
