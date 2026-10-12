Write `src/audio.js`: procedural sound effects and a looping dhol-style beat using the Web Audio API.
No imports, no audio files. Must NEVER throw, even when Web Audio does not exist (e.g. in Node).

Export exactly one function: `createAudio(Ctx = globalThis.AudioContext || globalThis.webkitAudioContext)`.
Returns `{ unlock(), play(name), setMuted(m), isMuted(), startMusic(), stopMusic() }`.

- The AudioContext is created lazily inside `unlock()` (browsers only allow audio after a user gesture):
  if Ctx is undefined do nothing; otherwise create it once (`new Ctx()`), create one master GainNode
  (gain 0.6) connected to `ctx.destination`, and call `ctx.resume()` if it exists. Wrap in try/catch.
- `play(name)`: if muted or no context, return. Unknown names are ignored. Each sound builds fresh
  oscillator/noise nodes -> a GainNode envelope -> master, starts at ctx.currentTime and stops itself.
  Sounds (t = ctx.currentTime):
  - 'jump': sine, frequency 300 -> 750 Hz (exponentialRampToValueAtTime) over 0.15 s; gain 0.4 -> 0.001 over 0.18 s.
  - 'slide': white noise buffer 0.3 s through a lowpass BiquadFilter (frequency 1200 -> 300 Hz); gain 0.35 -> 0.001.
  - 'coin': two square-wave blips: 988 Hz at t (0.07 s) then 1319 Hz at t + 0.07 (0.12 s); gain 0.18 each.
  - 'stumble': sine 140 -> 50 Hz over 0.25 s gain 0.7, plus a short noise burst 0.1 s gain 0.3.
  - 'smack': noise 0.08 s through a highpass filter at 1500 Hz, gain 0.9 -> 0.001 (chappal slap).
  - 'powerup': triangle arpeggio 523, 659, 784, 1047 Hz, each 0.08 s apart, gain 0.25.
  Helper functions (inside the module): `tone(type, f0, f1, dur, vol, when)` and `noise(dur, vol, filterType, f0, f1, when)`.
  Noise buffer: `ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)`, fill getChannelData(0) with Math.random()*2-1.
  Gain envelope: `g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.001, when + dur);`
- Music: `startMusic()` (only if context exists and not already playing) schedules a 120 BPM dhol pattern with a
  look-ahead scheduler: `setInterval` every 50 ms schedules all 8th-notes that fall within the next 0.15 s.
  Pattern of 8 eighth-notes per bar: step 0 and 3 and 6 = low dhol (sine 95 -> 55 Hz, 0.18 s, vol 0.55);
  steps 2, 4, 5, 7 = high tilli (triangle 420 -> 300 Hz, 0.06 s, vol 0.2); step 1 = noise tick (0.03 s highpass 5000, vol 0.08).
  `stopMusic()` clears the interval. When muted, the scheduler keeps time but plays nothing.
- `setMuted(m)`: store boolean; also set master gain to 0 when muted and 0.6 when not (if master exists).
