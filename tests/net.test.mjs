import test from 'node:test';
import assert from 'node:assert/strict';
import { createNet, mqtt, parse, readPublish, cleanCode } from '../src/net.js';

// An in-memory MQTT broker: just enough to fan PUBLISHes out to subscribers.
function hub() {
  const clients = new Set();
  return class FakeWS {
    constructor() { this.subs = new Set(); clients.add(this); FakeWS.last = this; setTimeout(() => this.onopen?.(), 0); }
    deliver(bytes) { setTimeout(() => this.onmessage?.({ data: bytes.buffer }), 0); }
    send(bytes) {
      for (const [type, body] of parse(bytes)[0]) {
        if (type === 0x10) this.deliver(Uint8Array.from([0x20, 2, 0, 0]));
        else if (type === 0x80) this.subs.add(readPublish(body.subarray(2, body.length - 1))[0]);
        else if (type === 0xa0) this.subs.delete(readPublish(body.subarray(2))[0]);
        else if (type === 0x30) { const [topic, text] = readPublish(body); for (const c of clients) if (c.subs.has(topic)) c.deliver(mqtt.publish(topic, text)); }
      }
    }
    close() { clients.delete(this); setTimeout(() => this.onclose?.(), 0); }
  };
}
const until = async (ok, what) => { for (let i = 0; i < 400; i++) { if (ok()) return; await new Promise((r) => setTimeout(r, 5)); } assert.fail(`timed out: ${what}`); };
const player = (WS, name) => {
  const ev = { seeds: [], rooms: 0, noMatch: 0, down: 0 };
  const net = createNet({ name, WS, tick: 5, on: { go: (s) => ev.seeds.push(s), room: () => { ev.rooms += 1; }, noMatch: () => { ev.noMatch += 1; }, down: () => { ev.down += 1; } } });
  return { net, ev };
};

test('packets survive being split across frames', () => {
  const big = 'x'.repeat(300); // a 2-byte remaining length
  const bytes = Uint8Array.from([...mqtt.publish('a/b', big), ...mqtt.publish('c', '{"t":1}'), ...mqtt.ping()]);
  const [first, rest] = parse(bytes.subarray(0, 100));
  assert.equal(first.length, 0);
  const [all, left] = parse(Uint8Array.from([...rest, ...bytes.subarray(100)]));
  assert.deepEqual(all.map(([t]) => t), [0x30, 0x30, 0xc0]);
  assert.deepEqual(readPublish(all[0][1]), ['a/b', big]);
  assert.deepEqual(readPublish(all[1][1]), ['c', '{"t":1}']);
  assert.equal(left.length, 0);
  assert.equal(cleanCode(' ab-2k '), 'AB2K'); assert.equal(cleanCode('abc'), ''); assert.equal(cleanCode(null), '');
});

test('friend room: join by code, host starts, both get the same seed and see each other run', async () => {
  const WS = hub(), a = player(WS, 'Asha'), b = player(WS, '<b>Bunty</b>');
  a.net.host();
  const code = a.net.room().code;
  assert.equal(cleanCode(code), code);
  b.net.join(code);
  await until(() => a.net.room().players.length === 1 && b.net.room().players.length === 1, 'see each other');
  assert.deepEqual(a.net.room().players, ['bBuntyb']); // names are cleaned on the way in
  b.net.start(); // only the host can start
  a.net.start();
  await until(() => a.ev.seeds.length && b.ev.seeds.length, 'go');
  assert.equal(a.ev.seeds[0], b.ev.seeds[0]);
  a.net.state({ d: 120.5, x: 2, y: 0, m: 1, over: false });
  b.net.state({ d: 1e99, x: 99, y: -5, m: 'x', over: 'yes' }); // junk from a peer is clamped, never trusted
  await until(() => b.net.rivals()[0]?.d === 120.5, 'state relayed');
  await until(() => a.net.rivals()[0]?.d === 1e6, 'junk clamped');
  assert.deepEqual({ ...a.net.rivals()[0], id: 0, seen: 0 }, { id: 0, seen: 0, n: 1, d: 1e6, x: 3, y: 0, m: 0, over: false, name: 'bBuntyb' });
  a.net.state({ d: 300, x: 0, y: 0, m: 0, over: true });
  await until(() => b.net.rivals()[0].over && b.net.rivals()[0].d === 300, 'caught is final');
  // rematch: the host goes back to the room and starts again; a guest still on the result screen is pulled in
  b.net.state({ d: 500, x: 0, y: 0, m: 0, over: true });
  a.net.lobby();
  a.net.start();
  await until(() => b.ev.seeds.length === 2, 'rematch reaches the guest');
  assert.equal(b.net.rivals()[0].d, 0);
  b.net.leave();
  await until(() => a.net.rivals()[0].over, 'a leaver counts as caught');
  a.net.leave();
});

test('quick match pairs two seekers; alone, it gives up; a silent rival times out', async () => {
  const WS = hub(), a = player(WS, 'A'), b = player(WS, 'B');
  a.net.quick(); b.net.quick();
  await until(() => a.ev.seeds.length && b.ev.seeds.length, 'matched and started');
  assert.equal(a.ev.seeds[0], b.ev.seeds[0]);
  assert.equal(a.net.room().code, b.net.room().code);
  assert.deepEqual(a.net.room().players, ['Khiladi']); // a stranger's typed name is never shown
  assert.equal(a.net.rivals()[0].over, false);
  WS.last.send = () => {}; // b's phone drops off the network without saying bye
  await until(() => a.net.rivals()[0].over, 'silent rival counted as caught');
  a.net.leave();
  const c = player(hub(), 'C');
  c.net.quick();
  await until(() => c.ev.noMatch === 1, 'gave up');
  c.net.leave();
});

test('no broker reachable: reports down instead of hanging', async () => {
  class Dead { constructor() { setTimeout(() => this.onclose?.(), 0); } send() {} close() {} }
  const d = player(Dead, 'D');
  d.net.host();
  await until(() => d.ev.down === 1, 'down');
});
