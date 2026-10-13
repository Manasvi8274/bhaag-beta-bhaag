// Offline support: precache the app shell, then stale-while-revalidate everything (incl. Google Fonts).
// Bump VERSION on every release so players get the new files.
const VERSION = 'bbb-v9';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './privacy.html', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/three.module.js',
  ...['ads', 'audio', 'chaser', 'collision', 'config', 'daynight', 'festival', 'fx', 'game', 'input', 'merge', 'player', 'powerups', 'progress', 'props', 'share', 'sky', 'voice', 'zones',
    'spawner', 'stickman', 'ui', 'world'].map((m) => `./src/${m}.js`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url); // never cache ads; only our files and the font
  if (url.origin !== location.origin && !/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
