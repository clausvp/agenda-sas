const CACHE = 'agenda-sas-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap'
];

// Dominios que NUNCA deben cachearse (datos dinámicos: Sheets, Drive, Google Auth)
const NO_CACHE_HOSTS = [
  'script.google.com',
  'script.googleusercontent.com',
  'googleapis.com',
  'accounts.google.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isDynamic = NO_CACHE_HOSTS.some(h => url.hostname.includes(h));

  // Datos dinámicos y flujo de autenticación de Google: NUNCA interceptar,
  // dejar que el navegador los maneje directamente (evita romper el OAuth popup)
  if (isDynamic) {
    return;
  }

  // Assets de la app: cache-first como antes
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
