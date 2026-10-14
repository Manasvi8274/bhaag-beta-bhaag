import * as THREE from '../vendor/three.module.js';
import { SPEED_START, SPEED_MAX, SPEED_RAMP, LANES, VERSION, CHASER_FAR, speedLevel, speedFor } from './config.js';
import { createPlayer, applyAction, updatePlayer, getHitbox } from './player.js';
import { aabbOverlap, firstHit, groundAt } from './collision.js';
import { createSpawner, spawnUntil } from './spawner.js';
import { createChaser, stumble, chappalHit, catchNow, updateChaser, throwDue, angryThrowDue, startChase, chaseActive } from './chaser.js';
import { createStickman, HEROES, CHASERS, SPANK_PERIOD } from './stickman.js';
import { createProp, setPropsNight, addHeadlights, PROP_NAMES, buildBicycle } from './props.js';
import { createWorld, lampForLight, LAMP_HEAD_Y } from './world.js';
import { createSky, createRain, createCrows } from './sky.js';
import { skyAt, menuTime, mix, rainAt, rainStartFor } from './daynight.js';
import { ZONES, zoneAt } from './zones.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { createFx, createSpeedLines } from './fx.js';
import { createAds, createWebAds } from './ads.js';
import { drawCard, shareRun } from './share.js';
import { createVoice } from './voice.js';
import { festivalOn } from './festival.js';
import { createRecorder, record, ghostAt, ghostDistance } from './ghost.js';
import { createProgress, HEADSTART_COST, SKINS, CHARACTERS, dailyChallenge, ACHIEVEMENTS } from './progress.js';
import { createPowerups, activate, updatePowerups, isActive, consume, listActive, POWERUP_LABEL, POWERUP_TIME, HEADSTART_TIME, mysteryPrize } from './powerups.js';

const CAUGHT_SCENE_TIME = 2.9;
const HIT_WORDS = ['CHATAK!', 'DHAP!', 'THAPAK!', 'CHAPAAK!'];
const THROW_WINDUP = 0.7, CHAPPAL_REL_SPEED = 6; // warning time, and how much faster than Beta it flies
const LAMP_LIGHTS = 2; // real lights hopping between streetlights near Beta; the rest are emissive + glow decals
const HEMI_DAY = new THREE.Color(0xffffff), HEMI_NIGHT = new THREE.Color(0x7d8fd8);
const GROUND_DAY = new THREE.Color(0x8a7a66), GROUND_NIGHT = new THREE.Color(0x3a3440);
// Each chaser: what they throw, the warning, the menu line and their taunts.
const CHASER_INFO = {
  papa: { throws: 'chappal', warn: '⚠️ Chappal aayi!', line: 'Papa is coming with the chappal!', chase: 'Papa ne cycle utha li!', tired: 'Papa thak gaye!',
    taunts: [['Ruk ja nalayak!', 'रुक जा नालायक!'], ['Aaj teri khair nahi!', 'आज तेरी ख़ैर नहीं!'],
      ['Remote tod diya?! Ruk!', 'रिमोट तोड़ दिया? रुक!'], ['Ghar aa, phir batata hoon!', 'घर आ, फिर बताता हूँ!'],
      ['Sharma ji ka beta dekh!', 'शर्मा जी का बेटा देख!'], ['Isi din ke liye padhaya tha?!', 'इसी दिन के लिए पढ़ाया था?'],
      ['Chappal dekhi hai meri?!', 'चप्पल देखी है मेरी?'], ['Match chhoot gaya mera!', 'मैच छूट गया मेरा!']] },
  mummy: { throws: 'belan', warn: '⚠️ Belan aaya!', line: 'Mummy is coming with the belan!', chase: 'Mummy ne cycle utha li!', tired: 'Mummy thak gayi!',
    taunts: [['Ruk ja!', 'रुक जा!'], ['Homework kaun karega?!', 'होमवर्क कौन करेगा?'], ['Aaj khaana band!', 'आज खाना बंद!'],
      ['Belan dekha hai?!', 'बेलन देखा है?'], ['Ghar aa, phir batati hoon!', 'घर आ, फिर बताती हूँ!']] },
  dadi: { throws: 'chappal', warn: '⚠️ Dadi ki chappal!', line: 'Dadi is coming with her lathi!', chase: 'Dadi ne cycle utha li!', tired: 'Dadi thak gayi!',
    taunts: [['Arre o nalayak!', 'अरे ओ नालायक!'], ['Dadi se bhaagega?!', 'दादी से भागेगा?'],
      ['Ruk ja, kaan khichungi!', 'रुक जा, कान खींचूँगी!'], ['Hai Ram, yeh bachcha!', 'हाय राम, यह बच्चा!']] },
};
const CHASE_EVERY = 1500, CHASE_REWARD = 50; // every 1.5 km the chaser grabs a cycle for a short, hard chase
const CYCLE_BOOST = 1.35, SMASH_COINS = 2; // Bhaiya Ki Cycle: faster, and obstacles go flying
const NEAR_MISS_COINS = 5, NEAR_MISS_WINDOW = 0.6; // dodged out of a vehicle's lane this recently = a near miss
const MILESTONE = 500;
const FIREWORKS = [0xff3b3b, 0xffd60a, 0x3aff7a, 0x3a86ff, 0xff70ff, 0xffffff];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const NEWS = [
  ['🚀', 'Diwali Rocket: fly over the street and grab the coins in the sky! Buy a Rocket Start in the shop'],
  ['🎁', 'Mystery Dabba: coins, a power-up or a free Rocket Start inside'],
  ['⭐', 'Score Dugna doubles your score; power-up timers now show on the right'],
  ['⚡', 'Speed Up levels as your score climbs, and a bonus for every 3 missions'],
  ['👧', 'Play as Beti! And choose who chases you: Papa (chappal), Mummy (belan) or Dadi (lathi) in the shop'],
  ['🌙', 'Day turns to night as you run: streetlights, lit windows, neon signs, stars'],
  ['🛤️', 'Three mohallas: Market Gali, Railway Colony (watch the train!), Mandir Marg'],
  ['🛵', 'New on the road: scooter uncle, sleeping dogs, cement pipes'],
  ['📅', "Aaj ka Challenge: one street for everyone each day, reach the goal for 300 coins, and race your own ghost!"],
  ['🌧️', 'Monsoon spells with thunder, and fireworks at night'],
  ['🚲', "New power-up: Bhaiya Ki Cycle! Ride faster and smash through everything"],
  ['🗣️', 'Papa, Mummy and Dadi now shout their taunts out loud in Hindi (turn it off in pause)'],
  ['🚲', 'Every 1.5 km Papa grabs a cycle and chases hard. Survive it clean for 50 coins!'],
  ['😡', 'After 1 km Papa throws his chappal from afar. Dodge close for "Bal bal bache!" coins'],
];
const ROCKET_Y = 7.4, HEADSTART_WINDOW = 6; // flying height (above the street wires); seconds the Rocket Start button stays up
const HINTS = [[0.8, '👈 Swipe left / right 👉'], [4.5, '👆 Swipe up to jump'], [8, '👇 Swipe down to slide']];

const ease = (cur, target, rate, dt) => cur + (target - cur) * Math.min(1, dt * rate);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const storage = (() => { try { return window.localStorage; } catch { return undefined; } })();

export function startGame(canvas, uiRoot) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe3ff, 45, 150);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 250);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  scene.add(hemi, sun, sun.target);
  // Created up front (intensity 0 by day) so the light count never changes: no shader recompiles mid-run.
  const lampLights = Array.from({ length: LAMP_LIGHTS }, () => { const l = new THREE.PointLight(0xffa646, 0, 13, 1.6); scene.add(l); return l; });
  const sky = createSky(scene);
  const rainFx = createRain(scene);
  const crows = createCrows(scene);
  const betaLight = new THREE.PointLight(0xcfd8ff, 0, 9, 1.2); // night: lights the road around Beta so his black body reads
  scene.add(betaLight);

  // Every hero and chaser is built once; the chosen pair is shown (beta = whoever runs, papa = whoever chases).
  const heroes = Object.fromEntries(HEROES.map((t) => [t, createStickman(t)]));
  const chasers = Object.fromEntries(CHASERS.map((t) => [t, createStickman(t)]));
  let beta = heroes.beta, papa = chasers.papa;
  const ghosts = Object.fromEntries(HEROES.map((t) => [t, createStickman(t, { ghost: true })])); // daily-challenge ghost
  for (const g of Object.values(ghosts)) { g.group.visible = false; scene.add(g.group); }
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xff70a6, emissive: 0xff70a6, emissiveIntensity: 0.4, transparent: true, opacity: 0.22, depthWrite: false }));
  bubble.position.y = 0.95;
  bubble.visible = false;
  // Danger lane: a pulsing red stripe on the road in the lane a chappal is about to fly down.
  const warnLane = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
  warnLane.rotation.x = -Math.PI / 2;
  warnLane.visible = false;
  scene.add(warnLane);
  const rocketPack = createProp('rocket');
  rocketPack.scale.setScalar(0.9);
  rocketPack.visible = false;
  scene.add(rocketPack);
  const bike = new THREE.Group();
  const bikeWheels = buildBicycle(bike);
  bike.visible = false;
  const chaserBike = new THREE.Group(); // the chaser's own cycle for the cycle chase
  const chaserWheels = buildBicycle(chaserBike);
  chaserBike.visible = false;
  for (const m of [...Object.values(heroes), ...Object.values(chasers)]) scene.add(m.group);

  const festival = festivalOn(today(), new URLSearchParams(location.search).get('festival') || '');
  const world = createWorld(scene, 1, { diwali: festival === 'diwali' });
  const fx = createFx(scene);
  const speedLines = createSpeedLines(scene);
  const progress = createProgress(storage);
  const audio = createAudio();
  const voice = createVoice();
  const settings = () => ({ ...progress.data, voiceAvailable: voice.available() });
  const shout = (text) => { if (!progress.data.muted && progress.data.voice) voice.say(text, progress.data.chaser); };
  let ads = createAds();
  if (!ads.available) ads = createWebAds(); // PWA / browser
  audio.setMuted(progress.data.muted);
  const applySkin = () => { const s = SKINS[progress.data.skin]; beta.setColors(s.cap, s.bag); };
  const chaserInfo = () => CHASER_INFO[progress.data.chaser];
  function applyCharacters() {
    beta = heroes[progress.data.hero];
    papa = chasers[progress.data.chaser];
    for (const m of [...Object.values(heroes), ...Object.values(chasers)]) m.group.visible = m === beta || m === papa;
    beta.group.add(bubble, bike);
    papa.group.add(chaserBike);
    applySkin();
    ui.setCharacters(CHARACTERS.hero[progress.data.hero].name, festival === 'diwali' ? '🪔 Happy Diwali! 🪔' : chaserInfo().line);
  }

  let state = 'menu', run = null, shake = 0, baseFov = 62;
  const vibrate = (ms) => { if (progress.data.vibrate) try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  const ui = createUI(uiRoot, {
    onStart: () => begin(false), onRestart: () => begin(run?.daily), onChallenge: () => begin(true), onPause: pauseGame, onResume: resume, onRevive: () => revive(false), onWatchAd: watchAd,
    onHome() { if (state === 'paused') finishRun(); goMenu(); },
    onMissions: () => ui.showMissions(progress.data.missions, progress.multiplier(), progress.data, ACHIEVEMENTS),
    onSound() { progress.setSetting('muted', !progress.data.muted); audio.setMuted(progress.data.muted); ui.setSettings(settings()); },
    onVoice() { progress.setSetting('voice', !progress.data.voice); ui.setSettings(settings()); },
    onVibrate() { progress.setSetting('vibrate', !progress.data.vibrate); ui.setSettings(settings()); vibrate(40); },
    onShop: () => shop(),
    onBuyHeadstart() { if (progress.buyHeadstart()) audio.play('powerup'); shop(); ui.setWallet(progress.data.coins); },
    onHeadstart: () => useHeadstart(),
    onChar(kind, id) {
      const had = progress.data.chars.includes(id);
      if (progress.pickChar(kind, id)) { applyCharacters(); audio.play(had ? 'coin' : 'powerup'); }
      shop();
      ui.setWallet(progress.data.coins);
    },
    onUpgrade(name) {
      if (progress.upgrade(name)) audio.play('powerup');
      shop();
      ui.setWallet(progress.data.coins);
    },
    onSkin(id) {
      if (progress.select(id) || progress.buy(id)) { applySkin(); audio.play('powerup'); }
      shop();
      ui.setWallet(progress.data.coins);
    },
    onShare,
    async onInstall() {
      const e = window.bbbInstall;
      if (!e) return;
      window.bbbInstall = null;
      ui.setInstallable(false);
      try { await e.prompt(); } catch { /* dismissed */ }
    },

    onClaimDaily() { progress.claimDaily(today()); ui.setWallet(progress.data.coins); audio.play('powerup'); },
  });
  ui.setSettings(settings());
  applyCharacters();
  ui.setInstallable(!!window.bbbInstall);
  window.addEventListener('bbb-install', () => ui.setInstallable(true));
  window.addEventListener('appinstalled', () => ui.setInstallable(false));
  const shop = () => ui.showShop(SKINS, progress.data, upgradeList(), CHARACTERS, HEADSTART_COST);
  const upgradeList = () => Object.keys(POWERUP_TIME).map((name) => ({
    name, label: POWERUP_LABEL[name], level: progress.upgradeLevel(name), cost: progress.upgradeCost(name), secs: progress.powerupTime(name),
  }));

  function clearItems() {
    if (run) for (const it of run.items) scene.remove(it.mesh);
    fx.clear();
    world.reset();
    crows.reset();
  }

  // daily: today's challenge street (seeded: the same obstacles, rain and all, for everyone today).
  function begin(daily = false) {
    clearItems();
    const ch = dailyChallenge(today());
    const seed = daily ? ch.seed : (Math.random() * 1e9) | 0;
    run = {
      p: createPlayer(), z: 0, speed: SPEED_START, prevLane: 1, t: 0, hint: 0, daily, goal: ch.goal, goalHit: false,
      rec: daily ? createRecorder() : null, ghost: daily ? progress.ghostFor(today()) : null, ghostBeat: false,
      spawner: createSpawner(seed), chaser: createChaser(), pu: createPowerups(),
      items: [], hitSet: new Set(), coins: 0, committed: 0, score: 0, stumbleT: 0, invuln: 0,
      caughtT: 0, hits: 0, jolt: 0, throwHinted: false, scoreDist: 0, speedLvl: 0, flying: false, skyZ: 0, skyLane: 1, ticks: {}, papaZ: 3, papaX: 0, zone: 0, ground: 0, floorS: 0, pendingThrow: 0, revives: 0, adUsed: false, mult: progress.multiplier(), wasGrounded: true,
      dodgeT: -9, dodgeFromX: 0, milestone: 0, nextChase: CHASE_EVERY, chasing: false, rainStart: rainStartFor(daily ? (seed % 1000) / 1000 : Math.random()), thunderT: 3, flashT: 0, rained: false,
      stats: { score: 0, coins: 0, distance: 0, jumps: 0, slides: 0, powerups: 0, dodges: 0, nearMisses: 0, areas: 1, smashes: 0, night: 0, rain: 0 },
      recorded: null, // stats already added to the lifetime records (a revived run records only what is new)
    };
    if (progress.data.tutorialDone) run.hint = HINTS.length;
    state = 'playing';
    beta.setMode('run');
    ui.showHUD();
    ui.setScore(0, 0, run.mult);
    ui.setPowerups([]);
    ui.setHeadstart(progress.data.headstarts);
    ui.flash('Bhaag!');
    if (daily) ui.toast(run.ghost ? `👻 Race your best today: ${Math.floor(ghostDistance(run.ghost))} m` : `📅 Aaj ka Challenge: reach ${ch.goal} m!`);
    audio.setZone(0);
    shout(`${progress.data.hero === 'beti' ? 'बेटी' : 'बेटा'}! रुक जा!`);
    audio.startMusic();
    ads.preload(); // so the "watch ad" revive is instant at game over
  }

  function goMenu() {
    clearItems();
    run = null;
    state = 'menu';
    audio.stopMusic();
    ui.showMenu({ best: progress.data.best, wallet: progress.data.coins });
    const ch = dailyChallenge(today());
    ui.setChallenge(ch.goal, ch.reward, progress.data.challengeDone === today());
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    audio.stopMusic();
    audio.setRain(0);
    ui.setSettings(settings()); // Hindi voices may have loaded since
    ui.showPause(progress.data.missions.map((m) => ({ text: m.text, goal: m.goal, have: Math.min(m.goal, run.stats[m.stat] || 0) })));
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    ui.showHUD();
    ui.flash('Bhaag!');
    audio.startMusic();
  }

  // Banks coins earned since the last bank, settles missions/best. Safe to call again after a revive.
  function finishRun() {
    progress.addCoins(run.coins - run.committed);
    run.committed = run.coins;
    if (!progress.data.tutorialDone) progress.setSetting('tutorialDone', true);
    const r = progress.finishRun(run.stats);
    const paid = run.daily ? progress.completeChallenge(today(), run.stats.distance) : 0;
    if (run.rec) progress.saveGhost(today(), run.stats.distance, run.rec);
    if (paid) r.completed.push({ text: 'Aaj ka Challenge', reward: paid });
    const delta = Object.fromEntries(Object.entries(run.stats).map(([k, v]) => [k, v - (run.recorded?.[k] || 0)]));
    for (const a of progress.recordRun(delta, !run.recorded, run.stats)) r.completed.push({ text: `🏅 ${a.text.split(':')[0]}`, reward: a.reward });
    run.recorded = { ...run.stats };
    return r;
  }

  const reviveCost = () => 100 * 2 ** run.revives;

  function revive(free) {
    if (state !== 'over') return;
    if (!free) {
      if (!progress.spend(reviveCost())) return;
      run.revives += 1;
    }
    run.chaser = createChaser();
    run.papaZ = 3;
    run.invuln = 2.5;
    run.stumbleT = 0;
    run.pendingThrow = 0;
    Object.assign(run.p, { y: 0, vy: 0, grounded: true, sliding: false, pendingSlide: false });
    run.items = run.items.filter((it) => {
      if (it.item.type !== 'obstacle' || it.item.z < run.z - 40) return true;
      scene.remove(it.mesh);
      return false;
    });
    for (const it of run.items) it.mesh.visible = true;
    state = 'playing';
    beta.setMode('run');
    ui.showHUD();
    ui.flash('Phir Bhaag!');
    audio.play('powerup');
    audio.startMusic();
  }

  // One rewarded-ad escape per run (keeps ads optional and rare).
  let adBusy = false;
  async function watchAd() {
    if (state !== 'over' || run.adUsed || adBusy) return;
    adBusy = true;
    ui.setAdLoading(true);
    audio.setMuted(true); // ads play their own sound
    const earned = await ads.showRewarded();
    audio.setMuted(progress.data.muted);
    adBusy = false;
    if (earned && state === 'over') { run.adUsed = true; revive(true); return; }
    ui.setAdLoading(false);
    if (state === 'over') ui.toast('Ad not finished or not available - try again');
  }

  // Score card from the caught scene itself (chaser mid-spank), then the share sheet.
  const runInfo = () => ({ distance: run.stats.distance, score: run.score, area: ZONES[run.zone].name, chaser: progress.data.chaser, hero: progress.data.hero });
  function onShare() {
    if (state !== 'over') return;
    const info = runInfo(), card = document.createElement('canvas');
    renderer.render(scene, camera); // read right after drawing: the WebGL buffer is still valid
    drawCard(card.getContext('2d'), renderer.domElement, info);
    card.toBlob(async (blob) => {
      const r = await shareRun(blob, info);
      if (r === 'copied') ui.toast('Copied! Paste it to your friends 📋');
      else if (r === 'failed') ui.toast('Could not share on this device');
    }, 'image/png');
  }

  function enterCaught() {
    catchNow(run.chaser);
    state = 'caught';
    run.caughtT = 0;
    run.hits = 0;
    beta.setMode('caught');
    papa.setMode('spank');
    ui.flash('Pakda!');
    shout('पकड़ लिया!');
    audio.stopMusic();
    for (const { item, mesh } of run.items) if (item.z < run.z + 2 && item.z > run.z - 9) mesh.visible = false; // clear the stage
    vibrate(250);
    shake = 0.5;
  }

  function onAction(action) {
    if (state !== 'playing') return;
    const p = run.p, wasGrounded = p.grounded;
    if (action === 'slide' && p.grounded && isActive(run.pu, 'cycle')) return; // no sliding on a bicycle
    if (run.flying && (action === 'jump' || action === 'slide')) return;
    if (action === 'left' || action === 'right') run.prevLane = p.lane;
    if (!applyAction(p, action)) return;
    if (action === 'left' || action === 'right') { run.stats.dodges += 1; run.dodgeT = run.t; run.dodgeFromX = LANES[run.prevLane]; }
    else if (action === 'jump') {
      run.stats.jumps += 1;
      if (isActive(run.pu, 'jump')) p.vy *= 1.45; // doodh power: clears even a bus
      audio.play('jump');
    } else if (action === 'slide') {
      run.stats.slides += 1;
      if (wasGrounded) audio.play('slide');
    }
  }
  createInput(window, onAction);

  function spawnItems() {
    for (const item of spawnUntil(run.spawner, run.z)) {
      const mesh = addHeadlights(createProp(item.type === 'obstacle' ? item.name : item.type === 'coin' ? 'coin' : item.name), item.name);
      mesh.position.set(item.x, item.type === 'coin' ? item.y - 0.3 : item.type === 'powerup' ? item.y - 0.4 : 0, item.z);
      scene.add(mesh);
      run.items.push({ item, mesh });
    }
  }

  function collect(box) {
    const magnet = isActive(run.pu, 'magnet');
    run.items = run.items.filter(({ item, mesh }) => {
      if (item.z - item.d / 2 > run.z + 10 || (item.name === 'chappal' && item.z < run.z - 40)) { scene.remove(mesh); return false; } // behind camera, or a missed chappal
      if (item.type === 'obstacle' || item.type === 'ramp') return true;
      if (magnet && item.type === 'coin' && item.z > run.z - 16 && item.z < run.z + 1) {
        item.x = ease(item.x, box.x, 10, run.dt);
        item.y = ease(item.y, box.y + 0.6, 10, run.dt);
        item.z = ease(item.z, run.z, 10, run.dt);
        mesh.position.set(item.x, item.y - 0.3, item.z);
      }
      if (!aabbOverlap(box, item)) return true;
      scene.remove(mesh);
      if (item.type === 'coin') {
        const n = isActive(run.pu, 'double') ? 2 : 1;
        run.coins += n;
        run.stats.coins += n;
        fx.burst(item.x, item.y + 0.3, item.z, 0xffd60a, 5, { speed: 2, up: 2, life: 0.35 });
        run.streak = run.t - (run.lastCoinT ?? -9) < 0.4 ? (run.streak || 0) + 1 : 0; // a quick run of coins climbs in pitch
        run.lastCoinT = run.t;
        audio.play('coin', 2 ** (Math.min(run.streak, 12) / 24));
      } else {
        run.stats.powerups += 1;
        fx.burst(item.x, item.y + 0.4, item.z, 0xff70a6, 16, { speed: 4, up: 4 });
        if (item.name === 'dabba') openDabba();
        else {
          activate(run.pu, item.name, progress.powerupTime(item.name));
          ui.toast(POWERUP_LABEL[item.name] + '!');
        }
        audio.play(item.name === 'cycle' ? 'tring' : 'powerup');
      }
      return false;
    });
  }

  function openDabba() {
    const prize = mysteryPrize(Math.random());
    if (prize.coins) { run.coins += prize.coins; run.stats.coins += prize.coins; ui.toast(`🎁 Mystery Dabba: +${prize.coins} 🪙`); }
    else if (prize.powerup) { activate(run.pu, prize.powerup, progress.powerupTime(prize.powerup)); ui.toast(`🎁 Mystery Dabba: ${POWERUP_LABEL[prize.powerup]}!`); }
    else { progress.addHeadstart(1); ui.toast('🎁 Mystery Dabba: a free 🚀 Rocket Start!'); }
  }

  // Rocket Start: during the first seconds of a run, the button launches the rocket for longer.
  function useHeadstart() {
    if (state !== 'playing' || run.t > HEADSTART_WINDOW || !progress.useHeadstart()) return;
    activate(run.pu, 'rocket', HEADSTART_TIME);
    ui.setHeadstart(0);
    ui.flash('🚀 Rocket Start!');
    audio.play('speedup');
  }

  // Diwali Rocket: Beta flies above the traffic (nothing can hit him) over a trail of sky coins, then drops back.
  function updateRocket(dt) {
    const p = run.p, flying = isActive(run.pu, 'rocket');
    if (flying && !run.flying) { run.skyZ = run.z - 10; run.skyLane = p.lane; ui.flash('🚀 Udaan!'); }
    if (!flying && run.flying) { run.invuln = Math.max(run.invuln, 1.5); ui.toast('Rocket khatam! Neeche aao!'); }
    run.flying = flying;
    if (!flying) return;
    p.y = ease(p.y, ROCKET_Y, 3, dt);
    Object.assign(p, { vy: 0, grounded: false, sliding: false, pendingSlide: false });
    const reach = run.z - run.speed * run.pu.timers.rocket; // no sky coins past where the rocket runs out
    while (run.skyZ > run.z - 60 && run.skyZ > reach) {
      if (Math.random() < 0.08) run.skyLane = Math.max(0, Math.min(2, run.skyLane + (Math.random() < 0.5 ? -1 : 1)));
      const item = { type: 'coin', x: LANES[run.skyLane], y: ROCKET_Y + 0.5, z: run.skyZ, w: 0.6, h: 0.6, d: 0.6 };
      const mesh = createProp('coin');
      mesh.position.set(item.x, item.y - 0.3, item.z);
      scene.add(mesh);
      run.items.push({ item, mesh });
      run.skyZ -= 2.2;
    }
    if (Math.random() < dt * 40) fx.burst(p.x, p.y + 0.4, run.z + 0.5, Math.random() < 0.5 ? 0xff9f1c : 0xffd60a, 1, { speed: 1, up: -2, life: 0.35, gravity: -2 });
  }

  // On the cycle Beta ploughs through everything: each obstacle he meets goes flying.
  function smash(box) {
    for (const { item, mesh } of run.items) {
      if (item.type !== 'obstacle' || run.hitSet.has(item) || !aabbOverlap(box, item)) continue;
      run.hitSet.add(item);
      mesh.visible = false;
      run.stats.smashes += 1;
      run.coins += SMASH_COINS;
      run.stats.coins += SMASH_COINS;
      fx.burst(item.x, 0.8, item.z, 0xffd60a, 14, { speed: 5, up: 5, life: 0.6 });
      fx.burst(item.x, 0.6, item.z, 0xb5a99a, 8, { speed: 4, up: 3 });
      audio.play('smack');
      shake = 0.15;
      vibrate(30);
    }
  }

  function hitObstacles(box) {
    const p = run.p;
    if (run.flying) return;
    if (isActive(run.pu, 'cycle')) { smash(box); return; }
    if (run.invuln > 0) return;
    const live = run.items.filter(({ item }) => item.type === 'obstacle' && !run.hitSet.has(item)).map(({ item }) => item);
    const hit = firstHit(box, live);
    if (hit.result === 'none') return;
    run.hitSet.add(hit.obstacle);
    if (consume(run.pu, 'shield')) {
      run.invuln = 1;
      fx.burst(p.x, 1, run.z, 0xff70a6, 20, { speed: 5, up: 4 });
      ui.flash('Mummy ne bachaya!');
      audio.play('smack');
      vibrate(40);
      return;
    }
    if (hit.result === 'caught') { enterCaught(); return; }
    if (hit.obstacle.kind === 'block') p.lane = run.prevLane;
    run.stumbleT = 0.45;
    shake = 0.3;
    vibrate(70);
    audio.play('stumble');
    fx.burst(p.x, 0.3, run.z, 0xb5a99a, 10, { speed: 3, up: 2 });
    if ((hit.obstacle.name === 'chappal' ? chappalHit : stumble)(run.chaser) === 'caught') { enterCaught(); return; }
    const [shown, spoken] = pick(chaserInfo().taunts);
    ui.flash(shown);
    shout(spoken);
  }

  // Papa's chappal: a warning, then it flies down the lane Beta is in. Dodge, jump or slide; a hit is a stumble
  // (but never the catch by itself, see chappalHit).
  function updateChappals(dt) {
    if (throwDue(run.chaser) || angryThrowDue(run.chaser, -run.z)) {
      run.pendingThrow = THROW_WINDUP;
      run.throwX = LANES[run.p.lane]; // aimed when the warning shows, so reacting to it saves you
      ui.flash(chaserInfo().warn);
      if (!run.throwHinted) { run.throwHinted = true; ui.toast('Red lane = incoming! Change lane, jump or slide'); }
      audio.play('whoosh');
    }
    if (run.pendingThrow > 0 && (run.pendingThrow -= dt) <= 0) {
      // from Papa's hand, or (an angry throw from afar) from just behind the camera; never past the clean-up line at +10
      const item = { type: 'obstacle', name: 'chappal', kind: 'low', x: run.throwX, y: 0.9, z: run.z + Math.min(run.papaZ, 8) - 0.5, w: 0.5, h: 0.35, d: 0.5 };
      const mesh = createProp(chaserInfo().throws);
      scene.add(mesh);
      run.items.push({ item, mesh });
      audio.play('whoosh');
    }
    let from = null, x = 0; // the threat: a throw winding up (from behind the camera) or a chappal not yet past Beta
    if (run.pendingThrow > 0) { from = run.z + 7; x = run.throwX; }
    for (const { item } of run.items) if (item.name === 'chappal' && item.z > run.z - 0.5) { from = item.z; x = item.x; }
    warnLane.visible = from !== null;
    if (from !== null) {
      const to = run.z - 3; // a little past Beta, so it reads as "this lane"
      warnLane.position.set(x, run.ground + 0.03, (from + to) / 2);
      warnLane.scale.y = from - to;
      warnLane.material.opacity = 0.3 + 0.2 * Math.sin(run.t * 22);
    }
    for (const { item, mesh } of run.items) {
      if (item.name !== 'chappal') continue;
      item.z -= (run.speed + CHAPPAL_REL_SPEED) * dt;
      mesh.position.set(item.x, item.y, item.z);
      mesh.rotation.x -= dt * 18;
    }
  }

  // A vehicle Beta just swerved out of the way of, as it goes past: "Bal bal bache!" and a few coins.
  function nearMisses() {
    for (const { item } of run.items) {
      if (item.kind !== 'block' || item.passed || item.z - item.d / 2 < run.z + 0.3) continue;
      item.passed = true;
      if (run.hitSet.has(item) || item.x !== run.dodgeFromX || run.t - run.dodgeT > NEAR_MISS_WINDOW) continue;
      run.coins += NEAR_MISS_COINS;
      run.stats.coins += NEAR_MISS_COINS;
      run.stats.nearMisses += 1;
      ui.toast(`Bal bal bache! +${NEAR_MISS_COINS} 🪙`);
      vibrate(20);
      audio.play('coin');
      fx.burst(run.p.x, 1.2, run.z, 0xffd60a, 10, { speed: 3, up: 3, life: 0.5 });
    }
  }

  // Every 1.5 km: the chaser jumps on a cycle, closes in and throws hard for a few seconds. Escape clean for coins.
  function updateCycleChase() {
    const c = run.chaser;
    if (!run.chasing && -run.z >= run.nextChase && !c.caught) {
      run.nextChase += CHASE_EVERY;
      run.chasing = true;
      startChase(c);
      ui.flash(`🚲 ${chaserInfo().chase}`);
      audio.play('tring');
    } else if (run.chasing && !chaseActive(c)) {
      run.chasing = false;
      if (c.lastStumble === c.chaseFrom) {
        run.coins += CHASE_REWARD;
        run.stats.coins += CHASE_REWARD;
        ui.toast(`😮‍💨 ${chaserInfo().tired} +${CHASE_REWARD} 🪙`);
        audio.play('powerup');
      }
    }
  }

  // Scooters ride towards Beta once he is close (a horn warns first).
  function updateMovers(dt) {
    for (const { item, mesh } of run.items) {
      if (!item.vz || item.z < run.z - 28 || item.z > run.z + 6) continue;
      if (!item.honked) {
        item.honked = true;
        audio.play('horn');
        if (!run.sawScooter) { run.sawScooter = true; ui.toast('🛵 Scooter uncle aa rahe hain! Hato!'); }
      }
      item.z += item.vz * dt;
      mesh.position.z = item.z;
    }
  }

  // Mandir Marg at night (every street in Diwali week): phuljhadi and anaar bursting over the rooftops.
  function fireworks(dt, night) {
    if (night < 0.8 || (run.zone !== 2 && !festival) || (run.fwT = (run.fwT || 0) - dt) > 0) return;
    run.fwT = 1.2 + Math.random() * 2;
    const x = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 10); // low enough to be in a portrait phone's view
    fx.burst(x, 13 + Math.random() * 6, run.z - 50 - Math.random() * 25, pick(FIREWORKS), 36, { speed: 8, up: 3, life: 1.4, gravity: -4, scale: 3 });
    audio.play('firework');
  }

  function updatePlaying(dt) {
    const p = run.p;
    run.dt = dt;
    run.t += dt;
    const zone = zoneAt(run.z);
    if (zone !== run.zone) { run.zone = zone; run.stats.areas += 1; audio.setZone(zone); ui.flash(`📍 ${ZONES[zone].name}`); audio.play('bell'); }
    updateCycleChase();
    if (run.daily && !run.goalHit && -run.z >= run.goal) { run.goalHit = true; ui.flash('🎉 Challenge done!'); audio.play('powerup'); }
    if (-run.z >= (run.milestone + 1) * MILESTONE) { run.milestone += 1; ui.toast(`🏁 ${run.milestone * MILESTONE} m! Shabash!`); }
    audio.setTempo((run.speed - SPEED_START) / (SPEED_MAX - SPEED_START));
    if (run.hint < HINTS.length && run.t >= HINTS[run.hint][0]) ui.hint(HINTS[run.hint++][1]);
    const lvl = speedLevel(run.score / run.mult);
    if (lvl > run.speedLvl) { run.speedLvl = lvl; ui.flash(`⚡ Speed Up! ${lvl + 1}`); audio.play('speedup'); vibrate(30); }
    run.speed = Math.min(speedFor(run.speedLvl), run.speed + SPEED_RAMP * dt);
    const riding = isActive(run.pu, 'cycle');
    if (run.riding && !riding) { fx.burst(p.x, 0.6, run.z, 0xd62828, 14, { speed: 4, up: 3 }); ui.toast('Cycle gayi! Ab paidal bhaago!'); }
    run.riding = riding;
    const dz = run.speed * (riding ? CYCLE_BOOST : 1) * dt;
    run.z -= dz;
    run.scoreDist += dz * run.mult * (isActive(run.pu, 'score2x') ? 2 : 1);
    run.ground = groundAt({ ...getHitbox(p), z: run.z }, run.items.map((it) => it.item));
    updatePlayer(p, dt, run.ground);
    updateRocket(dt);
    updateChaser(run.chaser, dt);
    updateChappals(dt);
    updateMovers(dt);
    const night = skyAt(run.t).night;
    if (night > 0.9) run.stats.night = 1;
    fireworks(dt, night);
    updatePowerups(run.pu, dt);
    run.stumbleT = Math.max(0, run.stumbleT - dt);
    run.invuln = Math.max(0, run.invuln - dt);
    const dust = updateWeather(dt) > 0.3 ? 0x9fc3e6 : 0xc9b79c; // splashes in the rain
    if (p.grounded && !run.wasGrounded) { fx.burst(p.x, p.y + 0.05, run.z, dust, 6, { speed: 2, up: 1, life: 0.4 }); run.squash = 1; }
    else if (p.grounded && Math.random() < dt * (p.sliding ? 30 : 6)) fx.burst(p.x, p.y + 0.05, run.z + 0.3, dust, 1, { speed: 1, up: 1, life: 0.4, gravity: -3 });
    run.wasGrounded = p.grounded;

    spawnItems();
    const box = { ...getHitbox(p), z: run.z };
    collect(box);
    hitObstacles(box);
    if (state !== 'playing') return;
    nearMisses();

    run.stats.distance = Math.floor(-run.z);
    run.score = run.stats.score = Math.floor(run.scoreDist) + run.coins * 10;
    for (const m of progress.liveMissions(run.stats)) { ui.toast(`🎯 Mission done! ${m.text} +🪙${m.reward}`); audio.play('powerup'); }
    ui.setScore(run.score, run.coins, run.mult * (isActive(run.pu, 'score2x') ? 2 : 1));
    const active = listActive(run.pu);
    ui.setPowerups(active);
    for (const a of active) { // tick-tick in the last 3 seconds of a power-up
      const s = Math.ceil(a.left);
      if (s <= 3 && run.ticks[a.name] !== s) { run.ticks[a.name] = s; audio.play('tick'); }
      if (s > 3) delete run.ticks[a.name];
    }
    if (run.t > HEADSTART_WINDOW) ui.setHeadstart(0);
    const glance = run.chaser.distance < CHASER_FAR && Math.sin(run.t * 1.7) > 0.85; // Papa is close: look back now and then
    const pose = run.riding ? 'ride' : run.flying ? 'jump' : run.stumbleT > 0 ? 'stumble' : !p.grounded ? 'jump' : p.sliding ? 'slide' : glance ? 'look' : 'run';
    beta.setMode(pose);
    if (run.rec) record(run.rec, run.t, p.x, p.y, -run.z, pose);
    if (run.ghost && !run.ghostBeat && -run.z > ghostDistance(run.ghost)) { run.ghostBeat = true; ui.toast('👻 You beat your best challenge run!'); audio.play('powerup'); }
    papa.setMode(run.chasing ? 'ride' : 'run');
    run.papaZ = ease(run.papaZ, run.chaser.distance, run.t < 2 ? 1 : 4, dt);
    run.papaX = ease(run.papaX, p.x + (p.x < 0 ? -0.85 : 0.85), 3, dt); // half a lane outside, so he never hides Beta
  }

  function updateCaught(dt) {
    run.caughtT += dt;
    run.papaZ = ease(run.papaZ, 0.7, 6, dt);
    run.papaX = ease(run.papaX, run.p.x + 0.55, 6, dt);
    run.p.y = ease(run.p.y, 0, 10, dt);
    run.jolt = Math.max(0, run.jolt - dt * 6);
    // Each whack lands as the chaser's arm comes down (see SPANK_PERIOD): crack, stars, Beta jolts, the screen shakes.
    const n = Math.floor(run.caughtT / SPANK_PERIOD);
    if (n > run.hits && run.caughtT < CAUGHT_SCENE_TIME - 0.3) {
      run.hits = n;
      audio.play('smack');
      vibrate(35);
      shake = Math.max(shake, 0.18);
      run.jolt = 1;
      run.squash = 1;
      fx.burst(run.p.x, 0.95, run.z + 0.2, 0xffd60a, 7, { speed: 2.5, up: 2.5, life: 0.45, scale: 1.3 });
      if (n % 2) fx.burst(run.p.x, 1.7, run.z - 0.15, 0x6ec6ff, 3, { speed: 1.2, up: 1.5, life: 0.6, gravity: -5, scale: 0.6 }); // tears
      if (n > 1) ui.flash(HIT_WORDS[n % HIT_WORDS.length]);
      if (n === 3) shout('और भागेगा?');
    }
    if (run.caughtT > CAUGHT_SCENE_TIME) {
      const r = finishRun();
      state = 'over';
      ui.showGameOver({ score: run.score, coins: run.coins, best: progress.data.best, isNewBest: r.isNewBest,
        where: `🏁 ${run.stats.distance} m · ${ZONES[run.zone].name}`,
        completed: r.completed, reviveCost: reviveCost(), wallet: progress.data.coins, adAvailable: ads.available && !run.adUsed,
        canShare: !!(navigator.share || navigator.clipboard) });
    }
  }

  // Time of day (+ rain): sky, fog, sun/moon light, streetlights, windows, vehicle lights, wet road.
  function applySky(t, playerZ, clockT, rain = 0, lightning = 0) {
    const s = skyAt(t);
    if (rain > 0) {
      const grey = mix(0x7b8490, 0x1a1e26, s.night);
      s.top = mix(s.top, grey, rain * 0.75);
      s.horizon = mix(s.horizon, grey, rain * 0.7);
      s.sun *= 1 - rain * 0.35;
      s.hemi *= 1 - rain * 0.1;
    }
    scene.fog.color.setHex(s.horizon);
    scene.fog.near = 45 - rain * 20;
    scene.fog.far = 150 - rain * 50;
    sun.color.setHex(s.sunColor);
    sun.intensity = s.sun;
    hemi.intensity = s.hemi + lightning * 2.5;
    hemi.color.lerpColors(HEMI_DAY, HEMI_NIGHT, s.night);
    hemi.groundColor.lerpColors(GROUND_DAY, GROUND_NIGHT, s.night);
    world.setNight(s.night, clockT);
    world.setWet(rain);
    setPropsNight(s.night);
    audio.setNight(s.night);
    audio.setRain(state === 'paused' ? 0 : rain);
    const lit = world.lampLevel();
    lampLights.forEach((l, j) => {
      const lamp = lampForLight(j, LAMP_LIGHTS, playerZ);
      l.position.set(lamp.x * 0.35, LAMP_HEAD_Y - 1.5, lamp.z); // pulled toward the road so walls stay dark
      l.intensity = lit * 22; // never toggle .visible: a changing light count recompiles every shader (a stutter)
    });
    betaLight.intensity = s.night * 9;
    sky.update(camera, s, clockT);
  }

  // Monsoon spell: a heads-up, then lightning + thunder every few seconds while it pours.
  function updateWeather(dt) {
    const rain = rainAt(run.t, run.rainStart);
    if (rain > 0 && !run.rained) { run.rained = true; ui.toast('🌧️ Baarish aa gayi! Sambhal ke!'); }
    if (rain > 0.5) run.stats.rain = 1;
    run.flashT = Math.max(0, run.flashT - dt);
    if (rain > 0.6 && (run.thunderT -= dt) <= 0) {
      run.thunderT = 5 + Math.random() * 7;
      run.flashT = 0.2;
      audio.play('thunder');
    }
    return rain;
  }

  function placeActors(dt) {
    const p = run.p;
    beta.group.position.set(p.x, p.y + run.jolt * 0.1, run.z - run.jolt * 0.15); // jolts forward with each whack
    beta.group.rotation.y = 0;
    run.squash = Math.max(0, (run.squash || 0) - dt * 6); // landing squash
    const q = Math.sin(run.squash * Math.PI) * 0.12;
    beta.group.scale.set(1 + q, 1 - q * 1.4, 1 + q);
    papa.group.position.set(run.papaX, 0, run.z + run.papaZ);
    papa.group.rotation.y = 0;
    bubble.visible = state === 'playing' && (isActive(run.pu, 'shield') || (run.invuln > 0 && Math.floor(run.t * 10) % 2 === 0));
    sun.position.set(p.x + 6, 14, run.z + 4);
    sun.target.position.set(p.x, 0, run.z - 4);
    betaLight.position.set(p.x, p.y + 3, run.z + 2.5);
    const ghost = ghosts[progress.data.hero], g = state === 'playing' ? ghostAt(run.ghost, run.t) : null;
    for (const x of Object.values(ghosts)) x.group.visible = x === ghost && !!g;
    if (g) { ghost.group.position.set(g.x, g.y, -g.d); ghost.setMode(g.mode); ghost.update(dt, run.speed); }
    bike.visible = state === 'playing' && run.riding;
    rocketPack.visible = state === 'playing' && run.flying;
    if (rocketPack.visible) rocketPack.position.set(p.x, p.y + 0.75, run.z + 0.22);
    chaserBike.visible = state === 'playing' && run.chasing;
    if (chaserBike.visible) for (const w of chaserWheels) w.rotation.x -= (dt * run.speed) / 0.32;
    if (bike.visible) for (const w of bikeWheels) w.rotation.x -= (dt * run.speed * CYCLE_BOOST) / 0.32;
    if (state !== 'playing') warnLane.visible = false;
    const caught = state === 'caught' || state === 'over';
    run.floorS = ease(run.floorS, run.flying ? p.y - 1.5 : run.ground, run.flying ? 2.5 : 5, dt); // camera rises with Beta onto a bus roof or the rocket, ignores jumps
    const camTarget = caught
      ? new THREE.Vector3(p.x * 0.4 + 1.2, 2.0, run.z - 4.4 + Math.min(run.caughtT, 2.5) * 0.35) // front, road side, slowly pushing in
      : new THREE.Vector3(p.x * 0.6, 3.2 + run.floorS + (p.y - run.floorS) * 0.3, run.z + 6.5);
    camera.position.lerp(camTarget, Math.min(1, dt * (caught ? 2.5 : run.t < 1.4 ? 3 : 8))); // slow swoop at the start
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt);
    }
    camera.lookAt(p.x * (caught ? 1 : 0.4), caught ? 1.1 + p.y : 1.2 + run.floorS, run.z - (caught ? -0.3 : 6));
    if (!caught) camera.rotateZ((p.x - LANES[p.lane]) * 0.03); // lean into a lane change
    camera.fov = baseFov + ((run.speed - SPEED_START) / (SPEED_MAX - SPEED_START)) * 8; // speed feel
    camera.updateProjectionMatrix();
    speedLines.update(dt, camera, state === 'playing' ? Math.max(0, (run.speed - 20) / (SPEED_MAX - 20)) : 0, run.speed);
    if (world.update(run.z, dt)) audio.play('train');
    if (crows.update(dt, run.z, run.t) && state === 'playing' && Math.random() < 0.5) audio.play('caw');
    const rain = rainAt(run.t, run.rainStart);
    applySky(run.t, run.z, run.t, rain, run.flashT / 0.2);
    rainFx.update(dt, camera, rain, state === 'playing' ? run.speed : 0);
  }

  function menuScene(t) {
    for (const g of Object.values(ghosts)) g.group.visible = false;
    speedLines.update(0, camera, 0, 0);
    beta.setMode('idle');
    papa.setMode('spank');
    bubble.visible = false;
    beta.group.position.set(-0.6, 0, 0);
    beta.group.scale.setScalar(1);
    beta.group.rotation.y = -0.35;
    papa.group.position.set(0.9, 0, 0.8);
    papa.group.rotation.y = 0.35;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
    camera.position.set(Math.sin(t * 0.2) * 0.5, 1.35, camera.aspect > 1 ? -3.6 : -4.6);
    camera.lookAt(0, camera.aspect > 1 ? 1.55 : 1.3, 0);
    sun.position.set(6, 14, 4);
    sun.target.position.set(0, 0, -4);
    betaLight.position.set(0, 3, -2.5);
    applySky(menuTime(new Date().getHours()), 0, t);
    rainFx.update(0, camera, 0, 0);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseFov = w < h ? 72 : 62; // portrait phones need a wider view
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  // Android back button (Capacitor): pause / resume / go home / exit, never a surprise quit mid-run.
  const App = window.Capacitor?.Plugins?.App;
  App?.addListener('backButton', () => {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resume();
    else if (state === 'over') goMenu();
    else if (state === 'menu') App.exitApp();
  });

  let menuT = 0;
  function frame(dt) {
    if (state === 'menu') menuScene((menuT += dt));
    else if (state !== 'paused') {
      if (state === 'playing') updatePlaying(dt);
      else if (state === 'caught') updateCaught(dt);
      placeActors(dt);
    }
    if (state !== 'paused') {
      beta.update(dt, run ? run.speed : 0);
      papa.update(dt, run ? run.speed : 0);
      fx.update(dt);
      for (const { item, mesh } of run ? run.items : []) {
        if (item.type === 'coin') mesh.rotation.y += dt * 4;
        else if (item.type === 'powerup') { mesh.rotation.y += dt * 2; mesh.position.y = item.y - 0.4 + Math.sin(run.t * 4) * 0.1; }
        else if (item.name === 'dog') mesh.scale.y = 1 + Math.sin(run.t * 2.5) * 0.05; // snoring
      }
    }
    renderer.render(scene, camera);
  }

  // Adaptive quality: if the phone averages under ~45 fps for 3 s, step down (sharpness, then shadows + real lamp lights).
  let perfT = 0, perfFrames = 0, quality = 2;
  function watchPerf(rawDt) {
    perfT += rawDt; perfFrames += 1;
    if (perfT < 3) return;
    const slow = perfT / perfFrames > 1 / 45;
    perfT = 0; perfFrames = 0;
    if (!slow || quality === 0) return;
    quality -= 1;
    if (quality === 1) renderer.setPixelRatio(1);
    else {
      renderer.shadowMap.type = THREE.BasicShadowMap; sun.shadow.mapSize.set(512, 512); sun.shadow.map?.dispose(); sun.shadow.map = null;
      for (const l of lampLights) l.visible = false; // glow decals still show the lamps; shaders recompile once, here
    }
    resize();
  }

  // Compile every shader up front (all areas, obstacles, rain, particles: hidden ones too), not the first time one
  // shows up mid-run, which stutters on phones.
  const warm = new THREE.Group();
  for (const v of world.variants) warm.add(v.clone());
  for (const name of PROP_NAMES) warm.add(addHeadlights(createProp(name), name));
  scene.add(warm);
  renderer.compile(scene, camera);
  scene.remove(warm);

  const clock = new THREE.Clock();
  goMenu();
  const daily = progress.dailyStatus(today());
  const showDaily = () => { if (daily.available) ui.showDaily(daily.streak, daily.reward); };
  let newsSeen = true;
  try { newsSeen = storage?.getItem('bbb-news') === VERSION; storage?.setItem('bbb-news', VERSION); } catch { /* blocked */ }
  if (!newsSeen && progress.data.tutorialDone) ui.showNews(NEWS, showDaily); // returning players only
  else showDaily();
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    if (state === 'playing' && raw < 0.5) watchPerf(raw); // ignore tab-switch gaps
    frame(Math.min(raw, 1 / 30));
  });

  // Dev hooks: #play skips the menu, #debug exposes a stepper for automated checks.
  if (location.hash.includes('play')) begin();
  if (location.hash.includes('debug')) {
    window.bbb = { frame, onAction, begin, revive, watchAd, setAds: (a) => { ads = a; }, get state() { return state; }, get run() { return run; }, progress, renderer, scene, camera };
  }
}
