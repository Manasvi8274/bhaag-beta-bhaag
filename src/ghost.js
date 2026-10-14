// Daily-challenge ghost: your best run today, sampled every GHOST_DT seconds and replayed beside you. Pure.
export const GHOST_DT = 0.1;
const MODES = ['run', 'jump', 'slide', 'ride'];

export const createRecorder = () => ({ next: 0, x: [], y: [], d: [], m: [] });

// t = run time, d = distance run (m), mode = Beta's pose. Fills every sample slot up to t.
export function record(r, t, x, y, d, mode) {
  while (r.next <= t) {
    r.x.push(Math.round(x * 100) / 100);
    r.y.push(Math.round(y * 100) / 100);
    r.d.push(Math.round(d * 10) / 10);
    r.m.push(Math.max(0, MODES.indexOf(mode)));
    r.next += GHOST_DT;
  }
}

// Where the ghost is at run time t, or null once its run is over.
export function ghostAt(g, t) {
  const i = t / GHOST_DT, a = Math.floor(i);
  if (!g || a < 0 || a >= g.d.length - 1) return null;
  const f = i - a, lerp = (k) => g[k][a] + (g[k][a + 1] - g[k][a]) * f;
  return { x: lerp('x'), y: lerp('y'), d: lerp('d'), mode: MODES[g.m[a]] };
}

export const ghostDistance = (g) => (g && g.d.length ? g.d[g.d.length - 1] : 0);
