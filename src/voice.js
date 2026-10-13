// The chaser shouts out loud, using the phone's own Hindi text-to-speech. Silent where there is no Hindi voice
// (an English voice reading Hindi sounds wrong), and never throws.
const PITCH = { papa: 0.65, mummy: 1.25, dadi: 1.55 }, RATE = { papa: 1.05, mummy: 1.15, dadi: 0.9 };

export function createVoice(synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  let voice = null, on = true;
  const pick = () => { try { voice = synth.getVoices().find((v) => /^hi/i.test(v.lang)) || null; } catch { voice = null; } };
  if (synth && Utterance) {
    pick();
    try { synth.addEventListener('voiceschanged', pick); } catch { /* old WebView */ }
  }
  return {
    available: () => !!voice,
    setOn(v) { on = v; if (!v) try { synth.cancel(); } catch { /* nothing to stop */ } },
    // Returns whether it spoke.
    say(text, who) {
      if (!on || !voice) return false;
      try {
        synth.cancel(); // the newest shout wins
        const u = new Utterance(text);
        Object.assign(u, { voice, lang: voice.lang, pitch: PITCH[who] ?? 1, rate: RATE[who] ?? 1, volume: 1 });
        synth.speak(u);
        return true;
      } catch { return false; }
    },
  };
}
