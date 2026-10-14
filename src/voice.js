// The chaser shouts out loud, using the phone's own Hindi text-to-speech. Silent where there is no Hindi voice
// (an English voice reading Hindi sounds wrong), and never throws.
// Papa: a slow, deep, angry desi-dad bellow, in a male Hindi voice where the phone has one.
const PITCH = { papa: 0.4, mummy: 1.25, dadi: 1.55 }, RATE = { papa: 0.92, mummy: 1.15, dadi: 0.9 };
const MALE = /(^|[^e])male|madhur|hemant|prabhat|ravi/i;

export function createVoice(synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  let voice = null, male = null, on = true;
  const pick = () => {
    try {
      const hi = synth.getVoices().filter((v) => /^hi/i.test(v.lang));
      voice = hi[0] || null;
      male = hi.find((v) => MALE.test(v.name || '')) || voice;
    } catch { voice = male = null; }
  };
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
        const u = new Utterance(text), v = who === 'papa' ? male : voice;
        Object.assign(u, { voice: v, lang: v.lang, pitch: PITCH[who] ?? 1, rate: RATE[who] ?? 1, volume: 1 });
        synth.speak(u);
        return true;
      } catch { return false; }
    },
  };
}
