import * as THREE from '../vendor/three.module.js';
import { SPEED_START, SPEED_MAX, SPEED_RAMP, CHASER_FAR } from './config.js';
import { createPlayer, applyAction, updatePlayer, getHitbox } from './player.js';
import { aabbOverlap, firstHit } from './collision.js';
import { createSpawner, spawnUntil } from './spawner.js';
import { createChaser, stumble, catchNow, updateChaser } from './chaser.js';
import { createStickman } from './stickman.js';
import { createProp } from './props.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';

const SKY = 0x9bd4ff;
const CAUGHT_SCENE_TIME = 2.2;

const loadBest = () => { try { return Number(localStorage.getItem('bbb-best')) || 0; } catch { return 0; } };
const saveBest = (v) => { try { localStorage.setItem('bbb-best', String(v)); } catch { /* private mode */ } };
const ease = (cur, target, rate, dt) => cur + (target - cur) * Math.min(1, dt * rate);

export function startGame(canvas, uiRoot) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 45, 150);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 250);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  scene.add(sun, sun.target);

  const beta = createStickman('beta');
  const papa = createStickman('papa');
  scene.add(beta.group, papa.group);

  let world = createWorld(scene, 1);
  let state = 'menu';
  let best = loadBest();
  let run = null;

  const ui = createUI(uiRoot, { onStart: begin, onRestart: begin });

  function clearRun() {
    if (run) for (const it of run.items) scene.remove(it.mesh);
    for (const s of world.segments) scene.remove(s);
    world = createWorld(scene, (Math.random() * 1e9) | 0);
  }

  function begin() {
    clearRun();
    run = {
      p: createPlayer(), z: 0, speed: SPEED_START, prevLane: 1,
      spawner: createSpawner((Math.random() * 1e9) | 0), chaser: createChaser(),
      items: [], hitSet: new Set(), coins: 0, score: 0, stumbleT: 0, caughtT: 0,
      papaZ: CHASER_FAR, papaX: 0, overShown: false,
    };
    state = 'playing';
    ui.showHUD();
    ui.setScore(0, 0);
    ui.flash('Bhaag!');
  }

  function enterCaught() {
    catchNow(run.chaser);
    state = 'caught';
    run.caughtT = 0;
    beta.setMode('caught');
    papa.setMode('spank');
    ui.flash('Pakda!');
  }

  createInput(window, (action) => {
    if (state !== 'playing') return;
    if (action === 'left' || action === 'right') run.prevLane = run.p.lane;
    applyAction(run.p, action);
  });

  function updatePlaying(dt) {
    const p = run.p;
    run.speed = Math.min(SPEED_MAX, run.speed + SPEED_RAMP * dt);
    run.z -= run.speed * dt;
    updatePlayer(p, dt);
    updateChaser(run.chaser, dt);
    run.stumbleT = Math.max(0, run.stumbleT - dt);

    for (const item of spawnUntil(run.spawner, run.z)) {
      const mesh = createProp(item.type === 'coin' ? 'coin' : item.name);
      mesh.position.set(item.x, item.type === 'coin' ? item.y - 0.3 : 0, item.z);
      scene.add(mesh);
      run.items.push({ item, mesh });
    }
    run.items = run.items.filter(({ item, mesh }) => {
      if (item.z - item.d / 2 <= run.z + 10) return true;
      scene.remove(mesh);
      return false;
    });

    const box = { ...getHitbox(p), z: run.z };
    run.items = run.items.filter(({ item, mesh }) => {
      if (item.type !== 'coin' || !aabbOverlap(box, item)) return true;
      scene.remove(mesh);
      run.coins += 1;
      return false;
    });
    const live = run.items.filter(({ item }) => item.type === 'obstacle' && !run.hitSet.has(item)).map(({ item }) => item);
    const hit = firstHit(box, live);
    if (hit.result === 'caught') { enterCaught(); return; }
    if (hit.result === 'stumble') {
      run.hitSet.add(hit.obstacle);
      if (hit.obstacle.kind === 'block') p.lane = run.prevLane;
      run.stumbleT = 0.45;
      if (stumble(run.chaser) === 'caught') { enterCaught(); return; }
      ui.flash('Ruk ja!');
    }

    run.score = Math.floor(-run.z) + run.coins * 10;
    ui.setScore(run.score, run.coins);
    beta.setMode(run.stumbleT > 0 ? 'stumble' : !p.grounded ? 'jump' : p.sliding ? 'slide' : 'run');
    papa.setMode('run');
    run.papaZ = ease(run.papaZ, run.chaser.distance, 4, dt);
    run.papaX = ease(run.papaX, p.x, 3, dt);
  }

  function updateCaught(dt) {
    run.caughtT += dt;
    run.papaZ = ease(run.papaZ, 0.7, 6, dt);
    run.papaX = ease(run.papaX, run.p.x, 6, dt);
    run.p.y = ease(run.p.y, 0, 10, dt);
    if (run.caughtT > CAUGHT_SCENE_TIME && !run.overShown) {
      run.overShown = true;
      const isNewBest = run.score > best;
      if (isNewBest) { best = run.score; saveBest(best); }
      ui.showGameOver(run.score, run.coins, best, isNewBest);
    }
  }

  function placeActors(dt) {
    const p = run.p;
    beta.group.position.set(p.x, p.y, run.z);
    beta.group.rotation.y = 0;
    papa.group.position.set(run.papaX, 0, run.z + run.papaZ);
    papa.group.rotation.y = 0;
    sun.position.set(p.x + 6, 14, run.z + 4);
    sun.target.position.set(p.x, 0, run.z - 4);
    const caught = state === 'caught';
    const camTarget = caught
      ? new THREE.Vector3(p.x + 3.2, 2.2, run.z - 3.5)
      : new THREE.Vector3(p.x * 0.6, 3.2 + p.y * 0.3, run.z + 6.5);
    camera.position.lerp(camTarget, Math.min(1, dt * (caught ? 2.5 : 8)));
    camera.lookAt(p.x * (caught ? 1 : 0.4), caught ? 1 : 1.2, run.z - (caught ? 0 : 6));
    world.update(run.z);
  }

  function menuScene(t) {
    beta.setMode('idle');
    papa.setMode('spank');
    beta.group.position.set(-0.6, 0, 0);
    beta.group.rotation.y = -0.35;
    papa.group.position.set(0.9, 0, 0.8);
    papa.group.rotation.y = 0.35;
    camera.position.set(Math.sin(t * 0.2) * 0.6, 1.9, -4.6);
    camera.lookAt(0, 1.1, 0);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 72 : 62; // portrait phones need a wider view
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  ui.showMenu(best);
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    if (state === 'menu') menuScene(clock.elapsedTime);
    else {
      if (state === 'playing') updatePlaying(dt);
      else updateCaught(dt);
      placeActors(dt);
    }
    beta.update(dt, run ? run.speed : 0);
    papa.update(dt, run ? run.speed : 0);
    for (const { item, mesh } of run ? run.items : []) if (item.type === 'coin') mesh.rotation.y += dt * 4;
    renderer.render(scene, camera);
  });
}
