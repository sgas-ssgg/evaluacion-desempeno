// Service Worker — Evaluación SSOMA
const CACHE_NAME = 'eval-ssoma-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/pintura.html',
  '/andamios.html',
  '/configuracion.html',
  '/nueva-especialidad.html',
  '/css/style.css',
  '/js/app.js',
  '/js/pintura.js',
  '/js/andamios.js',
  '/js/config.js',
  '/js/especialidades.js',
  '/assets/logo-transp.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
