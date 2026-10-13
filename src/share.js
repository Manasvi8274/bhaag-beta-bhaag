// "Share your run": a score card image made from the game view, sent through the phone's share sheet.
export const GAME_URL = 'https://manasvi8274.github.io/bhaag-beta-bhaag/';
const WHO = { papa: 'Papa', mummy: 'Mummy', dadi: 'Dadi' };
const WITH = { papa: 'chappal', mummy: 'belan', dadi: 'lathi' };

export function shareText({ distance, score, area, chaser }) {
  return `I ran ${distance} m through ${area} before ${WHO[chaser]} caught me with the ${WITH[chaser]}! 🏃💨 Score ${score}. Can you beat it? #BhaagBetaBhaag`;
}

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
  text(GAME_URL.replace('https://', ''), W / 2, H - 60, 34, '#9bd4ff');
}

// Image share where the browser can (Android Chrome / PWA), else text share, else copy to clipboard.
// Resolves to 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareRun(blob, info, nav = globalThis.navigator) {
  const text = shareText(info);
  try {
    const file = blob && new File([blob], 'bhaag-beta-bhaag.png', { type: 'image/png' });
    if (file && nav?.canShare?.({ files: [file] })) { await nav.share({ files: [file], text, url: GAME_URL }); return 'shared'; }
    if (nav?.share) { await nav.share({ text, url: GAME_URL }); return 'shared'; }
    await nav.clipboard.writeText(`${text} ${GAME_URL}`);
    return 'copied';
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
