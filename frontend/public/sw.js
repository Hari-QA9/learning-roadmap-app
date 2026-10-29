/* LearnMap service worker — makes the app installable, loads instantly on repeat visits and
   opens without internet. It caches the app's own files only (code, styles, icons) — every
   page's code up front, so any page opens offline. It never caches /api responses: the data
   pages show offline is kept by the app itself (IndexedDB) and removed when you log out. */
const VERSION = 'learnmap-v3';
const SHELL = ['/', '/index.html', '/offline.html', '/manifest.json', '/logo192.png', '/logo512.png', '/favicon.ico'];

// All built code/style files listed by the production build (so pages you haven't opened yet work offline too).
async function buildFiles() {
  try {
    const res = await fetch('/asset-manifest.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const m = await res.json();
    return Object.values(m.files || {}).filter((f) => typeof f === 'string' && /^\/static\/.+\.(js|css)$/.test(f));
  } catch (e) { return []; }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    const files = await buildFiles();
    // One missing file must not stop the app from installing.
    await Promise.all(files.map((f) => c.add(f).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API server, fonts, Google sign-in… go straight to the network
  if (url.pathname.startsWith('/api')) return;

  // Pages: network first so updates show immediately; fall back to the cached app, then the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/index.html', copy)); return res; })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  // Built files have content hashes in their names, so cache-first is safe.
  if (url.pathname.startsWith('/static/') || SHELL.includes(url.pathname) || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});

// Push notifications from the server (reminders, nudges, group updates…), even when the app is closed.
self.addEventListener('push', (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch (e) { msg = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(msg.title || 'LearnMap', {
    body: msg.body || 'You have a new update.',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: msg.tag || undefined,
    renotify: !!msg.tag,
    data: { url: msg.url || '/notifications' },
  }));
});

// Clicking a notification shown by the app opens the right page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const existing = list.find((c) => 'focus' in c);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  }));
});
