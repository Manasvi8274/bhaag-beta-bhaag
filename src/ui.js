// DOM overlay: menu, HUD, game-over, flash text.
const CSS = `
#ui { font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; font-weight: 800; color: #fff; }
#ui .screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  gap: 10px; background: rgba(10,10,30,0.45); pointer-events: auto; text-align: center;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
#ui .over { justify-content: center; }
#ui .menu { padding-top: calc(env(safe-area-inset-top) + 48px); padding-bottom: calc(env(safe-area-inset-bottom) + 56px); box-sizing: border-box; background: linear-gradient(rgba(10,10,30,0.55), rgba(10,10,30,0) 40%, rgba(10,10,30,0) 70%, rgba(10,10,30,0.5)); }
#ui .menu .top { display: flex; flex-direction: column; align-items: center; gap: 8px; }
#ui .hidden { display: none !important; }
#ui .outline { text-shadow: 3px 0 #1b1b1b, -3px 0 #1b1b1b, 0 3px #1b1b1b, 0 -3px #1b1b1b, 2px 2px #1b1b1b, -2px -2px #1b1b1b, 2px -2px #1b1b1b, -2px 2px #1b1b1b; }
#ui .title { font-size: 54px; line-height: 0.95; color: #ffd60a; transform: rotate(-3deg); margin: 0 0 6px; }
#ui .sub { font-size: 20px; }
#ui .stat { font-size: 24px; }
#ui button { font: inherit; font-size: 22px; padding: 14px 34px; border-radius: 999px; background: #ff006e; color: #fff;
  border: 4px solid #1b1b1b; box-shadow: 0 6px 0 #1b1b1b; cursor: pointer; margin-top: 12px; }
#ui button:active { transform: translateY(4px); box-shadow: 0 2px 0 #1b1b1b; }
#ui .badge { background: #ffd60a; color: #1b1b1b; border: 3px solid #1b1b1b; border-radius: 10px; padding: 2px 12px;
  font-size: 22px; transform: rotate(4deg); animation: bbb-pulse 0.6s ease-in-out infinite alternate; }
#ui .hud { position: absolute; inset: 0; pointer-events: none; font-size: 28px;
  padding: calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + 16px) 0 calc(env(safe-area-inset-left) + 16px); }
#ui .hud .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
#ui .pill { background: rgba(20,20,40,0.55); border: 3px solid #1b1b1b; border-radius: 999px; padding: 0 16px; min-width: 64px; text-align: center; }
#ui .pill.coin { color: #ffd60a; }
#ui .flash { position: absolute; left: 0; right: 0; top: 30%; text-align: center; font-size: 48px; color: #ffd60a;
  pointer-events: none; opacity: 0; }
#ui .flash.go { animation: bbb-flash 900ms ease-out forwards; }
@keyframes bbb-flash { 0% { opacity: 0; transform: scale(0.6); } 15% { opacity: 1; transform: scale(1.08); }
  30% { transform: scale(1); } 70% { opacity: 1; } 100% { opacity: 0; transform: scale(1); } }
@keyframes bbb-pulse { to { transform: rotate(-4deg) scale(1.08); } }
`;

function el(tag, cls, text, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

export function createUI(root, { onStart, onRestart }) {
  if (!document.getElementById('bbb-ui-style')) {
    const style = el('style');
    style.id = 'bbb-ui-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const menu = el('div', 'screen menu', null, root);
  const top = el('div', 'top', null, menu);
  const title = el('h1', 'title outline', null, top);
  el('div', null, 'Bhaag Beta', title);
  el('div', null, 'Bhaag!', title);
  el('div', 'sub outline', 'Papa is coming with the chappal!', top);
  const bottom = el('div', 'top', null, menu);
  const menuBest = el('div', 'stat outline', '', bottom);
  el('button', null, '▶ Play', bottom).addEventListener('click', () => onStart());

  const hud = el('div', 'hud hidden', null, root);
  const row = el('div', 'row', null, hud);
  const score = el('div', 'pill outline', '0', row);
  const coins = el('div', 'pill coin outline', '🪙 0', row);

  const over = el('div', 'screen over hidden', null, root);
  el('h1', 'title outline', 'Pakde Gaye!', over);
  el('div', 'sub outline', '(Caught!)', over);
  const overScore = el('div', 'stat outline', '', over);
  const overCoins = el('div', 'stat outline', '', over);
  const overBest = el('div', 'stat outline', '', over);
  const badge = el('div', 'badge', 'NEW BEST!', over);
  el('button', null, '↻ Bhaag Again', over).addEventListener('click', () => onRestart());

  const flashEl = el('div', 'flash outline', '', root);

  const only = (shown) => { for (const s of [menu, hud, over]) s.classList.toggle('hidden', s !== shown); };

  return {
    showMenu(best = 0) { menuBest.textContent = `Best: ${Math.floor(best)}`; only(menu); },
    showHUD() { only(hud); },
    setScore(s, c) { score.textContent = String(Math.floor(s)); coins.textContent = `🪙 ${c}`; },
    showGameOver(s, c, best, isNewBest) {
      overScore.textContent = `Score ${Math.floor(s)}`;
      overCoins.textContent = `Coins ${c}`;
      overBest.textContent = `Best ${Math.floor(best)}`;
      badge.classList.toggle('hidden', !isNewBest);
      only(over);
    },
    flash(text) {
      flashEl.textContent = text;
      flashEl.classList.remove('go');
      void flashEl.offsetWidth; // restart the animation
      flashEl.classList.add('go');
    },
  };
}
