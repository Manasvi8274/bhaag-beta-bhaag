export function createInput(target, onAction) {
  const keyMap = new Map([
    ['ArrowLeft', 'left'],
    ['a', 'left'],
    ['A', 'left'],
    ['ArrowRight', 'right'],
    ['d', 'right'],
    ['D', 'right'],
    ['ArrowUp', 'jump'],
    ['w', 'jump'],
    ['W', 'jump'],
    [' ', 'jump'],
    ['ArrowDown', 'slide'],
    ['s', 'slide'],
    ['S', 'slide']
  ]);

  let startX = null;
  let startY = null;

  const handleKeyDown = (event) => {
    const action = keyMap.get(event.key);
    if (action && !event.repeat) {
      event.preventDefault();
      onAction(action);
    }
  };

  const handlePointerDown = (event) => {
    startX = event.clientX;
    startY = event.clientY;
  };

  // Fires as soon as the finger has travelled 30 px (on move or up), so swipes feel instant.
  const handlePointerUp = (event) => {
    if (startX === null || startY === null) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const maxDist = 30;
    if (Math.abs(dx) < maxDist && Math.abs(dy) < maxDist) {
      if (event.type === 'pointerup') { startX = null; startY = null; }
      return;
    }
    startX = null;
    startY = null;

    const action = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'jump' : 'slide');
    onAction(action);
  };
  const handleCancel = () => { startX = null; startY = null; };

  target.addEventListener('keydown', handleKeyDown);
  target.addEventListener('pointerdown', handlePointerDown);
  target.addEventListener('pointerup', handlePointerUp);
  target.addEventListener('pointermove', handlePointerUp);
  target.addEventListener('pointercancel', handleCancel);

  return () => {
    target.removeEventListener('keydown', handleKeyDown);
    target.removeEventListener('pointerdown', handlePointerDown);
    target.removeEventListener('pointerup', handlePointerUp);
    target.removeEventListener('pointermove', handlePointerUp);
    target.removeEventListener('pointercancel', handleCancel);
  };
}
