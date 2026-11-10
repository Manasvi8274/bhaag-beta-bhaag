// "Share your run": a score card image and a challenge link, sent through WhatsApp or the phone's share sheet.
export const GAME_URL = 'https://manasvi8274.github.io/bhaag-beta-bhaag/';
const WHO = { papa: 'Papa', mummy: 'Mummy', dadi: 'Dadi' };
const WITH = { papa: 'chappal', mummy: 'belan', dadi: 'lathi' };

// Friend challenge: a link that replays the sender's exact street, with their distance as the line to beat.
export const cleanName = (s) => String(s ?? '').replace(/[^\p{L}\p{M}\p{N} ]/gu, '').trim().slice(0, 12);
export function challengeUrl({ seed, distance, name }) {
  return `${GAME_URL}?c=${(seed >>> 0).toString(36)}-${Math.floor(distance)}-${encodeURIComponent(cleanName(name))}`;
}
// Reads ?c= from the page URL. It comes from a stranger's link: anything malformed means no challenge.
export function parseChallenge(search) {
  const m = /^([0-9a-z]{1,7})-(\d{1,5})-(.*)$/.exec(new URLSearchParams(search).get('c') || '');
  if (!m) return null;
  const seed = parseInt(m[1], 36), distance = +m[2];
  if (seed > 0xffffffff || distance < 1) return null;
  return { seed, distance, name: cleanName(m[3]) || 'Dost' };
}

const LAUNCH = '2026-10-12'; // day 1 of the numbered daily challenge
export const dayNumber = (date) => Math.round((Date.parse(date) - Date.parse(LAUNCH)) / 864e5) + 1;

// The message that goes out with the link. beat = the friend whose line this run crossed; daily = today's date and goal.
export function shareText(info) {
  const { distance, score, area, chaser, beat, daily } = info, url = challengeUrl(info);
  if (beat) return `${beat.name}, I beat your ${beat.distance} m: I ran ${distance} m! 😎 Ab tumhari baari, same gali: ${url} #BhaagBetaBhaag`;
  if (daily) {
    const n = Math.min(5, Math.floor((distance / daily.goal) * 5));
    return `Bhaag Beta Bhaag 📅 #${dayNumber(daily.date)}\n🏃 ${distance} m ${'🟩'.repeat(n)}${'⬜'.repeat(5 - n)}${n === 5 ? ' ✅' : ''}\nAaj ki gali sabke liye same hai. Beat me: ${url}`;
  }
  return `I ran ${distance} m through ${area} before ${WHO[chaser]} caught me with the ${WITH[chaser]}! 🏃💨 Score ${score}. Can you beat me on the same street? No download: ${url} #BhaagBetaBhaag`;
}
export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

// Draws a 1080x1350 card: the game view (cover-cropped) with the title and the run on top.
export function drawCard(ctx, view, { distance, score, area, chaser, hero }) {
  const W = 1080, H = 1350;
  ctx.canvas.width = W; ctx.canvas.height = H;
  const s = Math.max(W / view.width, H / view.height);
  ctx.drawImage(view, (W - view.width * s) / 2, (H - view.height * s) / 2, view.width * s, view.height * s);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,10,30,.75)'); g.addColorStop(0.35, 'rgba(10,10,30,0)');
  g.addColorStop(0.6, 'rgba(10,10,30,0)'); g.addColorStop(1, 'rgba(10,10,30,.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const text = (t, x, y, size, fill = '#fff', align = 'center') => {
    ctx.font = `800 ${size}px "Baloo 2", "Trebuchet MS", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = size / 6; ctx.strokeStyle = '#1b1b1b';
    ctx.strokeText(t, x, y); ctx.fillStyle = fill; ctx.fillText(t, x, y);
  };
  text(`Bhaag ${hero === 'beti' ? 'Beti' : 'Beta'} Bhaag!`, W / 2, 110, 110, '#ffd60a');
  text(`${distance} m`, W / 2, H - 330, 170, '#ffd60a');
  text(`through ${area}`, W / 2, H - 215, 62);
  text(`${WHO[chaser]} caught me with the ${WITH[chaser]}! · Score ${score}`, W / 2, H - 135, 44);
  text('Can you beat me? Tap the link 👇', W / 2, H - 60, 38, '#9bd4ff');
}

// Image share where the browser can (Android Chrome / PWA), else text share, else copy to clipboard.
// The link is inside the text: share targets often drop a separate url when a file is attached.
// Resolves to 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareRun(blob, info, nav = globalThis.navigator) {
  const text = shareText(info);
  try {
    const file = blob && new File([blob], 'bhaag-beta-bhaag.png', { type: 'image/png' });
    if (file && nav?.canShare?.({ files: [file] })) { await nav.share({ files: [file], text }); return 'shared'; }
    if (nav?.share) { await nav.share({ text }); return 'shared'; }
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
