// Muqabla (live races): everyone in a room runs the same seeded street at the same time and sees the others as ghosts.
// Transport: MQTT (QoS 0) over WebSocket through a public broker, so there is no server of our own to run or pay for.
// ponytail: free public test brokers. No uptime promise and no auth (anyone could read or fake a room's messages),
// which is fine for a casual race. Point BROKERS at a broker of your own (HiveMQ Cloud / EMQX free tier) when players grow;
// a private broker wants a username and password, which mqtt.connect below does not send yet.
import { VERSION } from './config.js';
import { cleanName } from './share.js';

export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081']; // tried in order; everyone lands on the first that answers
const TOPIC = `bbb/${VERSION}/`; // per game version: a seed only gives the same street on the same version
const LOBBY = `${TOPIC}lobby`;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I: codes get read out loud
export const cleanCode = (s) => { const c = String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 4 ? c : ''; };
export const MAX_RIVALS = 3;

// --- The few MQTT 3.1.1 packets a QoS 0 client needs ---
const enc = new TextEncoder(), dec = new TextDecoder();
const str = (s) => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
function packet(type, body) {
  const len = [];
  let n = body.length;
  do { const b = n % 128; n = Math.floor(n / 128); len.push(n ? b | 128 : b); } while (n);
  return Uint8Array.from([type, ...len, ...body]);
}
export const mqtt = {
  connect: (clientId) => packet(0x10, [...str('MQTT'), 4, 2, 0, 30, ...str(clientId)]), // clean session, 30 s keep-alive
  subscribe: (topic) => packet(0x82, [0, 1, ...str(topic), 0]),
  unsubscribe: (topic) => packet(0xa2, [0, 2, ...str(topic)]),
  publish: (topic, text) => packet(0x30, [...str(topic), ...enc.encode(text)]),
  ping: () => packet(0xc0, []),
};
// Splits a byte stream into [[type, body], ...] and the unfinished rest (packets need not line up with WebSocket frames).
export function parse(buf) {
  const out = [];
  for (;;) {
    let i = 1, len = 0, mul = 1, b;
    do { if (i >= buf.length) return [out, buf]; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
    if (buf.length < i + len) return [out, buf];
    out.push([buf[0] & 0xf0, buf.subarray(i, i + len)]);
    buf = buf.subarray(i + len);
  }
}
// A PUBLISH body -> [topic, text].
export function readPublish(body) {
  const n = (body[0] << 8) | body[1];
  return [dec.decode(body.subarray(2, 2 + n)), dec.decode(body.subarray(2 + n))];
}

const num = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

// on: { room(), go(seed), noMatch(), down() }. tick = ms per step (tests run it fast).
export function createNet({ name, on, WS = globalThis.WebSocket, urls = BROKERS, tick = 300, rand = Math.random }) {
  const code = (n) => Array.from({ length: n }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
  const id = code(8), peers = new Map();
  let ws = null, up = false, buf = new Uint8Array(0), pending = [], timer = null;
  let phase = 'idle', room = null, me = null, raceN = 0, t = 0, since = 0; // phase: idle | seek | lobby | race

  const send = (bytes) => { if (up) try { ws.send(bytes); } catch { /* closing */ } };
  // Nicknames go only to rooms joined by code (friends). A random match never sends or shows what a stranger typed.
  const pub = (topic, msg) => send(mqtt.publish(topic, JSON.stringify({ ...msg, id, name: room && !room.quick ? name : undefined })));
  const roomTopic = () => `${TOPIC}r/${room.code}`;
  const open = (fn) => { if (up) fn(); else { pending.push(fn); if (!ws) dial(0); } };

  function dial(i) {
    if (i >= urls.length) { ws = null; pending = []; stop(); on.down?.(); return; }
    let ok = false;
    const s = ws = new WS(urls[i], 'mqtt');
    s.binaryType = 'arraybuffer';
    const giveUp = setTimeout(() => { if (!ok) s.close(); }, 6000);
    giveUp.unref?.();
    s.onopen = () => s.send(mqtt.connect(`bbb-${id}`));
    s.onmessage = (e) => {
      const [packets, rest] = parse(Uint8Array.from([...buf, ...new Uint8Array(e.data)]));
      buf = rest;
      for (const [type, body] of packets) {
        if (type === 0x20 && body[1] === 0) { ok = up = true; clearTimeout(giveUp); for (const fn of pending.splice(0)) fn(); }
        else if (type === 0x30) {
          const [topic, text] = readPublish(body);
          try { onMsg(topic, JSON.parse(text)); } catch { /* not ours */ }
        }
      }
    };
    s.onclose = () => {
      clearTimeout(giveUp);
      if (s !== ws) return; // we closed it ourselves
      up = false; buf = new Uint8Array(0);
      if (!ok) { dial(i + 1); return; }
      ws = null;
      for (const p of peers.values()) p.over = true; // their last known distance stands
      stop();
      on.down?.();
    };
  }

  function stop() { clearInterval(timer); timer = null; phase = 'idle'; }
  function run() { if (!timer) { timer = setInterval(step, tick); timer.unref?.(); } } // unref: never keeps a Node test run alive

  function seek() {
    if (room) send(mqtt.unsubscribe(roomTopic()));
    room = null; peers.clear(); phase = 'seek'; since = t;
    run();
    open(() => { send(mqtt.subscribe(LOBBY)); pub(LOBBY, { t: 'seek' }); });
  }
  function enter(c, host, quick) {
    if (phase === 'seek') send(mqtt.unsubscribe(LOBBY));
    if (room) send(mqtt.unsubscribe(roomTopic()));
    room = { code: c, host, quick, started: false }; peers.clear(); phase = 'lobby'; since = t;
    run();
    open(() => { send(mqtt.subscribe(roomTopic())); pub(roomTopic(), { t: 'hi' }); });
    on.room?.();
  }
  function race(seed) {
    phase = 'race'; room.started = true; me = { d: 0, x: 0, y: 0, m: 0, over: false };
    for (const p of peers.values()) Object.assign(p, { n: raceN, d: 0, x: 0, y: 0, m: 0, over: false, seen: t });
    on.go?.(seed);
  }
  function start() {
    if (!room?.host || phase !== 'lobby' || !peers.size) return;
    raceN += 1;
    const seed = Math.floor(rand() * 0xffffffff);
    pub(roomTopic(), { t: 'go', seed, n: raceN });
    race(seed);
  }

  // Every `tick`: beacons while waiting, my state while racing, and time-outs for whoever went quiet.
  function step() {
    t += 1;
    if (t % 60 === 0) send(mqtt.ping());
    if (phase === 'seek') {
      if (t % 6 === 0) pub(LOBBY, { t: 'seek' });
      if (t - since > 40) { send(mqtt.unsubscribe(LOBBY)); stop(); on.noMatch?.(); } // ~12 s and nobody is looking
    } else if (phase === 'lobby') {
      if (t % 6 === 0) pub(roomTopic(), { t: 'hi' });
      let gone = false;
      for (const [k, p] of peers) if (t - p.seen > 20) { peers.delete(k); gone = true; }
      if (gone) on.room?.();
      if (room.quick && !room.started && t - since > 30) seek(); // the matched player never showed up
    } else if (phase === 'race') {
      if (!me.over || t % 3 === 0) pub(roomTopic(), { t: 's', n: raceN, ...me });
      for (const p of peers.values()) if (p.n === raceN && t - p.seen > 26) p.over = true; // ~8 s silent = dropped out
    }
  }

  function onMsg(topic, m) {
    if (!m || typeof m.id !== 'string' || m.id === id || m.id.length > 16) return;
    if (topic === LOBBY) {
      if (phase !== 'seek') return;
      if (m.t === 'seek' && id < m.id) { const c = code(4); pub(LOBBY, { t: 'match', to: m.id, room: c }); enter(c, true, true); }
      else if (m.t === 'match' && m.to === id && cleanCode(m.room)) enter(cleanCode(m.room), false, true);
      return;
    }
    if (!room || topic !== roomTopic()) return;
    if (m.t === 'bye') {
      const p = peers.get(m.id);
      if (!p) return;
      if (phase === 'race' && p.n === raceN) p.over = true; else { peers.delete(m.id); on.room?.(); }
      return;
    }
    let p = peers.get(m.id);
    if (!p) {
      if (peers.size >= MAX_RIVALS) return; // room is full
      peers.set(m.id, p = { id: m.id, n: -1, d: 0, x: 0, y: 0, m: 0, over: false });
    }
    const isNew = p.name === undefined, racing = m.t === 's' && m.n === raceN;
    p.name = room.quick ? 'Khiladi' : cleanName(m.name) || 'Dost';
    if (phase !== 'race' || racing) p.seen = t; // in a race only race news counts: someone stuck in the last race times out
    if (isNew) on.room?.();
    if (m.t === 'hi' && room.quick && room.host && phase === 'lobby' && !room.started) start(); // quick match: go as soon as both are in
    else if (m.t === 'go' && !room.host && (phase === 'lobby' || me?.over) && Number.isFinite(m.seed) && m.n > raceN) { raceN = m.n; race(m.seed >>> 0); }
    else if (racing && phase === 'race' && !p.over) {
      Object.assign(p, { n: raceN, d: num(m.d, 0, 1e6), x: num(m.x, -3, 3), y: num(m.y, 0, 12), m: num(m.m | 0, 0, 3), over: m.over === true });
    }
  }

  return {
    id,
    quick: seek,
    host: () => enter(code(4), true, false),
    join: (c) => enter(c, false, false),
    start,
    state(s) { if (phase === 'race') me = s; }, // my latest { d, x, y, m, over }; step() sends it
    lobby() { if (phase === 'race') { phase = 'lobby'; since = t; for (const p of peers.values()) p.seen = t; } }, // back to the room after a race
    rivals: () => [...peers.values()].filter((p) => p.n === raceN),
    room: () => room && { ...room, phase, players: [...peers.values()].map((p) => p.name) },
    leave() {
      if (room) pub(roomTopic(), { t: 'bye' });
      const s = ws;
      ws = null; up = false; pending = []; room = null; peers.clear();
      stop();
      try { s?.close(); } catch { /* already closed */ }
    },
  };
}
