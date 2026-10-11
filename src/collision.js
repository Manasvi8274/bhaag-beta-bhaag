export function aabbOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
    Math.abs(a.z - b.z) < (a.d + b.d) / 2 &&
    a.y < b.y + b.h &&
    b.y < a.y + a.h
  );
}

export function classifyHit(player, obstacle) {
  if (!aabbOverlap(player, obstacle)) return 'none';

  const { kind } = obstacle;

  if (kind === 'low') return 'stumble';
  if (kind === 'high') return 'stumble';
  if (kind === 'block') {
    if (Math.abs(player.x - obstacle.x) > 0.5) return 'stumble';
    return 'caught';
  }

  return 'none';
}

export function firstHit(player, obstacles) {
  const rank = { none: 0, stumble: 1, caught: 2 };
  let best = { result: 'none', obstacle: null };

  for (const o of obstacles) {
    const hit = classifyHit(player, o);
    if (rank[hit] > rank[best.result]) {
      best = { result: hit, obstacle: o };
    }
  }

  return best;
}
