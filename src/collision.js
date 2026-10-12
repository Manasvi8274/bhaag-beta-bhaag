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

// Height of the surface under the player: a ramp rises to its far end, a bus roof can be stood on once you
// are up there (coming at it from the road is still a crash). The player's front edge decides, so the ramp
// top hands over to the roof without the body clipping the bus.
export function groundAt(box, items) {
  let g = 0;
  const front = box.z - box.d / 2;
  for (const o of items) {
    if (Math.abs(box.x - o.x) >= o.w / 2) continue;
    if (o.type === 'ramp') {
      const back = o.z + o.d / 2;
      if (front <= back && front >= o.z - o.d / 2) g = Math.max(g, Math.min(o.h, (o.h * (back - front)) / o.d));
    } else if (o.name === 'bus' && Math.abs(box.z - o.z) < (o.d + box.d) / 2 && box.y >= o.y + o.h - 0.6) {
      g = Math.max(g, o.y + o.h);
    }
  }
  return g;
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
