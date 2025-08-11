// BiometricHub PWA Service Worker
// Advanced caching strategies and offline capabilities

const CACHE_NAME = 'biometric-hub-v1.0.0';
const STATIC_CACHE = 'biometric-hub-static-v1';
const DYNAMIC_CACHE = 'biometric-hub-dynamic-v1';
const API_CACHE = 'biometric-hub-api-v1';

// Static resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js',
  '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/dashboard-stats',
  '/api/user-profile',
  '/api/batches',
  '/api/students'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('[SW] Initializing API cache');
        return cache.add(new Request('/offline.html', { cache: 'reload' }));
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return !cacheName.startsWith(CACHE_NAME) && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE && 
                   cacheName !== API_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network First with cache fallback
      event.respondWith(networkFirstStrategy(request, API_CACHE));
    } else if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
      // Static assets - Cache First
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else {
      // Dynamic content - Stale While Revalidate
      event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
    }
  }
});

// Caching Strategies

// Cache First - Good for static assets
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First - Good for API calls
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[SW] Network first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('[SW] API response cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Return offline response for API calls
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This feature requires an internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale While Revalidate - Good for frequently updated content
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('[SW] Updated cache:', request.url);
    }
    return networkResponse;
  }).catch(() => {
    console.log('[SW] Network failed for:', request.url);
    return cachedResponse;
  });
  
  if (cachedResponse) {
    console.log('[SW] Serving stale content:', request.url);
    return cachedResponse;
  }
  
  return fetchPromise;
}

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-biometric-data') {
    event.waitUntil(syncBiometricData());
  } else if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncBiometricData() {
  console.log('[SW] Syncing biometric data...');
  try {
    // Sync pending biometric captures
    const pendingData = await getStoredData('pending-biometric');
    if (pendingData.length > 0) {
      await uploadPendingData(pendingData);
      await clearStoredData('pending-biometric');
    }
  } catch (error) {
    console.error('[SW] Biometric sync failed:', error);
  }
}

async function syncOfflineActions() {
  console.log('[SW] Syncing offline actions...');
  try {
    // Sync pending offline actions
    const pendingActions = await getStoredData('pending-actions');
    if (pendingActions.length > 0) {
      await processPendingActions(pendingActions);
      await clearStoredData('pending-actions');
    }
  } catch (error) {
    console.error('[SW] Offline actions sync failed:', error);
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'BiometricHub notification',
    icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
    badge: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'BiometricHub';
  }
  
  event.waitUntil(
    self.registration.showNotification('BiometricHub', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      cacheUrls(event.data.payload)
    );
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      clearAllCaches()
    );
  }
});

// Helper functions
async function getStoredData(key) {
  // Implementation would depend on your storage strategy
  return [];
}

async function clearStoredData(key) {
  // Implementation would depend on your storage strategy
  console.log('[SW] Cleared stored data:', key);
}

async function uploadPendingData(data) {
  // Implementation for uploading pending data
  console.log('[SW] Uploading pending data:', data.length, 'items');
}

async function processPendingActions(actions) {
  // Implementation for processing pending actions
  console.log('[SW] Processing pending actions:', actions.length, 'items');
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  return cache.addAll(urls);
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');