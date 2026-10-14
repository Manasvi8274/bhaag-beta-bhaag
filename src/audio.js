// Procedural SFX + dhol loop. Never throws, even without Web Audio.
export function createAudio(Ctx = globalThis.AudioContext || globalThis.webkitAudioContext) {
  let ctx = null, master = null, muted = !Ctx, timer = null, nextNote = 0, step = 0, stepDur = 0.25, night = 0, rainGain = null;

  function envelope(vol, when, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    g.connect(master);
    return g;
  }

  function tone(type, f0, f1, dur, vol, when = ctx.currentTime) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + dur);
    o.connect(envelope(vol, when, dur));
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  function noise(dur, vol, filterType, f0, f1, when = ctx.currentTime) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, when);
    f.frequency.exponentialRampToValueAtTime(f1, when + dur);
    src.connect(f);
    f.connect(envelope(vol, when, dur));
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  const SOUNDS = {
    jump: () => tone('sine', 300, 750, 0.18, 0.4),
    slide: () => noise(0.3, 0.35, 'lowpass', 1200, 300),
    coin: (p = 1) => { const t = ctx.currentTime; tone('square', 988 * p, 988 * p, 0.07, 0.18, t); tone('square', 1319 * p, 1319 * p, 0.12, 0.18, t + 0.07); },
    stumble: () => { tone('sine', 140, 50, 0.25, 0.7); noise(0.1, 0.3, 'lowpass', 2000, 400); },
    whoosh: () => noise(0.35, 0.5, 'bandpass', 600, 2400),
    speedup: () => { const t = ctx.currentTime; tone('sawtooth', 220, 880, 0.45, 0.12, t); noise(0.4, 0.25, 'bandpass', 500, 3000, t); },
    tick: () => tone('square', 1500, 1500, 0.05, 0.12),
    smack: () => { noise(0.07, 0.9, 'highpass', 1800, 1500); tone('sine', 170, 60, 0.12, 0.6); },
    powerup: () => { const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.12, 0.25, t + i * 0.08)); },
    horn: () => { const t = ctx.currentTime; for (const d of [0, 0.18]) tone('square', 440, 430, 0.13, 0.12, t + d); }, // scooter: pom pom
    train: () => { const t = ctx.currentTime; tone('sawtooth', 311, 305, 1.3, 0.1, t); tone('sawtooth', 392, 385, 1.3, 0.08, t); },
    bell: () => { const t = ctx.currentTime; tone('sine', 1318, 1310, 1.6, 0.22, t); tone('sine', 2637, 2620, 0.7, 0.08, t); tone('triangle', 659, 655, 1.2, 0.12, t); },
    firework: () => { const t = ctx.currentTime; noise(0.3, 0.12, 'lowpass', 900, 150, t); for (let i = 1; i < 5; i++) noise(0.04, 0.05, 'highpass', 3000, 3000, t + 0.25 + i * 0.07); },
    thunder: () => { const t = ctx.currentTime; noise(1.8, 0.5, 'lowpass', 300, 60, t + 0.3); noise(0.25, 0.25, 'lowpass', 1200, 200, t + 0.3); },
    tring: () => { const t = ctx.currentTime; for (const d of [0, 0.16]) { tone('sine', 2350, 2300, 0.12, 0.2, t + d); tone('sine', 3100, 3050, 0.1, 0.08, t + d); } },
    caw: () => { const t = ctx.currentTime; for (const d of [0, 0.22]) { tone('sawtooth', 620, 480, 0.16, 0.05, t + d); noise(0.14, 0.05, 'bandpass', 1400, 1000, t + d); } },
    cricket: () => { const t = ctx.currentTime; for (let i = 0; i < 3; i++) tone('sine', 4300, 4200, 0.03, 0.04, t + i * 0.06); },
  };

  // A tune per area over the dhol, 32 eighth notes (Hz, 0 = rest); it sits out every other loop so it never nags.
  // Market Gali: tumbi pluck. Railway Colony: a chugging train groove with whistle notes. Mandir Marg: temple bells
  // on the beat and a soft bhajan line.
  const TUNES = [
    { wave: 'square', vol: 0.045, dur: 0.09, notes: [880, 0, 880, 1047, 0, 880, 1319, 0, 1175, 0, 1047, 880, 0, 784, 880, 0,
      880, 0, 1047, 1175, 0, 1319, 1175, 0, 1047, 0, 880, 784, 0, 659, 784, 0] },
    { wave: 'triangle', vol: 0.06, dur: 0.16, notes: [0, 0, 0, 0, 1568, 0, 1319, 0, 0, 0, 0, 0, 1568, 1568, 1319, 0,
      0, 0, 0, 0, 1397, 0, 1175, 0, 0, 0, 0, 0, 1568, 0, 1760, 0] },
    { wave: 'sine', vol: 0.07, dur: 0.22, notes: [523, 0, 587, 0, 659, 0, 587, 523, 0, 0, 440, 0, 523, 0, 0, 0,
      659, 0, 784, 0, 659, 587, 523, 0, 587, 0, 523, 0, 440, 0, 0, 0] },
  ];
  let zone = 0;
  function beat(s, when) {
    const d = s % 8;
    if (d === 0 || d === 3 || d === 6) tone('sine', 95, 55, 0.18, 0.55, when);
    else if (d === 1) noise(0.03, 0.08, 'highpass', 5000, 5000, when);
    else tone('triangle', 420, 300, 0.06, 0.2, when);
    if (zone === 1) noise(0.05, d % 2 ? 0.03 : 0.06, 'highpass', 7000, 7000, when); // chug-a chug-a
    if (zone === 2 && d === 0) tone('sine', 1318, 1310, 0.6, 0.06, when); // mandir bell on the one
    const t = TUNES[zone], f = t.notes[s % 32];
    if (f && s < 32) tone(t.wave, f, f * 0.98, t.dur, t.vol, when);
  }

  return {
    unlock() {
      if (ctx || !Ctx) return;
      try {
        ctx = new Ctx();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.6;
        master.connect(ctx.destination);
        if (ctx.resume) ctx.resume();
      } catch { ctx = null; }
    },
    play(name, arg) {
      if (muted || !ctx || !SOUNDS[name]) return;
      try { SOUNDS[name](arg); } catch { /* audio is never worth a crash */ }
    },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.6;
    },
    isMuted: () => muted,
    startMusic() {
      if (!ctx || timer) return;
      nextNote = ctx.currentTime + 0.05;
      timer = setInterval(() => {
        try {
          // 120 BPM -> 8th note = 0.25 s (faster at speed); schedule everything within the next 0.15 s
          while (nextNote < ctx.currentTime + 0.15) {
            if (!muted) beat(step, nextNote);
            step = (step + 1) % 64;
            nextNote += stepDur;
          }
          if (!muted && night > 0.5 && Math.random() < 0.03) SOUNDS.cricket(); // jhingur at night
        } catch { /* keep looping */ }
      }, 50);
    },
    stopMusic() { clearInterval(timer); timer = null; },
    // f: 0 = starting speed .. 1 = top speed; the dhol speeds up from 120 to ~150 BPM.
    setTempo(f) { stepDur = 0.25 - 0.05 * Math.max(0, Math.min(1, f)); },
    setNight(n) { night = n; },
    setZone(z) { zone = z; },
    // Rain hiss: one looping noise source, created the first time it rains; level 0..1.
    setRain(level) {
      if (!ctx || (!rainGain && level <= 0)) return;
      try {
        if (!rainGain) {
          const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource(), f = ctx.createBiquadFilter();
          src.buffer = buf; src.loop = true;
          f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.5;
          rainGain = ctx.createGain(); rainGain.gain.value = 0;
          src.connect(f); f.connect(rainGain); rainGain.connect(master);
          src.start();
        }
        rainGain.gain.value = level * 0.18;
      } catch { /* never worth a crash */ }
    },
  };
}
