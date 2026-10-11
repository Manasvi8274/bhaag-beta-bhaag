Write `src/input.js`: turns keyboard and swipe gestures into game actions. No imports.

Export exactly one function: `createInput(target, onAction)`.
- `target` is any EventTarget (window or the canvas). `onAction(action)` is called with one of
  'left', 'right', 'jump', 'slide'.
- Keyboard: listen for 'keydown' on target. Map `event.key`:
  ArrowLeft, a, A -> 'left'; ArrowRight, d, D -> 'right'; ArrowUp, w, W, ' ' (space) -> 'jump';
  ArrowDown, s, S -> 'slide'. Ignore events where `event.repeat` is true. When a key is mapped,
  call `event.preventDefault()` if that function exists. Unmapped keys do nothing.
- Swipe: listen for 'pointerdown' and 'pointerup' on target, using `event.clientX` / `event.clientY`.
  On pointerdown remember the start point. On pointerup compute dx, dy from the start.
  If max(|dx|, |dy|) < 30 do nothing (it was a tap). Otherwise if |dx| > |dy|: dx < 0 -> 'left',
  dx > 0 -> 'right'; else dy < 0 -> 'jump' (swipe up), dy > 0 -> 'slide'.
  A pointerup without a previous pointerdown does nothing. Clear the start point after pointerup.
- Return a function `dispose()` that removes ALL listeners it added (use the same function refs).
