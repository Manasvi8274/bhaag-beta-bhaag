Write `src/collision.js`. PURE logic: no imports at all.

Boxes are plain objects `{ x, y, z, w, h, d }`: x and z are the CENTRE, y is the BOTTOM,
w = size on x, h = size on y, d = size on z.

Export exactly:

1. `aabbOverlap(a, b)` returns true when the boxes overlap with positive volume:
   `Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 && a.y < b.y + b.h && b.y < a.y + a.h`.
   Touching edges (equal) is NOT overlap.

2. `classifyHit(player, obstacle)`: player is a box, obstacle is a box with an extra `kind` string.
   Returns one of 'none', 'stumble', 'caught':
   - if !aabbOverlap(player, obstacle): 'none'
   - kind 'low' (stone, pothole: jump over it) -> 'stumble'
   - kind 'high' (clothesline, banner: slide under it) -> 'stumble'
   - kind 'block' (cow, auto, bus): if Math.abs(player.x - obstacle.x) > 0.5 -> 'stumble' (side swipe),
     else 'caught' (head-on crash)
   - any other kind -> 'none'

3. `firstHit(player, obstacles)`: checks an array of obstacles in order and returns
   `{ result, obstacle }` for the most severe hit ('caught' beats 'stumble'). If nothing is hit return
   `{ result: 'none', obstacle: null }`. Among equal severity return the first one in the array.
