// DOM overlay: menu, HUD, pause, game over, shop/missions/daily modal, flash/hint/toast. Text via textContent only.
import { VERSION } from './config.js';
const OUTLINE = '3px 0 #1b1b1b,-3px 0 #1b1b1b,0 3px #1b1b1b,0 -3px #1b1b1b,2px 2px #1b1b1b,-2px -2px #1b1b1b,2px -2px #1b1b1b,-2px 2px #1b1b1b';
const SAFE = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
const CSS = `
#ui { font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; font-weight: 800; color: #fff; }
#ui * { box-sizing: border-box; }
#ui .o { text-shadow: ${OUTLINE}; }
#ui .hidden { display: none !important; }
#ui .screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: safe center;
  gap: 8px; background: rgba(10,10,30,0.55); pointer-events: auto; text-align: center; padding: ${SAFE}; overflow-y: auto; }
#ui .menu { justify-content: flex-start; } #ui .menu .push { margin-top: auto; } #ui .menu { background: linear-gradient(rgba(10,10,30,.55), transparent 35%, transparent 65%, rgba(10,10,30,.6)); }
#ui .col { display: flex; flex-direction: column; align-items: center; gap: 6px; }
#ui .bar { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 14px 0; }
#ui .title { font-size: 54px; line-height: .95; color: #ffd60a; transform: rotate(-3deg); margin: 4px 0; }
#ui .sub { font-size: 19px; } #ui .stat { font-size: 24px; }
#ui button { font: inherit; font-size: 22px; padding: 12px 30px; border-radius: 999px; background: #ff006e; color: #fff;
  border: 4px solid #1b1b1b; box-shadow: 0 6px 0 #1b1b1b; cursor: pointer; text-shadow: none; }
#ui button, #ui .pill { white-space: nowrap; }
#ui button:active { transform: translateY(4px); box-shadow: 0 2px 0 #1b1b1b; }
#ui button.big { font-size: 30px; padding: 14px 46px; }
#ui button.alt { background: #3a86ff; } #ui button.ok { background: #2a9d8f; } #ui button.gold { background: #ffbe0b; color: #1b1b1b; }
#ui button.wa { background: #25d366; color: #1b1b1b; }
#ui input { font: inherit; font-size: 22px; padding: 6px 12px; border-radius: 14px; border: 4px solid #1b1b1b; width: 100%; min-width: 0; text-align: center;
  background: #fff; color: #1b1b1b; user-select: text; -webkit-user-select: text; }
#ui .tgt { position: absolute; left: calc(env(safe-area-inset-left) + 10px); top: calc(env(safe-area-inset-top) + 104px); background: rgba(20,20,40,.6);
  border: 3px solid #1b1b1b; border-radius: 14px; padding: 2px 12px; font-size: 18px; white-space: pre; text-align: left; }
#ui button.icon { font-size: 22px; padding: 6px 14px; pointer-events: auto; }
#ui button:disabled { opacity: .5; }
#ui .row { display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; margin-bottom: 26px; }
#ui .pill { background: rgba(20,20,40,.6); border: 3px solid #1b1b1b; border-radius: 999px; padding: 0 14px; font-size: 26px; min-width: 64px; text-align: center; }
#ui .pill small { font-size: 16px; color: #ffd60a; margin-left: 6px; }
#ui .badge { background: #ffd60a; color: #1b1b1b; border: 3px solid #1b1b1b; border-radius: 10px; padding: 0 12px; font-size: 22px;
  animation: bbb-pulse .6s ease-in-out infinite alternate; }
#ui .hud { position: absolute; inset: 0; pointer-events: none; padding: ${SAFE}; }
#ui .pu { display: flex; align-items: center; gap: 6px; font-size: 18px; }
#ui .pus { position: absolute; right: calc(env(safe-area-inset-right) + 10px); top: calc(env(safe-area-inset-top) + 64px);
  display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
#ui .put { display: flex; align-items: center; gap: 6px; background: rgba(20,20,40,.6); border: 3px solid #1b1b1b; border-radius: 999px; padding: 3px 10px 3px 3px; }
#ui .put b { width: 38px; height: 38px; border-radius: 50%; background: #ffd60a; border: 3px solid #1b1b1b; display: grid; place-items: center; font-size: 20px; }
#ui .put i { display: block; width: 64px; height: 10px; border: 2px solid #1b1b1b; border-radius: 6px; background: #3a3a55; overflow: hidden; }
#ui .put i u { display: block; height: 100%; background: #7cfc00; transform-origin: left; }
#ui .put span { font-size: 16px; min-width: 26px; text-align: right; }
#ui .put.end { animation: bbb-blink .3s steps(2) infinite; } #ui .put.end i u { background: #ff3b30; }
#ui .hs { position: absolute; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 24%); transform: translateX(-50%); pointer-events: auto;
  animation: bbb-pulse .5s ease-in-out infinite alternate; }
#ui .mis { background: rgba(20,20,40,.6); border: 3px solid #1b1b1b; border-radius: 14px; padding: 6px 12px; font-size: 16px; width: min(90vw, 380px); text-align: left; }
#ui .mis div { display: flex; justify-content: space-between; gap: 8px; }
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
@keyframes bbb-blink { to { opacity: .35; } }
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
const CHAR_ICON = { beta: '👦', beti: '👧', papa: '👨', mummy: '👩', dadi: '👵' };
const PU_ICON = { shield: '🛡️', magnet: '🟠', jump: '🥛', double: '✖2', cycle: '🚲', rocket: '🚀', score2x: '⭐' };

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
  const install = btn(mTop, '📲 Install', 'icon ok hidden', () => h.onInstall());
  const mSound = btn(mTop, '🔊', 'icon alt', () => h.onSound());
  const mHead = el('div', 'col', null, menu);
  const title = el('h1', 'title o', null, mHead);
  const titleHero = el('div', null, 'Bhaag Beta', title);
  el('div', null, 'Bhaag!', title);
  const tagline = el('div', 'sub o', 'Papa is coming with the chappal!', mHead);
  const mBottom = el('div', 'col push', null, menu);
  const friend = btn(mBottom, '', 'wa hidden', () => h.onFriend()); // a friend's challenge link opened the game
  const challenge = btn(mBottom, '', 'gold', () => h.onChallenge());
  challenge.style.cssText = friend.style.cssText = 'font-size:17px;padding:8px 18px;';
  const huntEl = el('div', 'sub o', '', mBottom);
  const menuBest = el('div', 'stat o', '', mBottom);
  btn(mBottom, '⚔️ Muqabla · race live', 'alt', () => h.onVersus()).style.cssText = 'font-size:19px;padding:8px 22px;margin-bottom:6px;';
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
  const target = el('div', 'tgt o hidden', '', hud); // the line to beat: a friend's distance, or the rivals in a race
  const hsBtn = btn(hud, '', 'gold hs hidden', () => h.onHeadstart());

  // Pause
  const pause = el('div', 'screen hidden', null, root);
  el('h1', 'title o', 'Ruko Zara!', pause);
  const pMissions = el('div', 'mis o', null, pause);
  btn(pause, '▶ Resume', 'big', () => h.onResume());
  const pSound = btn(pause, '🔊 Sound', 'alt', () => h.onSound());
  const pVibe = btn(pause, '📳 Vibration', 'alt', () => h.onVibrate());
  const pVoice = btn(pause, '🗣️ Voice', 'alt hidden', () => h.onVoice());
  btn(pause, '🏠 Home', 'gold', () => h.onHome());

  // Game over
  const over = el('div', 'screen hidden', null, root);
  el('h1', 'title o', 'Pakde Gaye!', over);
  const oScore = el('div', 'stat o', '', over);
  const cRow = el('div', 'row', null, over); // the run's coins, with the "2x by ad" offer beside them
  cRow.style.marginBottom = '0';
  const oCoins = el('div', 'stat o', '', cRow);
  const dbl = btn(cRow, '', 'gold hidden', () => h.onDoubleCoins());
  dbl.style.cssText = 'font-size:17px;padding:4px 14px;';
  const oWhere = el('div', 'sub o', '', over);
  const badge = el('div', 'badge', 'NEW BEST!', over);
  const oMissions = el('div', 'col', null, over);
  const oRace = el('div', 'stat o hidden', '', over); // a live race: who is still running, then the result
  const rematch = btn(over, '🔁 Rematch', 'big hidden', () => h.onRematch());
  const revive = btn(over, '', 'ok', () => h.onRevive());
  const adBtn = btn(over, '📺 Watch ad to escape', 'alt', () => h.onWatchAd());
  const again = btn(over, '↻ Bhaag Again', 'big', () => h.onRestart());
  const waBtn = btn(over, '⚔️ Challenge a friend', 'wa', () => h.onWhatsApp());
  const oRow = el('div', 'row', null, over);
  const shareBtn = btn(oRow, '📤 Share', 'alt', () => h.onShare());
  btn(oRow, '🏠 Home', 'gold', () => h.onHome());

  // Modal (shop / missions / daily / name / room). closeHook runs when the player closes it, not when a screen change hides it.
  const modal = el('div', 'screen hidden', null, root);
  const panel = el('div', 'panel', null, modal);
  let closeHook = null;
  const closeModal = () => { modal.classList.add('hidden'); const f = closeHook; closeHook = null; f?.(); };
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  const flashEl = el('div', 'flash o', '', root);
  const hintEl = el('div', 'hint o', '', root);
  const toastEl = el('div', 'toast', '', root);
  const replay = (e, cls) => { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); };

  const screens = [menu, hud, pause, over];
  const only = (shown) => { closeHook = null; modal.classList.add('hidden'); for (const s of screens) s.classList.toggle('hidden', s !== shown); };

  function openPanel(titleText, build, onClose = null, closeText = 'Close') {
    panel.replaceChildren();
    el('h2', null, titleText, panel);
    build(panel);
    btn(panel, closeText, 'alt', closeModal).style.marginTop = '12px';
    closeHook = onClose;
    modal.classList.remove('hidden');
  }
  const field = (parent, value, placeholder, max) => {
    const i = el('input', null, null, parent);
    Object.assign(i, { type: 'text', value, placeholder, maxLength: max, autocomplete: 'off', enterKeyHint: 'done' });
    return i;
  };

  return {
    showMenu({ best, wallet: w }) { menuBest.textContent = `Best: ${Math.floor(best)}`; wallet.textContent = `🪙 ${w}`; only(menu); },
    setChallenge(goal, reward, done) {
      challenge.textContent = done ? `📅 Challenge done ✔ · play again` : `📅 Aaj ka Challenge: ${goal} m · 🪙${reward}`;
    },
    setInstallable(on, label = '📲 Install') { install.classList.toggle('hidden', !on); install.textContent = label; },
    setFriend(text) { friend.classList.toggle('hidden', !text); friend.textContent = text || ''; },
    setHunt(text) { huntEl.textContent = text; },
    setTarget(text) { if (target.textContent !== text) { target.textContent = text; target.classList.toggle('hidden', !text); } },
    setDouble(n) { dbl.classList.toggle('hidden', !n); dbl.disabled = false; dbl.textContent = `📺 2× coins (+${n} 🪙)`; },
    setRace(text, done) { oRace.textContent = text; rematch.classList.toggle('hidden', !done); },
    askName(current, onDone) {
      openPanel('Tumhara naam?', (p) => {
        el('div', null, 'Your friends see this name when you challenge them.', p).style.fontSize = '16px';
        const i = field(p, current, 'Naam', 12);
        btn(p, 'OK', 'ok', () => { closeHook = null; modal.classList.add('hidden'); onDone(i.value); }).style.marginTop = '10px';
      });
      panel.lastChild.remove(); // no way out but OK: the share is waiting on it (an empty name is fine)
    },
    showRate(onYes, onLater) {
      openPanel('Maza aa raha hai?', (p) => {
        el('div', 'title', '⭐⭐⭐⭐⭐', p).style.cssText = 'font-size:34px;transform:none;';
        el('div', null, 'A rating helps more people find the game. It takes 10 seconds!', p).style.fontSize = '17px';
        btn(p, '⭐ Rate karo', 'ok', () => { closeHook = null; modal.classList.add('hidden'); onYes(); }).style.marginTop = '10px';
      }, onLater, 'Baad mein');
    },
    // Muqabla: pick how to find rivals. h2 = { onQuick(name), onHost(name), onJoin(name, code) }.
    showVersus(name, code, h2) {
      openPanel('Muqabla ⚔️', (p) => {
        el('div', null, 'Same gali, same time. Jo sabse door bhaage, woh jeeta!', p).style.fontSize = '16px';
        const n = field(p, name, 'Tumhara naam', 12);
        n.style.margin = '8px 0';
        btn(p, '🎲 Quick Match', 'big', () => h2.onQuick(n.value)).style.fontSize = '24px';
        el('h3', null, 'Dost ke saath', p);
        btn(p, '👥 Room banao', 'ok', () => h2.onHost(n.value));
        const r = el('div', 'item', null, p);
        const c = field(r, code, 'CODE', 4);
        c.style.textTransform = 'uppercase';
        btn(r, 'Join', 'gold', () => h2.onJoin(n.value, c.value));
        el('div', null, 'Ek hi Wi-Fi par ho? Room banao aur code bata do. (Internet chahiye.)', p).style.fontSize = '14px';
      });
    },
    // The waiting room. r = { seeking } while looking for a random rival, else { code, host, quick, me, players }.
    showRoom(r, h2) {
      openPanel(r.seeking ? 'Muqabla ⚔️' : `Room ${r.code}`, (p) => {
        if (r.seeking) { el('div', 'stat', '🔎 Khiladi dhoondh rahe hain...', p); return; }
        for (const name of [`${r.me} (you)`, ...r.players]) el('div', 'grow', `🏃 ${name}`, el('div', 'item', null, p));
        if (!r.players.length) el('div', null, r.quick ? 'Connecting...' : r.host ? 'Share the code. Waiting for friends...' : 'Is room mein abhi koi nahi. Code sahi hai?', p).style.fontSize = '16px';
        if (r.host) btn(p, '▶ Start race', 'big', () => h2.onStart()).disabled = !r.players.length;
        else if (r.players.length) el('div', null, 'Host ke start ka intezaar...', p).style.fontSize = '16px';
        if (!r.quick) btn(p, '🟢 WhatsApp pe bulao', 'wa', () => h2.onInvite()).style.marginTop = '10px';
      }, h2.onLeave, r.seeking ? 'Cancel' : 'Leave');
    },
    setWallet(w) { wallet.textContent = `🪙 ${w}`; },
    showHUD() { only(hud); },
    setScore(s, c, mult) {
      score.replaceChildren(String(Math.floor(s)));
      if (mult > 1) el('small', null, `x${mult}`, score);
      coins.textContent = `🪙 ${c}`;
    },
    // Subway-Surfers-style timers on the right: icon, draining bar, seconds left; blinks red in the last 3 seconds.
    setPowerups(list) {
      const key = list.map((p) => p.name).join();
      if (pus.dataset.key !== key) {
        pus.dataset.key = key;
        pus.replaceChildren();
        for (const p of list) { const r = el('div', 'put o', null, pus); el('b', null, PU_ICON[p.name], r); el('u', null, null, el('i', null, null, r)); el('span', null, '', r); }
      }
      list.forEach((p, i) => {
        const r = pus.children[i];
        r.children[1].firstChild.style.transform = `scaleX(${Math.max(0, p.frac)})`;
        r.lastChild.textContent = `${Math.ceil(p.left)}s`;
        r.classList.toggle('end', p.left <= 3);
      });
    },
    setHeadstart(n) { hsBtn.classList.toggle('hidden', !n); hsBtn.textContent = `🚀 Rocket Start ×${n}`; },
    showPause(missions = []) {
      pMissions.replaceChildren();
      el('div', null, '🎯 Missions', pMissions);
      for (const m of missions) { const r = el('div', null, null, pMissions); el('span', null, `${m.have >= m.goal ? '✔' : '•'} ${m.text}`, r); el('span', null, `${m.have}/${m.goal}`, r); }
      only(pause);
    },
    setAdLoading(on) { adBtn.disabled = dbl.disabled = on; revive.disabled = on || !revive.dataset.afford; adBtn.textContent = on ? '📺 Loading ad...' : '📺 Watch ad to escape'; },
    setSettings({ muted, vibrate, voice, voiceAvailable }) {
      pVoice.classList.toggle('hidden', !voiceAvailable);
      pVoice.textContent = `🗣️ Hindi voice ${voice ? 'On' : 'Off'}`;
      mSound.textContent = soundLabel(muted);
      pSound.textContent = `${soundLabel(muted)} Sound ${muted ? 'Off' : 'On'}`;
      pVibe.textContent = `📳 Vibration ${vibrate ? 'On' : 'Off'}`;
    },
    // race: a live race has no second chances (no revive, no ad, no restart); its result comes through setRace.
    showGameOver({ score: s, coins: c, best, isNewBest, completed, reviveCost, wallet: w, adAvailable, where = '', canShare = false, doubleCoins = 0, race = false }) {
      oWhere.textContent = where;
      shareBtn.classList.toggle('hidden', !canShare);
      adBtn.classList.toggle('hidden', !adAvailable || race);
      for (const b of [revive, again, waBtn]) b.classList.toggle('hidden', race);
      oRace.classList.toggle('hidden', !race);
      rematch.classList.add('hidden');
      this.setDouble(race ? 0 : doubleCoins);
      adBtn.disabled = false;
      adBtn.textContent = '📺 Watch ad to escape';
      oScore.textContent = `Score ${Math.floor(s)} · Best ${Math.floor(best)}`;
      oCoins.textContent = `Coins ${c}`;
      badge.classList.toggle('hidden', !isNewBest);
      oMissions.replaceChildren();
      for (const m of completed) el('div', 'sub o', `✔ ${m.text}  +🪙${m.reward}`, oMissions);
      revive.textContent = `❤ Bachao! (🪙 ${reviveCost})`;
      revive.disabled = w < reviveCost;
      revive.dataset.afford = w >= reviveCost ? '1' : '';
      only(over);
    },
    setCharacters(heroName, chaserLine) { titleHero.textContent = `Bhaag ${heroName}`; tagline.textContent = chaserLine; },
    showShop(skins, data, upgrades = [], chars = null, headstartCost = 0) {
      openPanel('Beta Ki Dukaan', (p) => {
        el('div', null, `🪙 ${data.coins}`, p).style.fontSize = '20px';
        if (chars) for (const [kind, heading] of [['hero', 'Kaun bhaagega?'], ['chaser', 'Peeche kaun?']]) {
          el('h3', null, heading, p);
          for (const [id, c] of Object.entries(chars[kind])) {
            const r = el('div', 'item', null, p);
            el('div', 'pu', CHAR_ICON[id], r);
            el('div', 'grow', c.name, r);
            if (data[kind] === id) el('div', null, '✔ Chosen', r);
            else if (data.chars.includes(id)) btn(r, 'Choose', 'ok', () => h.onChar(kind, id));
            else btn(r, `🪙 ${c.price}`, 'gold', () => h.onChar(kind, id)).disabled = data.coins < c.price;
          }
        }
        el('h3', null, 'Cap & Bag', p);
        for (const [id, s] of Object.entries(skins)) {
          const r = el('div', 'item', null, p);
          const sw = el('div', 'sw', null, r);
          sw.style.background = `linear-gradient(135deg, ${hex(s.cap)} 50%, ${hex(s.bag)} 50%)`;
          el('div', 'grow', s.name, r);
          if (data.skin === id) el('div', null, '✔ Wearing', r);
          else if (data.owned.includes(id)) btn(r, 'Wear', 'ok', () => h.onSkin(id));
          else btn(r, `🪙 ${s.price}`, 'gold', () => h.onSkin(id)).disabled = data.coins < s.price;
        }
        if (headstartCost) {
          el('h3', null, 'Rocket Start', p);
          const r = el('div', 'item', null, p);
          el('div', 'pu', '🚀', r);
          const info = el('div', 'grow', 'Fly from the start of a run', r);
          el('small', null, `You have ${data.headstarts}`, info);
          btn(r, `🪙 ${headstartCost}`, 'gold', () => h.onBuyHeadstart()).disabled = data.coins < headstartCost;
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
    showMissions(missions, mult, data = null, badges = []) {
      openPanel(data ? 'Missions & Badges' : 'Missions', (p) => {
        el('div', null, `Score multiplier: x${mult}  (every 3 missions = +1)`, p).style.fontSize = '16px';
        for (const m of missions) {
          const r = el('div', 'item', null, p);
          el('div', 'grow', `🎯 ${m.text}`, r);
          el('div', null, `+🪙${m.reward}`, r);
        }
        if (!data) return;
        el('h3', null, `Badges ${data.badges.length}/${badges.length}`, p);
        for (const a of badges) {
          const r = el('div', 'item', null, p), got = data.badges.includes(a.id);
          el('div', 'pu', got ? a.icon : '🔒', r);
          el('div', 'grow', a.text, r).style.opacity = got ? 1 : 0.6;
          el('div', null, got ? '✔' : `🪙${a.reward}`, r);
        }
        el('h3', null, 'Records', p);
        const L = data.life;
        for (const [k, v] of [['Best score', Math.floor(data.best)], ['Longest run', `${data.bestDistance} m`], ['Runs', L.runs],
          ['Total distance', `${(L.distance / 1000).toFixed(1)} km`], ['Coins collected', L.coins], ['Near misses', L.nearMisses], ['Cycle smashes', L.smashes], ['Races won', L.wins]]) {
          const r = el('div', 'item', null, p);
          el('div', 'grow', k, r);
          el('div', null, String(v), r);
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
      panel.lastChild.remove(); // the generic Close: "Chalo" must run onDone (the daily reward comes next)
    },
    flash(text) { flashEl.textContent = text; replay(flashEl, 'go'); },
    hint(text) { hintEl.textContent = text; replay(hintEl, 'go'); },
    toast(text) { toastEl.textContent = text; replay(toastEl, 'go'); },
  };
}
