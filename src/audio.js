// Procedural SFX + dhol loop. Never throws, even without Web Audio.
export function createAudio(Ctx = globalThis.AudioContext || globalThis.webkitAudioContext) {
  let ctx = null, master = null, muted = !Ctx, timer = null, nextNote = 0, step = 0;

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
    coin: () => { const t = ctx.currentTime; tone('square', 988, 988, 0.07, 0.18, t); tone('square', 1319, 1319, 0.12, 0.18, t + 0.07); },
    stumble: () => { tone('sine', 140, 50, 0.25, 0.7); noise(0.1, 0.3, 'lowpass', 2000, 400); },
    whoosh: () => noise(0.35, 0.5, 'bandpass', 600, 2400),
    smack: () => noise(0.08, 0.9, 'highpass', 1500, 1500),
    powerup: () => { const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.12, 0.25, t + i * 0.08)); },
  };

  function beat(s, when) {
    if (s === 0 || s === 3 || s === 6) tone('sine', 95, 55, 0.18, 0.55, when);
    else if (s === 1) noise(0.03, 0.08, 'highpass', 5000, 5000, when);
    else tone('triangle', 420, 300, 0.06, 0.2, when);
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
    play(name) {
      if (muted || !ctx || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch { /* audio is never worth a crash */ }
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
          // 120 BPM -> 8th note = 0.25 s; schedule everything within the next 0.15 s
          while (nextNote < ctx.currentTime + 0.15) {
            if (!muted) beat(step, nextNote);
            step = (step + 1) % 8;
            nextNote += 0.25;
          }
        } catch { /* keep looping */ }
      }, 50);
    },
    stopMusic() { clearInterval(timer); timer = null; },
  };
}
