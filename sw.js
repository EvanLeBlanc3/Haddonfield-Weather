/* Haddonfield Weather service worker — offline app shell */
const CACHE = 'haddonfield-v1';
const SHELL = ['./', './index.html', './style.css', './manifest.webmanifest', './js/audio.js', './js/sprites.js', './js/text.js', './js/scene.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // live weather APIs: always network (the app keeps its own saved copy for offline)
  if (/open-meteo|weather\.gov|bigdatacloud/.test(u.hostname)) return;
  // fonts: cache-first
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => r))));
    return;
  }
  // app shell: network-first so GitHub updates show up, cache fallback offline
  e.respondWith(fetch(e.request).then(res => { if (res.ok && u.origin === location.origin) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
