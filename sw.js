const CACHE_NAME = 'varietal-presupuestador-v3';
const ASSETS_A_CACHEAR = [
  './index.html',
  './Promos.html',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_A_CACHEAR))
      .catch((err) => console.warn('No se pudieron cachear todos los assets:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Nunca cachear el pedido a Google Sheets: siempre tiene que ir a la red
  // para traer precios y stock actualizados.
  if (url.includes('docs.google.com') || url.includes('googleusercontent.com')) {
    return;
  }

  // Los PDF van siempre directo a la red, sin pasar por el service worker.
  if (url.split('?')[0].toLowerCase().endsWith('.pdf')) {
    return;
  }

  // Solo manejamos pedidos GET (lo demás pasa directo).
  if (event.request.method !== 'GET') return;

  // cache: 'no-cache' obliga al navegador a consultar a GitHub si el archivo
  // cambió (antes podía usar su copia propia hasta 10 minutos, que es lo que
  // hacía que el celular mostrara imágenes/archivos viejos).
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((respuesta) => {
        if (respuesta && respuesta.ok) {
          const clone = respuesta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});
