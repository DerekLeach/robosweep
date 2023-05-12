const CACHE_NAME = `robosweep-v2`;

const serviceWorker = self as ServiceWorkerGlobalScope & typeof globalThis;

async function cacheFiles() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([
    '/',
    '/style.css'
  ]);
}

async function deleteOldCaches() {
  const cacheAllowList = [CACHE_NAME];
  let keys = await caches.keys();

  let promises = keys.map((key) => {
    if (!cacheAllowList.includes(key)) {
      return caches.delete(key);
    }
  });

  return Promise.all(promises);
}

serviceWorker.addEventListener('install', (event) => {
  event.waitUntil(cacheFiles());
});

serviceWorker.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCaches());
})

// self.addEventListener('fetch', event => {
//   event.respondWith((async () => {
//     const cache = await caches.open(CACHE_NAME);

//     // Get the resource from the cache.
//     const cachedResponse = await cache.match(event.request);
//     if (cachedResponse) {
//       return cachedResponse;
//     } else {
//         try {
//           // If the resource was not in the cache, try the network.
//           const fetchResponse = await fetch(event.request);

//           // Save the resource in the cache and return it.
//           cache.put(event.request, fetchResponse.clone());
//           return fetchResponse;
//         } catch (e) {
//           // The network failed.
//         }
//     }
//   })());
// });
