const staticCacheName = 'restaurant-static-cache-v1';
const contentCacheName = 'restaurant-cache-v1';

allCacheNames = [
  staticCacheName,
  contentCacheName
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      cache.addAll([
        '/',
        'js/main.js',
        'js/dbhelper.js',
        'js/restaurant_info.js',
        'js/combined.min.js',
        'js/restaurant-combined.min.js',
        'css/styles.css',
        'css/responsive.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
        'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('restaurant-') && !allCacheNames.includes(cacheName);
        }).map((oldCacheName) => {
          return caches.delete(oldCacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((resp)=>{
            if (resp) {
                return resp;
            }
            return fetch(event.request).then((webResponse)=>{
                return caches.open(contentCacheName).then((cache)=>{
                    cache.put(event.request.url, webResponse.clone());
                    return webResponse;
                })
            })
        })
    );
});