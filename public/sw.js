const CACHE = 'skillgrade-shell-v1';
const SHELL = [
  '/', '/index.html', '/manifest.webmanifest',
  '/audio/ta/language-sample.mp3', '/audio/ta/confirm.mp3',
  '/audio/ta/acknowledge.mp3',
  '/audio/ta/consent.mp3', '/audio/ta/name.mp3', '/audio/ta/age.mp3',
  '/audio/ta/gender.mp3', '/audio/ta/phone.mp3', '/audio/ta/district.mp3',
  '/audio/ta/block.mp3', '/audio/ta/village.mp3', '/audio/ta/education.mp3',
  '/audio/ta/skill.mp3', '/audio/ta/goal.mp3', '/audio/ta/submitted.mp3',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match('/index.html'))),
  );
});
