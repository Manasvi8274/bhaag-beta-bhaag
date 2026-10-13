// DOM overlay: menu, HUD, pause, game over, shop/missions/daily modal, flash/hint/toast. Text via textContent only.
import { VERSION } from './config.js';
const OUTLINE = '3px 0 #1b1b1b,-3px 0 #1b1b1b,0 3px #1b1b1b,0 -3px #1b1b1b,2px 2px #1b1b1b,-2px -2px #1b1b1b,2px -2px #1b1b1b,-2px 2px #1b1b1b';
const SAFE = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
const CSS = `
#ui { font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; font-weight: 800; color: #fff; }
#ui * { box-sizing: border-box; }
#ui .o { text-shadow: ${OUTLINE}; }
#ui .hidden { display: none !important; }
#ui .screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; background: rgba(10,10,30,0.55); pointer-events: auto; text-align: center; padding: ${SAFE}; }
#ui .menu { justify-content: flex-start; } #ui .menu .push { margin-top: auto; } #ui .menu { background: linear-gradient(rgba(10,10,30,.55), transparent 35%, transparent 65%, rgba(10,10,30,.6)); }
#ui .col { display: flex; flex-direction: column; align-items: center; gap: 6px; }
#ui .bar { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 14px 0; }
#ui .title { font-size: 54px; line-height: .95; color: #ffd60a; transform: rotate(-3deg); margin: 4px 0; }
#ui .sub { font-size: 19px; } #ui .stat { font-size: 24px; }
#ui button { font: inherit; font-size: 22px; padding: 12px 30px; border-radius: 999px; background: #ff006e; color: #fff;
  border: 4px solid #1b1b1b; box-shadow: 0 6px 0 #1b1b1b; cursor: pointer; text-shadow: none; }
#ui button:active { transform: translateY(4px); box-shadow: 0 2px 0 #1b1b1b; }
#ui button.big { font-size: 30px; padding: 14px 46px; }
#ui button.alt { background: #3a86ff; } #ui button.ok { background: #2a9d8f; } #ui button.gold { background: #ffbe0b; color: #1b1b1b; }
#ui button.icon { font-size: 22px; padding: 6px 14px; pointer-events: auto; }
#ui button:disabled { opacity: .5; }
#ui .row { display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; margin-bottom: 26px; }
#ui .pill { background: rgba(20,20,40,.6); border: 3px solid #1b1b1b; border-radius: 999px; padding: 0 14px; font-size: 26px; min-width: 64px; text-align: center; }
#ui .pill small { font-size: 16px; color: #ffd60a; margin-left: 6px; }
#ui .badge { background: #ffd60a; color: #1b1b1b; border: 3px solid #1b1b1b; border-radius: 10px; padding: 0 12px; font-size: 22px;
  animation: bbb-pulse .6s ease-in-out infinite alternate; }
#ui .hud { position: absolute; inset: 0; pointer-events: none; padding: ${SAFE}; }
#ui .pus { display: flex; flex-direction: column; gap: 6px; padding: 8px 14px; align-items: flex-start; }
#ui .pu { display: flex; align-items: center; gap: 6px; font-size: 18px; }
#ui .pu i { display: block; width: 90px; height: 10px; border: 2px solid #1b1b1b; border-radius: 6px; background: #ffd60a; transform-origin: left; }
#ui .flash { position: absolute; left: 0; right: 0; top: 28%; text-align: center; font-size: 48px; color: #ffd60a; pointer-events: none; opacity: 0; }
#ui .flash.go { animation: bbb-flash 900ms ease-out forwards; }
#ui .hint { position: absolute; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom) + 18%); text-align: center; font-size: 28px; pointer-events: none; opacity: 0; }
#ui .hint.go { animation: bbb-hint 2600ms ease-out forwards; }
#ui .toast { position: absolute; left: 50%; top: calc(env(safe-area-inset-top) + 64px); transform: translateX(-50%); background: #2a9d8f;
  border: 3px solid #1b1b1b; border-radius: 14px; padding: 4px 16px; font-size: 18px; pointer-events: none; opacity: 0; white-space: nowrap; }
#ui .toast.go { animation: bbb-hint 2400ms ease-out forwards; }
#ui .panel { background: #fff6e0; color: #1b1b1b; border: 4px solid #1b1b1b; border-radius: 22px; padding: 14px; width: min(92vw, 420px);
  max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 0 #1b1b1b; }
#ui .panel h2 { margin: 0 0 8px; font-size: 32px; color: #ff006e; }
#ui .item { display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 2px dashed #e0cfa8; text-align: left; font-size: 18px; }
#ui .item .grow { flex: 1; } #ui .item button { font-size: 16px; padding: 6px 14px; box-shadow: 0 4px 0 #1b1b1b; }
#ui .panel h3 { margin: 14px 0 2px; color: #ff006e; } #ui .item small { display: block; font-size: 14px; letter-spacing: 1px; }
#ui .ver { position: absolute; left: 10px; bottom: 6px; font-size: 12px; opacity: 0.6; }
#ui .sw { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #1b1b1b; flex: none; }
@keyframes bbb-flash { 0% { opacity: 0; transform: scale(.6); } 15% { opacity: 1; transform: scale(1.08); } 30% { transform: scale(1); } 70% { opacity: 1; } 100% { opacity: 0; } }
@keyframes bbb-hint { 0% { opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes bbb-pulse { from { transform: rotate(4deg); } to { transform: rotate(-4deg) scale(1.08); } }
`;

function el(tag, cls, text, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function btn(parent, text, cls, onClick) {
  const b = el('button', cls, text, parent);
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const PU_ICON = { shield: '🛡️', magnet: '🟠', jump: '🥛', double: '✖2' };

export function createUI(root, h) {
  if (!document.getElementById('bbb-ui-style')) {
    const style = el('style', null, CSS);
    style.id = 'bbb-ui-style';
    document.head.appendChild(style);
  }
  const soundLabel = (m) => (m ? '🔇' : '🔊');

  // Menu
  const menu = el('div', 'screen menu', null, root);
  const mTop = el('div', 'bar', null, menu);
  const wallet = el('div', 'pill o', '🪙 0', mTop);
  const mSound = btn(mTop, '🔊', 'icon alt', () => h.onSound());
  const mHead = el('div', 'col', null, menu);
  const title = el('h1', 'title o', null, mHead);
  el('div', null, 'Bhaag Beta', title);
  el('div', null, 'Bhaag!', title);
  el('div', 'sub o', 'Papa is coming with the chappal!', mHead);
  const mBottom = el('div', 'col push', null, menu);
  const menuBest = el('div', 'stat o', '', mBottom);
  el('div', 'ver', `v${VERSION}`, menu);
  const mRow = el('div', 'row', null, mBottom);
  btn(mRow, '🛒', 'icon gold', () => h.onShop());
  btn(mRow, '▶ Play', 'big', () => h.onStart());
  btn(mRow, '🎯', 'icon ok', () => h.onMissions());

  // HUD
  const hud = el('div', 'hud hidden', null, root);
  const hBar = el('div', 'bar', null, hud);
  const score = el('div', 'pill o', '0', hBar);
  const coins = el('div', 'pill o', '🪙 0', hBar);
  btn(hBar, '⏸', 'icon alt', () => h.onPause());
  const pus = el('div', 'pus', null, hud);

  // Pause
  const pause = el('div', 'screen hidden', null, root);
  el('h1', 'title o', 'Ruko Zara!', pause);
  btn(pause, '▶ Resume', 'big', () => h.onResume());
  const pSound = btn(pause, '🔊 Sound', 'alt', () => h.onSound());
  const pVibe = btn(pause, '📳 Vibration', 'alt', () => h.onVibrate());
  btn(pause, '🏠 Home', 'gold', () => h.onHome());

  // Game over
  const over = el('div', 'screen hidden', null, root);
  el('h1', 'title o', 'Pakde Gaye!', over);
  const oScore = el('div', 'stat o', '', over);
  const oCoins = el('div', 'stat o', '', over);
  const oBest = el('div', 'stat o', '', over);
  const oWhere = el('div', 'sub o', '', over);
  const badge = el('div', 'badge', 'NEW BEST!', over);
  const oMissions = el('div', 'col', null, over);
  const revive = btn(over, '', 'ok', () => h.onRevive());
  const adBtn = btn(over, '📺 Watch ad to escape', 'alt', () => h.onWatchAd());
  btn(over, '↻ Bhaag Again', 'big', () => h.onRestart());
  btn(over, '🏠 Home', 'gold', () => h.onHome());

  // Modal (shop / missions / daily)
  const modal = el('div', 'screen hidden', null, root);
  const panel = el('div', 'panel', null, modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

  const flashEl = el('div', 'flash o', '', root);
  const hintEl = el('div', 'hint o', '', root);
  const toastEl = el('div', 'toast', '', root);
  const replay = (e, cls) => { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); };

  const screens = [menu, hud, pause, over];
  const only = (shown) => { modal.classList.add('hidden'); for (const s of screens) s.classList.toggle('hidden', s !== shown); };

  function openPanel(titleText, build) {
    panel.replaceChildren();
    el('h2', null, titleText, panel);
    build(panel);
    btn(panel, 'Close', 'alt', () => modal.classList.add('hidden')).style.marginTop = '12px';
    modal.classList.remove('hidden');
  }

  return {
    showMenu({ best, wallet: w }) { menuBest.textContent = `Best: ${Math.floor(best)}`; wallet.textContent = `🪙 ${w}`; only(menu); },
    setWallet(w) { wallet.textContent = `🪙 ${w}`; },
    showHUD() { only(hud); },
    setScore(s, c, mult) {
      score.replaceChildren(String(Math.floor(s)));
      if (mult > 1) el('small', null, `x${mult}`, score);
      coins.textContent = `🪙 ${c}`;
    },
    setPowerups(list) {
      if (pus.childElementCount !== list.length) {
        pus.replaceChildren();
        for (const p of list) { const r = el('div', 'pu o', PU_ICON[p.name], pus); el('i', null, null, r); }
      }
      list.forEach((p, i) => { pus.children[i].lastChild.style.transform = `scaleX(${Math.max(0, p.frac)})`; });
    },
    showPause() { only(pause); },
    setAdLoading(on) { adBtn.disabled = on; revive.disabled = on || !revive.dataset.afford; adBtn.textContent = on ? '📺 Loading ad...' : '📺 Watch ad to escape'; },
    setSettings({ muted, vibrate }) {
      mSound.textContent = soundLabel(muted);
      pSound.textContent = `${soundLabel(muted)} Sound ${muted ? 'Off' : 'On'}`;
      pVibe.textContent = `📳 Vibration ${vibrate ? 'On' : 'Off'}`;
    },
    showGameOver({ score: s, coins: c, best, isNewBest, completed, reviveCost, wallet: w, adAvailable, where = '' }) {
      oWhere.textContent = where;
      adBtn.classList.toggle('hidden', !adAvailable);
      adBtn.disabled = false;
      adBtn.textContent = '📺 Watch ad to escape';
      oScore.textContent = `Score ${Math.floor(s)}`;
      oCoins.textContent = `Coins ${c}`;
      oBest.textContent = `Best ${Math.floor(best)}`;
      badge.classList.toggle('hidden', !isNewBest);
      oMissions.replaceChildren();
      for (const m of completed) el('div', 'sub o', `✔ ${m.text}  +🪙${m.reward}`, oMissions);
      revive.textContent = `❤ Bachao! (🪙 ${reviveCost})`;
      revive.disabled = w < reviveCost;
      revive.dataset.afford = w >= reviveCost ? '1' : '';
      only(over);
    },
    showShop(skins, data, upgrades = []) {
      openPanel('Beta Ki Dukaan', (p) => {
        el('div', null, `🪙 ${data.coins}`, p).style.fontSize = '20px';
        for (const [id, s] of Object.entries(skins)) {
          const r = el('div', 'item', null, p);
          const sw = el('div', 'sw', null, r);
          sw.style.background = `linear-gradient(135deg, ${hex(s.cap)} 50%, ${hex(s.bag)} 50%)`;
          el('div', 'grow', s.name, r);
          if (data.skin === id) el('div', null, '✔ Wearing', r);
          else if (data.owned.includes(id)) btn(r, 'Wear', 'ok', () => h.onSkin(id));
          else btn(r, `🪙 ${s.price}`, 'gold', () => h.onSkin(id)).disabled = data.coins < s.price;
        }
        el('h3', null, 'Power-up Upgrades', p);
        for (const u of upgrades) {
          const r = el('div', 'item', null, p);
          el('div', 'pu', PU_ICON[u.name], r);
          const info = el('div', 'grow', u.label, r);
          el('small', null, `${'●'.repeat(u.level)}${'○'.repeat(5 - u.level)}  ${Math.round(u.secs)}s`, info);
          if (u.cost === undefined) el('div', null, 'MAX', r);
          else btn(r, `🪙 ${u.cost}`, 'gold', () => h.onUpgrade(u.name)).disabled = data.coins < u.cost;
        }
      });
    },
    showMissions(missions, mult) {
      openPanel('Missions', (p) => {
        el('div', null, `Score multiplier: x${mult}  (every 3 missions = +1)`, p).style.fontSize = '16px';
        for (const m of missions) {
          const r = el('div', 'item', null, p);
          el('div', 'grow', `🎯 ${m.text}`, r);
          el('div', null, `+🪙${m.reward}`, r);
        }
      });
    },
    showDaily(day, reward) {
      openPanel('Daily Inaam!', (p) => {
        el('div', 'stat', `Day ${day} reward`, p);
        el('div', 'title', `🪙 ${reward}`, p).style.fontSize = '44px';
        el('div', null, 'Come back tomorrow for more!', p).style.fontSize = '16px';
        btn(p, 'Claim', 'ok', () => { h.onClaimDaily(); modal.classList.add('hidden'); });
      });
    },
    showNews(items, onDone) {
      openPanel(`Naya kya hai? v${VERSION}`, (p) => {
        for (const [icon, text] of items) {
          const r = el('div', 'item', null, p);
          el('div', 'pu', icon, r);
          el('div', 'grow', text, r);
        }
        btn(p, 'Chalo, bhaago!', 'ok', () => { modal.classList.add('hidden'); onDone(); }).style.marginTop = '12px';
      });
    },
    flash(text) { flashEl.textContent = text; replay(flashEl, 'go'); },
    hint(text) { hintEl.textContent = text; replay(hintEl, 'go'); },
    toast(text) { toastEl.textContent = text; replay(toastEl, 'go'); },
  };
}
