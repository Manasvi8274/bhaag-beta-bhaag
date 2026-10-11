Write `src/ui.js`: the HTML overlay UI (menus + HUD) for a mobile runner game. No imports. Plain DOM.

Export exactly one function: `createUI(root, { onStart, onRestart })`. `root` is an empty div covering
the screen (position fixed, inset 0, pointer-events none). Return
`{ showMenu(best), showHUD(), setScore(score, coins), showGameOver(score, coins, best, isNewBest), flash(text) }`.

On creation, inject ONE <style> element into document.head (only once, give it id 'bbb-ui-style') and build these
elements inside root (use document.createElement, never innerHTML with user data):
1. `.menu` screen: big title "Bhaag Beta Bhaag!" (two lines: "Bhaag Beta" / "Bhaag!"), subtitle
   "Papa is coming with the chappal!", a text "Best: N", and a big round button "▶ Play". Clicking Play calls onStart().
2. `.hud`: top-left score number, top-right coin counter "🪙 N". Hidden until showHUD().
3. `.over` screen: title "Pakde Gaye!" ("Caught!"), lines "Score N", "Coins N", "Best N", a "NEW BEST!" badge shown
   only when isNewBest, and a button "↻ Bhaag Again". Clicking it calls onRestart().
4. `.flash`: a centred text that pops in (scale 0.6 -> 1) and fades out over 900 ms each time flash(text) is called
   (restart the CSS animation by removing the class, forcing reflow with `void el.offsetWidth`, adding it again).
Only one of menu / hud / over is visible at a time: showMenu shows menu, showHUD shows hud, showGameOver shows over
(keep hud hidden). setScore updates the HUD numbers (score with no decimals).

Style: fun Indian-street feel. Font: 'Baloo 2', 'Trebuchet MS', sans-serif (bold). Title: 54px, yellow (#ffd60a)
with thick dark outline (text-shadow in 4 directions #1b1b1b) and slight rotation -3deg. Buttons: 22px, padding
14px 34px, border-radius 999px, background #ff006e, white text, 4px solid #1b1b1b border, box-shadow 0 6px 0 #1b1b1b,
active state moves down 4px. Screens: centred column, background rgba(10,10,30,0.45). Buttons and screens set
pointer-events auto on the menu and over screens only; the HUD and flash keep pointer-events none so swipes reach the game. HUD text: 28px white with dark outline.
Respect phone notches: padding uses env(safe-area-inset-top) etc.
