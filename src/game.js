import * as THREE from '../vendor/three.module.js';
import { SPEED_START, SPEED_MAX, SPEED_RAMP, LANES } from './config.js';
import { createPlayer, applyAction, updatePlayer, getHitbox } from './player.js';
import { aabbOverlap, firstHit, groundAt } from './collision.js';
import { createSpawner, spawnUntil } from './spawner.js';
import { createChaser, stumble, catchNow, updateChaser, throwDue } from './chaser.js';
import { createStickman } from './stickman.js';
import { createProp } from './props.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { createFx } from './fx.js';
import { createAds } from './ads.js';
import { createProgress, SKINS } from './progress.js';
import { createPowerups, activate, updatePowerups, isActive, consume, listActive, POWERUP_LABEL, POWERUP_TIME } from './powerups.js';

const CAUGHT_SCENE_TIME = 2.2;
const THROW_WINDUP = 0.55, CHAPPAL_REL_SPEED = 6; // warning time, and how much faster than Beta it flies
const SKY = [new THREE.Color(0x9bd4ff), new THREE.Color(0xffb37a), new THREE.Color(0x8a78c0)]; // day, sunset, dusk
const CYCLE = 3000; // metres per day/sunset/dusk loop
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
  scene.background = SKY[0].clone();
  scene.fog = new THREE.Fog(SKY[0].getHex(), 45, 150);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 250);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  scene.add(hemi, sun, sun.target);

  const beta = createStickman('beta');
  const papa = createStickman('papa');
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xff70a6, emissive: 0xff70a6, emissiveIntensity: 0.4, transparent: true, opacity: 0.22, depthWrite: false }));
  bubble.position.y = 0.95;
  beta.group.add(bubble);
  scene.add(beta.group, papa.group);

  const world = createWorld(scene, 1);
  const fx = createFx(scene);
  const progress = createProgress(storage);
  const audio = createAudio();
  let ads = createAds();
  audio.setMuted(progress.data.muted);
  const applySkin = () => { const s = SKINS[progress.data.skin]; beta.setColors(s.cap, s.bag); };
  applySkin();

  let state = 'menu', run = null, shake = 0, baseFov = 62;
  const vibrate = (ms) => { if (progress.data.vibrate) try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  const ui = createUI(uiRoot, {
    onStart: begin, onRestart: begin, onPause: pauseGame, onResume: resume, onRevive: () => revive(false), onWatchAd: watchAd,
    onHome() { if (state === 'paused') finishRun(); goMenu(); },
    onSound() { progress.setSetting('muted', !progress.data.muted); audio.setMuted(progress.data.muted); ui.setSettings(progress.data); },
    onVibrate() { progress.setSetting('vibrate', !progress.data.vibrate); ui.setSettings(progress.data); vibrate(40); },
    onShop: () => ui.showShop(SKINS, progress.data, upgradeList()),
    onUpgrade(name) {
      if (progress.upgrade(name)) audio.play('powerup');
      ui.showShop(SKINS, progress.data, upgradeList());
      ui.setWallet(progress.data.coins);
    },
    onSkin(id) {
      if (progress.select(id) || progress.buy(id)) { applySkin(); audio.play('powerup'); }
      ui.showShop(SKINS, progress.data, upgradeList());
      ui.setWallet(progress.data.coins);
    },
    onMissions: () => ui.showMissions(progress.data.missions, progress.multiplier()),
    onClaimDaily() { progress.claimDaily(today()); ui.setWallet(progress.data.coins); audio.play('powerup'); },
  });
  ui.setSettings(progress.data);
  const upgradeList = () => Object.keys(POWERUP_TIME).map((name) => ({
    name, label: POWERUP_LABEL[name], level: progress.upgradeLevel(name), cost: progress.upgradeCost(name), secs: progress.powerupTime(name),
  }));

  function clearItems() {
    if (run) for (const it of run.items) scene.remove(it.mesh);
    fx.clear();
    world.reset();
  }

  function begin() {
    clearItems();
    run = {
      p: createPlayer(), z: 0, speed: SPEED_START, prevLane: 1, t: 0, hint: 0,
      spawner: createSpawner((Math.random() * 1e9) | 0), chaser: createChaser(), pu: createPowerups(),
      items: [], hitSet: new Set(), coins: 0, committed: 0, score: 0, stumbleT: 0, invuln: 0,
      caughtT: 0, smackT: 0, papaZ: 3, papaX: 0, ground: 0, floorS: 0, pendingThrow: 0, revives: 0, adUsed: false, mult: progress.multiplier(), wasGrounded: true,
      stats: { score: 0, coins: 0, distance: 0, jumps: 0, slides: 0, powerups: 0, dodges: 0 },
    };
    if (progress.data.tutorialDone) run.hint = HINTS.length;
    state = 'playing';
    beta.setMode('run');
    ui.showHUD();
    ui.setScore(0, 0, run.mult);
    ui.setPowerups([]);
    ui.flash('Bhaag!');
    audio.startMusic();
    ads.preload(); // so the "watch ad" revive is instant at game over
  }

  function goMenu() {
    clearItems();
    run = null;
    state = 'menu';
    audio.stopMusic();
    ui.showMenu({ best: progress.data.best, wallet: progress.data.coins });
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    audio.stopMusic();
    ui.showPause();
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
    return progress.finishRun(run.stats);
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

  function enterCaught() {
    catchNow(run.chaser);
    state = 'caught';
    run.caughtT = 0;
    beta.setMode('caught');
    papa.setMode('spank');
    ui.flash('Pakda!');
    audio.stopMusic();
    for (const { item, mesh } of run.items) if (item.z < run.z + 2 && item.z > run.z - 9) mesh.visible = false; // clear the stage
    vibrate(250);
    shake = 0.5;
  }

  function onAction(action) {
    if (state !== 'playing') return;
    const p = run.p, wasGrounded = p.grounded;
    if (action === 'left' || action === 'right') run.prevLane = p.lane;
    if (!applyAction(p, action)) return;
    if (action === 'left' || action === 'right') run.stats.dodges += 1;
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
      const mesh = createProp(item.type === 'obstacle' ? item.name : item.type === 'coin' ? 'coin' : item.name);
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
        audio.play('coin');
      } else {
        activate(run.pu, item.name, progress.powerupTime(item.name));
        run.stats.powerups += 1;
        fx.burst(item.x, item.y + 0.4, item.z, 0xff70a6, 16, { speed: 4, up: 4 });
        ui.toast(POWERUP_LABEL[item.name] + '!');
        audio.play('powerup');
      }
      return false;
    });
  }

  function hitObstacles(box) {
    const p = run.p;
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
    if (stumble(run.chaser) === 'caught') { enterCaught(); return; }
    ui.flash('Ruk ja!');
  }

  // Papa's chappal: a warning, then it flies down the lane Beta is in. Dodge, jump or slide; a hit is a stumble
  // (and so right after one, Pakda!).
  function updateChappals(dt) {
    if (throwDue(run.chaser)) {
      run.pendingThrow = THROW_WINDUP;
      run.throwX = LANES[run.p.lane]; // aimed when the warning shows, so reacting to it saves you
      ui.flash('⚠️ Chappal aayi!');
      audio.play('whoosh');
    }
    if (run.pendingThrow > 0 && (run.pendingThrow -= dt) <= 0) {
      const item = { type: 'obstacle', name: 'chappal', kind: 'low', x: run.throwX, y: 0.9, z: run.z + run.papaZ - 0.5, w: 0.5, h: 0.35, d: 0.5 };
      const mesh = createProp('chappal');
      scene.add(mesh);
      run.items.push({ item, mesh });
    }
    for (const { item, mesh } of run.items) {
      if (item.name !== 'chappal') continue;
      item.z -= (run.speed + CHAPPAL_REL_SPEED) * dt;
      mesh.position.set(item.x, item.y, item.z);
      mesh.rotation.x -= dt * 18;
    }
  }

  function updatePlaying(dt) {
    const p = run.p;
    run.dt = dt;
    run.t += dt;
    if (run.hint < HINTS.length && run.t >= HINTS[run.hint][0]) ui.hint(HINTS[run.hint++][1]);
    run.speed = Math.min(SPEED_MAX, run.speed + SPEED_RAMP * dt);
    run.z -= run.speed * dt;
    run.ground = groundAt({ ...getHitbox(p), z: run.z }, run.items.map((it) => it.item));
    updatePlayer(p, dt, run.ground);
    updateChaser(run.chaser, dt);
    updateChappals(dt);
    updatePowerups(run.pu, dt);
    run.stumbleT = Math.max(0, run.stumbleT - dt);
    run.invuln = Math.max(0, run.invuln - dt);
    if (p.grounded && !run.wasGrounded) fx.burst(p.x, p.y + 0.05, run.z, 0xc9b79c, 6, { speed: 2, up: 1, life: 0.4 });
    else if (p.grounded && Math.random() < dt * (p.sliding ? 30 : 6)) fx.burst(p.x, p.y + 0.05, run.z + 0.3, 0xc9b79c, 1, { speed: 1, up: 1, life: 0.4, gravity: -3 });
    run.wasGrounded = p.grounded;

    spawnItems();
    const box = { ...getHitbox(p), z: run.z };
    collect(box);
    hitObstacles(box);
    if (state !== 'playing') return;

    run.stats.distance = Math.floor(-run.z);
    run.score = run.stats.score = Math.floor(-run.z * run.mult) + run.coins * 10;
    for (const m of progress.liveMissions(run.stats)) { ui.toast(`🎯 Mission done: ${m.text}`); audio.play('powerup'); }
    ui.setScore(run.score, run.coins, run.mult);
    ui.setPowerups(listActive(run.pu));
    beta.setMode(run.stumbleT > 0 ? 'stumble' : !p.grounded ? 'jump' : p.sliding ? 'slide' : 'run');
    papa.setMode('run');
    run.papaZ = ease(run.papaZ, run.chaser.distance, run.t < 2 ? 1 : 4, dt);
    run.papaX = ease(run.papaX, p.x + (p.x < 0 ? -0.85 : 0.85), 3, dt); // half a lane outside, so he never hides Beta
  }

  function updateCaught(dt) {
    run.caughtT += dt;
    run.papaZ = ease(run.papaZ, 0.7, 6, dt);
    run.papaX = ease(run.papaX, run.p.x + 0.55, 6, dt);
    run.p.y = ease(run.p.y, 0, 10, dt);
    run.smackT -= dt;
    if (run.caughtT > 0.5 && run.smackT <= 0) {
      run.smackT = 0.32;
      audio.play('smack');
      fx.burst(run.p.x, 1.6, run.z, 0xffd60a, 5, { speed: 2, up: 3, life: 0.5, scale: 1.4 });
    }
    if (run.caughtT > CAUGHT_SCENE_TIME) {
      const r = finishRun();
      state = 'over';
      ui.showGameOver({ score: run.score, coins: run.coins, best: progress.data.best, isNewBest: r.isNewBest,
        completed: r.completed, reviveCost: reviveCost(), wallet: progress.data.coins, adAvailable: ads.available && !run.adUsed });
    }
  }

  const skyTmp = new THREE.Color();
  function placeActors(dt) {
    const p = run.p;
    beta.group.position.set(p.x, p.y, run.z);
    beta.group.rotation.y = 0;
    papa.group.position.set(run.papaX, 0, run.z + run.papaZ);
    papa.group.rotation.y = 0;
    bubble.visible = state === 'playing' && (isActive(run.pu, 'shield') || (run.invuln > 0 && Math.floor(run.t * 10) % 2 === 0));
    sun.position.set(p.x + 6, 14, run.z + 4);
    sun.target.position.set(p.x, 0, run.z - 4);
    const caught = state === 'caught' || state === 'over';
    run.floorS = ease(run.floorS, run.ground, 5, dt); // camera rises with Beta onto a bus roof, ignores jumps
    const camTarget = caught
      ? new THREE.Vector3(p.x * 0.4 + 1.2, 2.0, run.z - 4.4) // front, road side: never inside buildings
      : new THREE.Vector3(p.x * 0.6, 3.2 + run.floorS + (p.y - run.floorS) * 0.3, run.z + 6.5);
    camera.position.lerp(camTarget, Math.min(1, dt * (caught ? 2.5 : 8)));
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt);
    }
    camera.lookAt(p.x * (caught ? 1 : 0.4), caught ? 1.1 + p.y : 1.2 + run.floorS, run.z - (caught ? -0.3 : 6));
    camera.fov = baseFov + ((run.speed - SPEED_START) / (SPEED_MAX - SPEED_START)) * 8; // speed feel
    camera.updateProjectionMatrix();
    // Day -> sunset -> dusk -> day as you run.
    const c = ((-run.z % CYCLE) / CYCLE) * 3, i = Math.floor(c) % 3;
    skyTmp.lerpColors(SKY[i], SKY[(i + 1) % 3], c - Math.floor(c));
    scene.background.copy(skyTmp);
    scene.fog.color.copy(skyTmp);
    hemi.intensity = 1.1 - (i === 2 || (i === 1 && c % 1 > 0.5) ? 0.25 : 0);
    world.update(run.z);
  }

  function menuScene(t) {
    beta.setMode('idle');
    papa.setMode('spank');
    bubble.visible = false;
    beta.group.position.set(-0.6, 0, 0);
    beta.group.rotation.y = -0.35;
    papa.group.position.set(0.9, 0, 0.8);
    papa.group.rotation.y = 0.35;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
    camera.position.set(Math.sin(t * 0.2) * 0.5, 1.35, camera.aspect > 1 ? -3.6 : -4.6);
    camera.lookAt(0, camera.aspect > 1 ? 1.55 : 1.3, 0);
    scene.background.copy(SKY[0]);
    scene.fog.color.copy(SKY[0]);
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
      }
    }
    renderer.render(scene, camera);
  }

  // Adaptive quality: if the phone averages under ~45 fps for 3 s, step down (sharpness, then shadows).
  let perfT = 0, perfFrames = 0, quality = 2;
  function watchPerf(rawDt) {
    perfT += rawDt; perfFrames += 1;
    if (perfT < 3) return;
    const slow = perfT / perfFrames > 1 / 45;
    perfT = 0; perfFrames = 0;
    if (!slow || quality === 0) return;
    quality -= 1;
    if (quality === 1) renderer.setPixelRatio(1);
    else { renderer.shadowMap.type = THREE.BasicShadowMap; sun.shadow.mapSize.set(512, 512); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    resize();
  }

  const clock = new THREE.Clock();
  goMenu();
  const daily = progress.dailyStatus(today());
  if (daily.available) ui.showDaily(daily.streak, daily.reward);
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    if (state === 'playing' && raw < 0.5) watchPerf(raw); // ignore tab-switch gaps
    frame(Math.min(raw, 1 / 30));
  });

  // Dev hooks: #play skips the menu, #debug exposes a stepper for automated checks.
  if (location.hash.includes('play')) begin();
  if (location.hash.includes('debug')) {
    window.bbb = { frame, onAction, begin, revive, watchAd, setAds: (a) => { ads = a; }, get state() { return state; }, get run() { return run; }, progress };
  }
}
