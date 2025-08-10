// Service Worker for Student TrackMaster
// Offline-first progressive web app

const CACHE_NAME = 'student-trackmaster-v1';
const STATIC_CACHE_NAME = 'static-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-v1';

// Critical resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/students/add',
  '/manifest.json',
  '/favicon.ico',
  '/mfs100-9.0.2.6.js',
  'https://code.jquery.com/jquery-3.6.0.min.js'
];

// API routes to cache with strategies
const API_CACHE_PATTERNS = [
  /\/api\/students/,
  /\/api\/batches/,
  /\/api\/dashboard/
];

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME
            )
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement offline-first strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Different strategies based on request type
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    // Cache first for static assets
    event.respondWith(cacheFirst(request));
  } else if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    // Network first with cache fallback for API calls
    event.respondWith(networkFirstWithCache(request));
  } else if (url.pathname.startsWith('/')) {
    // Stale while revalidate for navigation
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache first strategy - for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('📱 Cache first failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network first with cache fallback - for API calls
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Network failed, checking cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    // Return offline fallback
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No cached data available',
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stale while revalidate - for navigation and other requests
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log('🔄 Syncing offline data...');
    
    // Get pending operations from IndexedDB
    const pendingOperations = await getPendingOperations();
    
    for (const operation of pendingOperations) {
      try {
        await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        });
        
        // Remove from pending operations
        await removePendingOperation(operation.id);
        console.log('✅ Synced operation:', operation.id);
      } catch (error) {
        console.log('❌ Failed to sync operation:', operation.id, error);
      }
    }
  } catch (error) {
    console.log('🔄 Sync failed:', error);
  }
}

// Helper functions for IndexedDB operations (simplified)
async function getPendingOperations() {
  // This would connect to IndexedDB and retrieve pending operations
  return [];
}

async function removePendingOperation(id) {
  // This would remove the operation from IndexedDB
  console.log('Removing operation:', id);
}

// Handle push notifications (future feature)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});