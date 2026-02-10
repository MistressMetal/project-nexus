const VERSION = "v2.0"
const CACHE_NAME = `nexus-${VERSION}`;

const RUNTIME_CACHE = `seiu-runtime-${VERSION}`;

const APP_STATIC_RESOURCES = [
    "/",
    "/index.html",
    "main_portal.html",
    "admin_portal.html",
    "/index_signup.html",
    "/reset.html",
    "/status_pending.html",
    "/style.css",
    "/app.js",
    "/manifest.json",
    "/icons/large.png",
    "/icons/small.png",
    "/icons/tiny.png"
];


const NETWORK_ONLY = [
    '/api/',
    'supabase.co',
    'auth'
]
// instll cache files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Caching app shell')
            return cache.addAll(APP_STATIC_RESOURCES);
        })
        .then(() => self.skipWaiting())
        .catch(error => {
            console.error('Cache failed:', error);
        })
    );
});

//clean up caches
self.addEventListener("activate", (event) => {
    console.log('[ServiceWorker] Activate event');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('seiu-') && name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => {
                        console.log('[ServiceWorker] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests that aren't to our CDN
    if (url.origin !== location.origin && !url.href.includes('cdn.jsdelivr.net')) {
        return;
    }

    // Network only for API calls and auth
    if (NETWORK_ONLY.some(pattern => request.url.includes(pattern))) {
        event.respondWith(fetch(request));
        return;
    }

    // Cache first strategy for static assets
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // Return cached version and update cache in background
                        fetch(request).then(response => {
                            if (response && response.status === 200) {
                                caches.open(RUNTIME_CACHE).then(cache => {
                                    cache.put(request, response);
                                });
                            }
                        }).catch(() => {
                            // Network failed, but we have cache, so no problem
                        });
                        return cachedResponse;
                    }

                    // Not in cache, fetch from network
                    return fetch(request).then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(request, responseToCache);
                        });

                        return response;
                    }).catch(error => {
                        console.error('[ServiceWorker] Fetch failed:', error);
                        
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        throw error;
                    });
                })
        );
    }
});


// NOTIFICATIONS


self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icons/small.png',
        badge: '/icons/tiny.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('SEIU Portal', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});