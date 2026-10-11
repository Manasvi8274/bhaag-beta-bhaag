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

  const handlePointerUp = (event) => {
    if (startX === null || startY === null) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const maxDist = 30;
    startX = null;
    startY = null;

    if (Math.abs(dx) < maxDist && Math.abs(dy) < maxDist) return;

    const action = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'jump' : 'slide');
    onAction(action);
  };

  target.addEventListener('keydown', handleKeyDown);
  target.addEventListener('pointerdown', handlePointerDown);
  target.addEventListener('pointerup', handlePointerUp);

  return () => {
    target.removeEventListener('keydown', handleKeyDown);
    target.removeEventListener('pointerdown', handlePointerDown);
    target.removeEventListener('pointerup', handlePointerUp);
  };
}
