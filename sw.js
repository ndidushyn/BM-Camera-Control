const CACHE_NAME = 'bm-camera-control-v1.0.2';
const urlsToCache = [
  './',
  './index.html',
  './mobile.html',
  './start.html',
  './css/base.css',
  './css/header.css',
  './css/navigation.css',
  './css/buttons.css',
  './css/forms.css',
  './css/panels.css',
  './css/camera-controls.css',
  './css/color-controls.css',
  './css/presets.css',
  './css/midi.css',
  './css/midi-custom.css',
  './css/toast.css',
  './css/responsive.css',
  './css/mobile.css',
  './css/mobile-navigation.css',
  './css/mobile-controls.css',
  './js/app.js',
  './js/camera-controller.js',
  './js/midi-controller.js',
  './js/platform-detector.js',
  './js/pwa.js',
  './js/mobile-interface.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Error caching files:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip WebSocket and EventSource requests
  if (event.request.headers.get('upgrade') === 'websocket' || 
      event.request.headers.get('accept') === 'text/event-stream') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response for cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // Return appropriate fallback for navigation requests
            if (event.request.destination === 'document') {
              // For PWA navigation requests, try to serve index.html
              return caches.match('./index.html').then((indexResponse) => {
                if (indexResponse) {
                  return indexResponse;
                }
                // If index.html not in cache, try root
                return caches.match('./');
              });
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline camera commands
self.addEventListener('sync', (event) => {
  if (event.tag === 'camera-commands') {
    console.log('[SW] Background sync: camera-commands');
    event.waitUntil(
      // Process queued camera commands when online
      processQueuedCommands()
    );
  }
});

// Push notifications (for future camera status updates)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Camera status update',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Camera Control',
        icon: './icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('BM Camera Control', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Handle queued commands (placeholder for offline functionality)
async function processQueuedCommands() {
  try {
    // Get queued commands from IndexedDB or localStorage
    // Process them when connection is restored
    console.log('[SW] Processing queued camera commands');
  } catch (error) {
    console.error('[SW] Error processing queued commands:', error);
  }
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
