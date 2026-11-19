/* دەفتەری پلان — service worker
   Network first (always the newest version when online), cache fallback (works offline).
   Change CACHE name when you want to force-clear old files. */
const CACHE = 'dafteri-plan-v3';
const SHELL = ['./', 'index.html', 'manifest.json', 'plan.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))   // a missing file must not break the install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // Telegram uploads (POST) are never touched
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // api.telegram.org etc. go straight to the network
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit =>
          hit || (req.mode === 'navigate'
            ? caches.match('index.html').then(h => h || caches.match('./'))
            : undefined))
      )
  );
});
