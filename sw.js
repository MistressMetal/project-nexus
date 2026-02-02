const VERSION = "v1.1"
const CACHE_NAME = `dates-${VERSION}`;
const APP_STATIC_RESOURCES = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json",
    "/icons/large.png",
    "/icons/small.png",
    "/icons/tiny.png"
];

// instll cache files
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })(),
    );
});

//clean up caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                    return undefined;
                }),
            );
            await clients.claim();
        })(),
    );
});

// return cache or use network
// todo do I want to flip this?

//self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
//    if (!event.request.url.startsWith(self.location.origin)) {
//        return;
//    }

    // Don't cache API calls
//    if (event.request.url.includes('/api/')) {
//        event.respondWith(fetch(event.request));
//        return;
//    }

//    event.respondWith(
//        caches.match(event.request)
//            .then((response) => {
//                // Return cached version or fetch from network
//                return response || fetch(event.request).then((fetchResponse) => {
//                    // Cache new requests
//                    return caches.open(CACHE_NAME).then((cache) => {
//                        cache.put(event.request, fetchResponse.clone());
//                        return fetchResponse;
//                    });
//                });
//            }));

//});
