// @ts-check
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// const serviceWorker = self as ServiceWorkerGlobalScope & typeof globalThis;

async function cacheFiles() {
  const cache = await caches.open('robosweep-v2');
  await cache.addAll([
    '/',
    '/style.css'
  ]);
}

async function deleteOldCaches() {
  const cacheAllowList = ['robosweep-v2'];
  let keys = await caches.keys();

  let promises = keys.map((key) => {
    if (!cacheAllowList.includes(key)) {
      return caches.delete(key);
    }
  });

  return Promise.all(promises);
}

self.addEventListener('install', (event) => {
  /**@type {ExtendableEvent}*/
  (event).waitUntil(cacheFiles());
});

self.addEventListener('activate', (event) => {
  /**@type {ExtendableEvent}*/
  (event).waitUntil(deleteOldCaches());
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
